/**
 * Simulation Engine — pure, deterministic dynamic behavior.
 *
 * Applies runtime events (traffic surges, node/link failures,
 * security incidents, user growth) to the network graph and
 * reports their impact. The student observes cause and effect
 * and responds architecturally.
 *
 * Runtime packet simulation (Phase 2 MVP) is deterministic and
 * synchronous; animation timing is driven by the UI, never here.
 */

import { NetworkGraph } from '../graph/graphModel.js';
import { evaluateTraffic } from '../sdn/sdnEngine.js';

/**
 * Apply a simulation event to the network and report impact.
 *
 * @param {{ nodes: Array, edges: Array }} graphData
 * @param {string} eventId
 * @param {Object} context   { nodeId, edgeId, load, vnfInstances }
 * @returns {{ eventId, impact: 'low'|'moderate'|'high'|'critical', summary: string,
 *             details: Object, graphAfter: { nodes, edges } }}
 */
export function applyEvent(graphData, eventId, context = {}) {
  const graph = NetworkGraph.fromJSON(graphData);
  const endpoints = graph.getNodes().filter((n) =>
    ['pc', 'laptop', 'server', 'accessPoint'].includes(n.type)
  );

  switch (eventId) {
    case 'traffic-surge': {
      const multiplier = context.multiplier ?? 5;
      const affectedVnfs = (context.vnfInstances ?? []).map((i) => ({
        id: i.id,
        vnfId: i.vnfId,
        previousLoad: i.load ?? 0,
        newLoad: (i.load ?? 0) * multiplier,
      }));
      return {
        eventId,
        impact: 'high',
        summary: `Traffic surge: load multiplied by ${multiplier} across ${endpoints.length} endpoints.`,
        details: { multiplier, affectedEndpoints: endpoints.length, affectedVnfs },
        graphAfter: graph.exportJSON(),
      };
    }

    case 'node-failure': {
      const nodeId = context.nodeId;
      const node = graph.getNode(nodeId);
      if (!node) {
        return { eventId, impact: 'low', summary: `Node ${nodeId} not found — no effect.`, details: {}, graphAfter: graph.exportJSON() };
      }
      const affected = graph.getReachableFrom(nodeId).filter((n) => n.id !== nodeId);
      const graphAfter = NetworkGraph.fromJSON(graphData);
      graphAfter.removeNode(nodeId);
      return {
        eventId,
        impact: affected.length > 0 ? 'critical' : 'moderate',
        summary: `${node.type} "${nodeId}" failed — ${affected.length} node(s) lost connectivity.`,
        details: { failedNode: nodeId, nodeType: node.type, affectedNodes: affected.map((n) => n.id) },
        graphAfter: graphAfter.exportJSON(),
      };
    }

    case 'link-failure': {
      const edgeId = context.edgeId;
      const edge = graph.getEdge(edgeId);
      if (!edge) {
        return { eventId, impact: 'low', summary: `Link ${edgeId} not found — no effect.`, details: {}, graphAfter: graph.exportJSON() };
      }
      const graphAfter = NetworkGraph.fromJSON({
        nodes: graphData.nodes,
        edges: graphData.edges.filter((e) => e.id !== edgeId),
      });
      // Count endpoint pairs that lost their path.
      const pairs = [];
      const after = NetworkGraph.fromJSON(graphAfter.exportJSON());
      for (const a of endpoints) {
        for (const b of graph.getNodesByType('server')) {
          if (graph.findPath(a.id, b.id) && !after.findPath(a.id, b.id)) {
            pairs.push({ from: a.id, to: b.id });
          }
        }
      }
      return {
        eventId,
        impact: pairs.length > 0 ? 'critical' : 'moderate',
        summary: `Link ${edgeId} (${edge.source} ↔ ${edge.target}) failed — ${pairs.length} endpoint→server path(s) broken.`,
        details: { failedEdge: edgeId, brokenPaths: pairs },
        graphAfter: graphAfter.exportJSON(),
      };
    }

    case 'security-event': {
      const sourceVlan = context.sourceVlan ?? 'students';
      const targetVlan = context.targetVlan ?? 'administration';
      return {
        eventId,
        impact: 'high',
        summary: `Unauthorized access attempt from "${sourceVlan}" segment toward "${targetVlan}" segment.`,
        details: {
          sourceVlan,
          targetVlan,
          blocked: true,
          recommendation:
            'Verify ACLs deny cross-segment traffic and that the firewall/ACL is on the path between the two segments.',
        },
        graphAfter: graph.exportJSON(),
      };
    }

    case 'user-growth': {
      const newUsers = context.newUsers ?? 200;
      const capacity = (context.vnfInstances ?? []).reduce((sum, i) => sum + (i.throughput ?? 0), 0);
      return {
        eventId,
        impact: newUsers > capacity && capacity > 0 ? 'high' : 'moderate',
        summary: `User base grew by ${newUsers}. Current VNF capacity: ${capacity} users.`,
        details: { newUsers, vnfCapacity: capacity, exceedsCapacity: newUsers > capacity },
        graphAfter: graph.exportJSON(),
      };
    }

    case 'resource-shortage': {
      const vnfId = context.vnfId;
      const instance = (context.vnfInstances ?? []).find((i) => i.vnfId === vnfId);
      return {
        eventId,
        impact: instance ? 'high' : 'low',
        summary: instance
          ? `${vnfId} exhausted its allocated resources (CPU ${instance.cpu} units, ${instance.utilization ?? 0}% utilized).`
          : `No ${vnfId} instance deployed — nothing to exhaust.`,
        details: { vnfId, instance: instance ?? null },
        graphAfter: graph.exportJSON(),
      };
    }

    default:
      return {
        eventId,
        impact: 'low',
        summary: `Unknown event: ${eventId}`,
        details: {},
        graphAfter: graph.exportJSON(),
      };
  }
}

/**
 * Score the student's handling of simulation events.
 * Each event record: { eventId, resolved, responseKind }
 *
 * @param {Array} events
 */
export function scoreSimulation(events) {
  if (events.length === 0) {
    return { overall: 0, response: 0, coverage: 0, message: 'No simulation events ran yet' };
  }
  const resolved = events.filter((e) => e.resolved).length;
  const responseScore = Math.round((resolved / events.length) * 100);
  // Coverage: did the student experience the event variety?
  const kinds = new Set(events.map((e) => e.eventId));
  const coverageScore = Math.min(100, kinds.size * 25);
  const overall = Math.round(responseScore * 0.7 + coverageScore * 0.3);
  return {
    overall,
    response: responseScore,
    coverage: coverageScore,
    message: `${resolved}/${events.length} events handled successfully`,
  };
}

/**
 * Trace a packet from source to destination through the network,
 * showing each hop, decision, and reason based on actual engine logic.
 *
 * @param {{ nodes: Array, edges: Array }} graphData
 * @param {string} fromId - Source node ID
 * @param {string} toId - Destination node ID
 * @param {Object} sdnState - Current SDN state (policies, flow rules)
 * @returns {Object} Trace result with steps, reachable flag, and failure reason
 */
export function tracePacket(graphData, fromId, toId, sdnState = {}) {
  const graph = NetworkGraph.fromJSON(graphData);
  const fromNode = graph.getNode(fromId);
  const toNode = graph.getNode(toId);

  const steps = [];
  let stepNumber = 1;

  // Step 1: Validate endpoints
  const fromNodeObj = graph.getNode(fromId);
  const toNodeObj = graph.getNode(toId);

  if (!fromNodeObj) {
    return {
      reachable: false,
      steps: [{
        step: stepNumber++,
        device: fromId,
        decision: 'Source endpoint not found in topology',
        reason: 'Source node does not exist in the network graph',
        evidence: 'Graph node lookup failed',
        type: 'error',
      }],
      failurePoint: 'source',
      reason: 'Source endpoint not found in topology',
    };
  }

  if (!toNodeObj) {
    return {
      reachable: false,
      steps: [{
        step: stepNumber++,
        device: toId,
        decision: 'Destination endpoint not found in topology',
        reason: 'Destination node does not exist in the network graph',
        evidence: 'Graph node lookup failed',
        type: 'error',
      }],
      failurePoint: 'destination',
      reason: 'Destination endpoint not found in topology',
    };
  }

  // Step 2: Check L2 connectivity (graph path)
  const l2Path = NetworkGraph.fromJSON(graphData).findPath(fromId, toId);
  if (!l2Path) {
    return {
      reachable: false,
      steps: [
        {
          step: stepNumber++,
          device: fromId,
          decision: 'No Layer-2 path to destination',
          reason: 'No physical/logical link path exists between source and destination',
          evidence: `Graph BFS from ${fromId} to ${toId} returned no path`,
          type: 'failure',
        },
      ],
      reachable: false,
      failurePoint: 'l2-connectivity',
      reason: 'No Layer-2 path exists between source and destination',
    };
  }

  // Step 3: Trace L2 hops
  const l2PathSteps = traceL2Path(graph, l2Path, fromId, toId, stepNumber);
  steps.push(...l2PathSteps.steps);
  stepNumber = l2PathSteps.nextStepNumber;

  // Step 4: Check L3 routing (subnet/routing)
  const routedPath = traceL3Routing(graph, fromId, toId, stepNumber);
  steps.push(...routedPath.steps);
  stepNumber = routedPath.nextStepNumber;

  if (!routedPath.reachable) {
    return {
      reachable: false,
      steps,
      path: l2Path,
      failurePoint: routedPath.failurePoint,
      reason: routedPath.reason,
    };
  }

  // Step 5: Check SDN policies / firewall
  const policyCheck = tracePolicyCheck(graphData, sdnState, fromId, toId, stepNumber);
  steps.push(...policyCheck.steps);
  stepNumber = policyCheck.nextStepNumber;

  if (!policyCheck.allowed) {
    return {
      reachable: false,
      steps,
      path: l2Path,
      failurePoint: 'policy',
      reason: policyCheck.reason,
    };
  }

  // Step 6: Success - packet delivered
  steps.push({
    step: stepNumber++,
    device: toId,
    decision: 'Packet delivered to destination',
    reason: 'Packet successfully reached destination endpoint',
    evidence: `L2 path: ${l2Path.join(' → ')}; L3 routing verified; policy allows`,
    type: 'success',
    detail: { path: l2Path },
  });

  return {
    reachable: true,
    steps,
    path: l2Path,
    reason: 'Packet successfully delivered',
  };
}

/**
 * Id of the link that connects two directly connected nodes.
 * @returns {string|null}
 */
function findLinkId(graph, aId, bId) {
  const edge = graph.getEdgesOf(aId).find(
    (e) => (e.source === aId && e.target === bId) || (e.source === bId && e.target === aId)
  );
  return edge?.id ?? null;
}

/**
 * Trace Layer-2 path hops with ARP and MAC learning
 */
function traceL2Path(graph, l2Path, fromId, toId, startStep) {
  const steps = [];
  let step = startStep;

  // First, check if ARP resolution is needed
  const fromNode = graph.getNode(fromId);
  const toNode = graph.getNode(toId);
  
  if (fromNode && toNode) {
    // Get target IP
    const targetIp = toNode.config?.interfaces?.[0]?.ip || toNode.config?.ip;
    if (targetIp) {
      // Perform ARP resolution
      const arpResult = l2Path.length > 1 ? graph.resolveMac(fromId, targetIp) : null;
      if (arpResult && arpResult.steps) {
        for (const arpStep of arpResult.steps) {
          if (arpStep.type === 'arp-request') {
            steps.push({
              step: step++,
              device: arpStep.from,
              decision: `ARP Request: Who has ${arpStep.targetIp}? Tell ${arpStep.from}`,
              reason: `Source ${arpStep.from} needs MAC address for ${arpStep.targetIp} to send Ethernet frame`,
              evidence: `ARP request broadcast on local network for ${arpStep.targetIp}`,
              type: 'arp-request',
              detail: { targetIp: arpStep.targetIp, responder: arpStep.to, requestedBy: arpStep.from },
            });
          } else if (arpStep.type === 'arp-reply') {
            steps.push({
              step: step++,
              device: arpStep.from,
              decision: `ARP Reply: ${arpStep.targetIp} is at ${arpStep.mac}`,
              reason: `Target ${arpStep.from} responds with its MAC address`,
              evidence: `ARP reply: ${arpStep.targetIp} is at ${arpStep.mac}`,
              type: 'arp-reply',
              detail: { targetIp: arpStep.targetIp, mac: arpStep.mac, responder: arpStep.from },
            });
          }
        }
      }
    }
  }

  for (let i = 0; i < l2Path.length - 1; i++) {
    const current = l2Path[i];
    const next = l2Path[i + 1];
    const currentNode = graph.getNode(current);
    const nextNode = graph.getNode(next);

    if (!currentNode || !nextNode) continue;

    // The real link this hop traverses, so callers can animate along it.
    const linkId = findLinkId(graph, current, next);

    // Show MAC learning on switches
    if (currentNode.type === 'l2Switch' || currentNode.type === 'l3Switch') {
      // Check if MAC learning occurs
      const srcMac = graph.getNodeMac(l2Path[i - 1] || fromId);
      if (srcMac && !graph.hasMacEntry(current, srcMac)) {
        // Learn source MAC
        graph.learnMac(current, srcMac, l2Path[i - 1] || fromId);
        steps.push({
          step: step++,
          device: current,
          toId: l2Path[i - 1] || fromId,
          linkId,
          decision: `MAC Learning: Learned ${srcMac} on port toward ${l2Path[i - 1] || fromId}`,
          reason: `Switch ${current} learns source MAC ${srcMac} from incoming frame on port toward ${l2Path[i - 1] || fromId}`,
          evidence: `MAC table updated: ${srcMac} -> port toward ${l2Path[i - 1] || fromId}`,
          type: 'mac-learning',
        });
      }
    }

    if (!currentNode || !nextNode) continue;

    // Determine the action at this hop
    const L3_HOP_TYPES = ['router', 'l3Switch', 'firewall'];
    let decision, reason, evidence, type;
    if (currentNode.type === 'pc' || currentNode.type === 'laptop') {
      decision = 'Host sends frame to next hop';
      reason = 'Source host encapsulates packet in Ethernet frame toward next hop';
      evidence = `Host ${current} sends Ethernet frame toward ${next}`;
      type = 'l2-send';
    } else if (L3_HOP_TYPES.includes(currentNode.type)) {
      decision = `${currentNode.type === 'firewall' ? 'Firewall' : 'Router'} ${current} forwards packet to ${next}`;
      reason = `${currentNode.type} ${current} applies its Layer-3 forwarding decision and sends the packet out the interface toward ${next}`;
      evidence = `${currentNode.type} ${current} forwards out the interface connected to ${next}`;
      type = 'l3-forward';
    } else if (nextNode.type === 'server' || nextNode.type === 'pc' || nextNode.type === 'laptop') {
      // Check MAC table lookup
      const targetMac = graph.getNodeMac(l2Path[i + 1]);
      const hasMacEntry = graph.hasMacEntry(current, targetMac);
      if (hasMacEntry) {
        decision = 'Switch forwards frame to destination';
        reason = `Switch ${current} forwards frame to destination ${next} via MAC table`;
        evidence = `Switch MAC table lookup: destination MAC ${targetMac} found on port toward ${next}`;
        type = 'l2-forward';
      } else {
        decision = 'Switch floods frame (unknown destination MAC)';
        reason = `Switch ${current} does not know destination MAC, floods to all ports except ingress`;
        evidence = `Switch MAC table: no entry for destination MAC, flooding to all ports except ingress`;
        type = 'l2-flood';
      }
    } else {
      decision = `Switch ${current} forwards frame to ${next}`;
      reason = `Switch forwards frame toward destination based on MAC table`;
      evidence = `Switch ${current} MAC table: destination ${next} reachable via this port`;
      type = 'l2-forward';
    }

    steps.push({
      step: step++,
      device: current,
      fromId: l2Path[i - 1] || fromId,
      toId: next,
      linkId,
      decision,
      reason,
      evidence,
      type,
    });
  }

  // Final L2 delivery
  const lastHop = l2Path[l2Path.length - 1];
  const lastNode = graph.getNode(lastHop);
  if (lastNode && (lastNode.type === 'server' || lastNode.type === 'pc' || lastNode.type === 'laptop')) {
    steps.push({
      step: step++,
      device: lastHop,
      decision: 'Destination receives frame',
      reason: 'Destination endpoint receives and decapsulates Ethernet frame',
      evidence: `Frame delivered to ${lastHop} (${lastNode.type})`,
      type: 'l2-deliver',
    });
  }

  return { steps, nextStepNumber: step };
}

/**
 * Trace Layer-3 routing decisions
 */
function traceL3Routing(graph, fromId, toId, startStep) {
  const steps = [];
  let step = startStep;

  // Get start/end nodes
  const startNode = graph.getNode(fromId);
  const endNode = graph.getNode(toId);

  if (!startNode || !endNode) {
    return {
      reachable: false,
      steps: [{
        step: step++,
        device: 'unknown',
        decision: 'Invalid endpoints for routing trace',
        reason: 'Source or destination node not found',
        evidence: 'Node lookup failed',
        type: 'error',
      }],
      nextStepNumber: step,
      reachable: false,
      failurePoint: 'routing-validation',
      reason: 'Invalid endpoints for routing',
    };
  }

  // Same-subnet check uses the addresses each endpoint actually owns, so a
  // cross-subnet pair is never reported as local delivery.
  const startNetworks = graph.getNodeOwnNetworks(fromId);
  const endNetworks = graph.getNodeOwnNetworks(toId);
  const commonNetwork = startNetworks.find(n => endNetworks.includes(n));

  if (commonNetwork) {
    // Same subnet - direct L2
    steps.push({
      step: step++,
      device: fromId,
      decision: `Same subnet (${commonNetwork}) - direct Layer-2 delivery`,
      reason: 'Source and destination are in the same IP subnet, no routing needed',
      evidence: `Source networks: [${startNetworks.join(', ')}]; Destination networks: [${endNetworks.join(', ')}]; Common: ${commonNetwork}`,
      type: 'l3-same-subnet',
      detail: { commonNetwork, sourceNetworks: startNetworks, destinationNetworks: endNetworks },
    });
    return { steps, nextStepNumber: step, reachable: true };
  }

  // Different subnets - need router
  steps.push({
    step: step++,
    device: fromId,
    decision: `Different subnets detected - routing required`,
    reason: 'Source and destination are in different IP subnets, packet must traverse a router',
    evidence: `Source networks: [${startNetworks.join(', ')}]; Destination networks: [${endNetworks.join(', ')}]; No common subnet`,
    type: 'l3-route-needed',
  });

  // Find a router that owns an interface in the source subnet AND in the
  // destination subnet, and sits on the L2 path.
  const spanningRouters = graph.getRoutersSpanning(startNetworks, endNetworks);
  let selectedRouter = null;
  let routerReason = '';

  for (const router of spanningRouters) {
    const l2Path = graph.findPath(fromId, toId);
    if (l2Path && l2Path.includes(router.nodeId)) {
      selectedRouter = router;
      routerReason = `Router ${router.nodeId} has an interface in ${startNetworks.join(', ')} (${router.ingress.interface.ip}/${router.ingress.interface.mask}) and in ${endNetworks.join(', ')} (${router.egress.interface.ip}/${router.egress.interface.mask}), and is on the L2 path`;
      break;
    }
  }

  if (!selectedRouter) {
    const routerInterfaces = graph.getRouterInterfaces();
    steps.push({
      step: step++,
      device: 'routing',
      decision: 'No suitable router found for inter-subnet routing',
      reason: 'No router owns an interface in both the source and destination subnets, or no such router is on the L2 path',
      evidence: `Source subnets: [${startNetworks.join(', ')}]; Dest subnets: [${endNetworks.join(', ')}]; Router interfaces: ${routerInterfaces.map(r => `${r.nodeId}:${r.network}`).join(', ') || 'none configured'}`,
      type: 'failure',
      detail: {
        sourceNetworks: startNetworks,
        destinationNetworks: endNetworks,
        routerInterfaces: routerInterfaces.map((r) => ({ nodeId: r.nodeId, network: r.network })),
      },
    });
    return {
      reachable: false,
      steps,
      nextStepNumber: step,
      failurePoint: 'l3-no-router',
      reason: 'No router with interfaces in both the source and destination subnets on the L2 path',
    };
  }

  // Router found - trace through router
  steps.push({
    step: step++,
    device: selectedRouter.nodeId,
    decision: `Router ${selectedRouter.nodeId} routes between subnets`,
    reason: routerReason,
    evidence: `Router interfaces: ${selectedRouter.ingress.interface?.ip}/${selectedRouter.ingress.interface?.mask} (network: ${selectedRouter.ingress.network}) → ${selectedRouter.egress.interface?.ip}/${selectedRouter.egress.interface?.mask} (network: ${selectedRouter.egress.network}); L2 path includes router`,
    type: 'l3-router',
    detail: {
      routerId: selectedRouter.nodeId,
      interface: selectedRouter.ingress.interface,
      network: selectedRouter.ingress.network,
      egressInterface: selectedRouter.egress.interface,
      egressNetwork: selectedRouter.egress.network,
      destinationNetworks: endNetworks,
    },
  });

  // Router forwards toward destination
  steps.push({
    step: step++,
    device: selectedRouter.nodeId,
    decision: `Router forwards packet toward destination subnet`,
    reason: 'Router performs L3 forwarding: decrements TTL, updates MAC, forwards out egress interface',
    evidence: `Router ${selectedRouter.nodeId} egress interface connects to destination subnet ${endNetworks.join(', ')}`,
    type: 'l3-forward',
    detail: {
      routerId: selectedRouter.nodeId,
      destinationNetworks: endNetworks,
    },
  });

  return { steps, nextStepNumber: step, reachable: true };
}

/**
 * Trace SDN policy / firewall check
 */
function tracePolicyCheck(graphData, sdnState, fromId, toId, startStep) {
  const steps = [];
  let step = startStep;

  const graph = NetworkGraph.fromJSON(graphData);
  const policyFlows = sdnState?.policyFlows ?? [];
  const policies = sdnState?.policies ?? [];

  // Highest-priority matching rule wins — same rule selection as
  // sdnEngine.evaluateTraffic, so both paths agree on the decision.
  let matchedPolicy = null;
  let matchedFlowRule = null;

  for (const rule of policyFlows) {
    const match = rule.match;
    if (!match || match.source !== fromId || match.destination !== toId) continue;
    if (matchedFlowRule && matchedFlowRule.priority >= rule.priority) continue;
    matchedFlowRule = rule;
    matchedPolicy = policies.find(p => p.id === rule.policyId) || null;
  }

  const policyLabel = matchedPolicy
    ? `${matchedPolicy.source} → ${matchedPolicy.destination}: ${matchedPolicy.action}`
    : null;

  if (matchedFlowRule) {
    const dropped = matchedFlowRule.action.type === 'drop';
    const policyDetail = {
      ruleId: matchedFlowRule.id,
      policyId: matchedFlowRule.policyId ?? null,
      policyName: policyLabel,
      priority: matchedFlowRule.priority,
      action: matchedFlowRule.action.type,
      match: matchedFlowRule.match,
      source: fromId,
      destination: toId,
    };
    if (dropped) {
      steps.push({
        step: step++,
        device: 'sdn-controller',
        decision: `Packet DENIED by policy "${policyLabel || matchedFlowRule.policyId}"`,
        reason: `SDN policy explicitly denies traffic from ${fromId} to ${toId}`,
        evidence: `Policy match: source=${fromId}, dest=${toId}; Action: ${matchedFlowRule.action.type}; Priority: ${matchedFlowRule.priority}`,
        type: 'policy-deny',
        detail: policyDetail,
      });
      return {
        allowed: false,
        steps,
        nextStepNumber: step,
        reason: `Policy denies traffic: ${policyLabel || matchedFlowRule.policyId}`,
        failurePoint: 'policy-deny',
      };
    } else {
      steps.push({
        step: step++,
        device: 'sdn-controller',
        decision: `Packet ALLOWED by policy "${policyLabel || matchedFlowRule.policyId}"`,
        reason: `SDN policy explicitly allows traffic from ${fromId} to ${toId}`,
        evidence: `Policy match: source=${fromId}, dest=${toId}; Action: ${matchedFlowRule.action.type}; Priority: ${matchedFlowRule.priority}`,
        type: 'policy-allow',
        detail: policyDetail,
      });
    }
  } else {
    steps.push({
      step: step++,
      device: 'sdn-controller',
      decision: 'No explicit policy - default forward',
      reason: 'No matching SDN policy found; default action is to forward',
      evidence: `No policy matches source=${fromId}, dest=${toId}; Default action: forward`,
      type: 'policy-default',
      detail: { source: fromId, destination: toId, action: 'forward', matchedBy: 'default-forward' },
    });
  }

  return { allowed: true, steps, nextStepNumber: step };
}

export default { applyEvent, scoreSimulation, tracePacket };
