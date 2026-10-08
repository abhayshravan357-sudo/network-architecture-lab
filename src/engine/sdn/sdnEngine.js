/**
 * SDN Engine — pure, deterministic logic for the SDN transformation stage.
 *
 * The student's existing architecture stays as the DATA PLANE. The SDN
 * stage adds a logical CONTROL PLANE: a central controller that
 * programs every switch. This engine derives that model, generates
 * flow rules from the topology, and simulates controller-driven
 * rerouting when a link fails.
 *
 * No real OpenFlow processing — this is logical simulation that
 * teaches the control-plane / data-plane separation.
 */

import { NetworkGraph } from '../graph/graphModel.js';

const SWITCH_TYPES = new Set(['l2Switch', 'l3Switch']);
const ENDPOINT_TYPES = ['pc', 'laptop', 'server', 'accessPoint'];

function getSwitchIds(graph) {
  return graph.getNodes().filter((n) => SWITCH_TYPES.has(n.type)).map((n) => n.id);
}

function getEndpointNodes(graph) {
  return graph.getNodes().filter((n) => ENDPOINT_TYPES.includes(n.type));
}

function findPath(graph, fromId, toId) {
  if (!graph.hasNode(fromId) || !graph.hasNode(toId)) return null;
  const visited = new Set();
  const queue = [[fromId]];
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    if (current === toId) return path;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of graph.getNeighbors(current)) {
      if (!visited.has(neighbor.id)) queue.push([...path, neighbor.id]);
    }
  }
  return null;
}

function highestPriorityFlowRule(policyFlows, fromId, toId) {
  let best = null;
  for (const rule of policyFlows) {
    const match = rule.match;
    if (!match || match.source !== fromId || match.destination !== toId) continue;
    if (best && best.priority >= rule.priority) continue;
    best = rule;
  }
  return best;
}

/**
 * Evaluate whether traffic from one endpoint to another would be allowed
 * under the current SDN policy/flow configuration.
 *
 * Returns a deterministic result including matched policy, flow rule,
 * traversed path, and final decision.
 */
export function evaluateTraffic(graphData, sdnState, fromId, toId) {
  const graph = NetworkGraph.fromJSON(graphData);
  const policyFlows = sdnState?.policyFlows ?? [];
  const policies = sdnState?.policies ?? [];

  const fromNode = graph.getNode(fromId);
  const toNode = graph.getNode(toId);
  if (!fromNode || !toNode) {
    return { allowed: false, reason: 'missing-endpoint', path: null, policy: null, flowRule: null };
  }

  const path = findPath(graph, fromId, toId);
  if (!path) {
    return { allowed: false, reason: 'no-path', path: null, policy: null, flowRule: null };
  }

  const policyRule = highestPriorityFlowRule(policyFlows, fromId, toId);
  if (policyRule) {
    const matchedPolicy = policies.find((p) => p.id === policyRule.policyId) || null;
    const dropped = policyRule.action.type === 'drop';
    return {
      allowed: !dropped,
      reason: dropped ? 'policy-deny' : 'policy-allow',
      path,
      policy: matchedPolicy,
      flowRule: policyRule,
    };
  }

  return {
    allowed: true,
    reason: 'default-forward',
    path,
    policy: null,
    flowRule: null,
  };
}

/**
 * Resolve candidate endpoint IDs for a traffic test from current topology.
 */
export function resolveTrafficCandidates(graphData) {
  const graph = NetworkGraph.fromJSON(graphData);
  const endpoints = getEndpointNodes(graph);
  return endpoints.map((n) => ({ id: n.id, type: n.type, label: n.config?.label || n.id }));
}

/**
 * Derive the SDN model of an existing architecture.
 * @param {{ nodes: Array, edges: Array }} graphData
 * @returns controller, managed switches, control edges, data-plane summary
 */
export function deriveSDNModel(graphData) {
  const graph = NetworkGraph.fromJSON(graphData);
  const switches = graph.getNodes().filter((n) => SWITCH_TYPES.has(n.type));
  const endpoints = graph.getNodes().filter((n) => ENDPOINT_TYPES.includes(n.type));
  const l3Devices = graph.getNodes().filter((n) => n.type === 'router' || n.type === 'l3Switch');

  return {
    controller: {
      id: 'sdn-controller',
      manages: switches.map((s) => s.id),
      protocol: 'OpenFlow (simulated)',
    },
    controlEdges: switches.map((s) => ({ source: 'sdn-controller', target: s.id })),
    dataPlane: {
      switches: switches.map((s) => s.id),
      endpoints: endpoints.map((e) => e.id),
      l3Devices: l3Devices.map((d) => d.id),
    },
    switchCount: switches.length,
    endpointCount: endpoints.length,
  };
}

/**
 * Generate logical flow rules: for every endpoint, one rule per switch
 * on the shortest path toward an L3 device (or the first switch if the
 * endpoint is isolated). Rules express "match → forward", the essence of
 * SDN programming.
 *
 * @param {{ nodes: Array, edges: Array }} graphData
 * @returns {Array} flow rules
 */
export function generateFlowRules(graphData) {
  const graph = NetworkGraph.fromJSON(graphData);
  const switches = graph.getNodes().filter((n) => SWITCH_TYPES.has(n.type));
  const endpoints = graph.getNodes().filter((n) => ENDPOINT_TYPES.includes(n.type));
  const l3Ids = new Set(
    graph.getNodes().filter((n) => n.type === 'router' || n.type === 'l3Switch').map((n) => n.id)
  );

  const rules = [];
  let seq = 0;

  for (const endpoint of endpoints) {
    // Shortest path from the endpoint to any L3 device.
    let path = null;
    for (const l3Id of l3Ids) {
      path = graph.findPath(endpoint.id, l3Id);
      if (path) break;
    }
    // Isolated endpoint: rule only for the switch it is directly attached to.
    if (!path) {
      const attached = graph.getNeighbors(endpoint.id).find((n) => SWITCH_TYPES.has(n.type));
      if (attached) path = [endpoint.id, attached.id];
    }
    if (!path) continue;

    const vlan = endpoint.config?.vlan ?? null;
    for (const nodeId of path) {
      if (!SWITCH_TYPES.has(graph.getNode(nodeId)?.type ?? '')) continue;
      seq += 1;
      rules.push({
        id: `flow-${seq}`,
        switchId: nodeId,
        priority: 100,
        match: {
          source: endpoint.id,
          sourceType: endpoint.type,
          ...(vlan != null ? { vlan } : {}),
        },
        action: { type: 'forward', toward: path[path.length - 1] },
      });
    }
  }

  return rules;
}

/**
 * Simulate controller-driven rerouting after a link failure.
 * Compares reachability with and without the failed edge and
 * produces the "new flow rules" the controller would push.
 *
 * @param {{ nodes: Array, edges: Array }} graphData
 * @param {string} failedEdgeId
 * @returns {{ affectedPaths: Array, rerouted: Array, unreachable: Array, newFlowRules: Array }}
 */
export function computeReroute(graphData, failedEdgeId) {
  const before = NetworkGraph.fromJSON(graphData);
  const failedEdge = before.getEdge(failedEdgeId);
  if (!failedEdge) {
    return { affectedPaths: [], rerouted: [], unreachable: [], newFlowRules: [] };
  }

  const after = NetworkGraph.fromJSON({
    nodes: graphData.nodes,
    edges: graphData.edges.filter((e) => e.id !== failedEdgeId),
  });

  const endpoints = before.getNodes().filter((n) => ENDPOINT_TYPES.includes(n.type));
  const targets = before.getNodes().filter(
    (n) => n.type === 'server' || n.type === 'cloud' || n.type === 'router'
  );

  const affectedPaths = [];
  const rerouted = [];
  const unreachable = [];

  for (const from of endpoints) {
    for (const to of targets) {
      const oldPath = before.findPath(from.id, to.id);
      // Only consider paths that actually used the failed link.
      const usedFailedLink =
        oldPath &&
        oldPath.some((id, i) => {
          const next = oldPath[i + 1];
          return next && ((id === failedEdge.source && next === failedEdge.target) ||
            (id === failedEdge.target && next === failedEdge.source));
        });
      if (!usedFailedLink) continue;

      affectedPaths.push({ from: from.id, to: to.id, oldPath });
      const newPath = after.findPath(from.id, to.id);
      if (newPath) {
        rerouted.push({ from: from.id, to: to.id, oldPath, newPath });
      } else {
        unreachable.push({ from: from.id, to: to.id, oldPath });
      }
    }
  }

  return {
    affectedPaths,
    rerouted,
    unreachable,
    newFlowRules: rerouted.map((r, i) => ({
      id: `reroute-flow-${i + 1}`,
      path: r.newPath,
      reason: 'link-failure',
    })),
  };
}

/**
 * Score the SDN transformation.
 * @param {{ nodes: Array, edges: Array }} graphData
 * @param {{ controllerPlaced: boolean, flowRules: Array, reroute: Object|null }} sdnState
 */
export function scoreSDN(graphData, sdnState) {
  const graph = NetworkGraph.fromJSON(graphData);
  const totalSwitches = graph.getNodes().filter((n) => SWITCH_TYPES.has(n.type)).length;
  if (totalSwitches === 0) {
    return { overall: 0, coverage: 0, flowRules: 0, reroute: 0, message: 'No switches to control' };
  }

  const controllerPlaced = sdnState?.controllerPlaced ? 1 : 0;
  const managedSwitches = sdnState?.controllerPlaced ? totalSwitches : 0;
  const coverage = Math.round((managedSwitches / totalSwitches) * 100);

  const expectedRules = generateFlowRules(graphData).length;
  const ruleCount = sdnState?.flowRules?.length ?? 0;
  const flowScore = expectedRules === 0 ? 100 : Math.min(100, Math.round((ruleCount / expectedRules) * 100));

  let rerouteScore = 0;
  if (sdnState?.reroute) {
    const { rerouted, unreachable } = sdnState.reroute;
    const total = rerouted.length + unreachable.length;
    rerouteScore = total === 0 ? 50 : Math.round((rerouted.length / total) * 100);
  }

  const overall = Math.round(coverage * 0.4 + flowScore * 0.35 + (sdnState?.reroute ? rerouteScore * 0.25 : 0));

  return {
    overall,
    coverage,
    flowRules: flowScore,
    reroute: sdnState?.reroute ? rerouteScore : null,
    message: `${managedSwitches}/${totalSwitches} switches under central control`,
  };
}

export default { deriveSDNModel, generateFlowRules, computeReroute, scoreSDN, evaluateTraffic, resolveTrafficCandidates };
