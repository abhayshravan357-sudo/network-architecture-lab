/**
 * Fault injection for the animated journey — teaching experiments only.
 *
 * Every fault changes a real configuration value that the network engine
 * reads, so the resulting journey is a genuine re-computation and never a
 * hardcoded failure. A fault that the current configuration cannot express is
 * reported as not applicable instead of being faked.
 */

import { NetworkGraph } from '../../engine/graph/graphModel.js';
import { JOURNEY_LAYERS } from '../../engine/simulation/journeyEventTypes.js';

const ENDPOINT_TYPES = ['pc', 'laptop', 'server', 'accessPoint'];

/**
 * faultId → { label, description, why }. Only faults the engine can actually
 * express are listed; there is deliberately no "wrong gateway" option because
 * no engine code reads a configured gateway.
 */
export const FAULT_TYPES = [
  {
    id: 'link-down',
    label: 'Remove a link',
    description:
      'Deletes one link from the topology. The engine re-runs its Layer-2 path search, so the packet either reroutes or fails at L2 connectivity.',
  },
  {
    id: 'missing-route',
    label: 'Remove a router interface',
    description:
      'Deletes the router interface that faces the destination subnet. The engine can then no longer find a router spanning both subnets, and routing fails.',
  },
  {
    id: 'policy-deny',
    label: 'Install a DENY policy',
    description:
      'Adds an SDN policy flow rule that drops this source → destination pair, exactly in the shape the SDN engine produces (match source/destination, priority 200, action drop).',
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function linkOptions(graphData) {
  return (graphData?.edges ?? []).map((edge) => ({
    id: edge.id,
    label: `${edge.id} (${edge.source} ↔ ${edge.target})`,
  }));
}

function removeLink(graphData, linkId) {
  const after = clone(graphData);
  const edge = after.edges.find((e) => e.id === linkId);
  if (!edge) return { ok: false, reason: `Link ${linkId} is not in the topology.` };
  after.edges = after.edges.filter((e) => e.id !== linkId);
  return {
    ok: true,
    graphData: after,
    description: `Removed link ${linkId} (${edge.source} ↔ ${edge.target}).`,
    evidence: `Edge ${linkId} deleted from the graph the engine reads.`,
  };
}

function removeRouterInterface(graphData, sourceId, targetId) {
  const graph = NetworkGraph.fromJSON(graphData);
  const sourceNetworks = graph.getNodeOwnNetworks(sourceId);
  const targetNetworks = graph.getNodeOwnNetworks(targetId);
  const spanning = graph.getRoutersSpanning(sourceNetworks, targetNetworks);
  if (spanning.length === 0) {
    return {
      ok: false,
      reason:
        'No router currently spans the source and destination subnets, so there is no interface to remove. This fault only applies when the journey is routed.',
    };
  }
  const routerId = spanning[0].nodeId;
  const egress = spanning[0].egress;
  const after = clone(graphData);
  const router = after.nodes.find((n) => n.id === routerId);
  const index = router.config.interfaces.findIndex(
    (iface) => iface.ip === egress.interface.ip && iface.mask === egress.interface.mask
  );
  if (index === -1) return { ok: false, reason: `Router ${routerId} has no matching interface.` };

  const [removed] = router.config.interfaces.splice(index, 1);
  return {
    ok: true,
    graphData: after,
    description: `Removed ${routerId} interface ${removed.ip}/${removed.mask} (${egress.network}).`,
    evidence: `Router ${routerId} no longer has an interface in ${targetNetworks.join(', ')}.`,
  };
}

function addDenyPolicy(sdnState, graphData, sourceId, targetId) {
  const graph = NetworkGraph.fromJSON(graphData);
  const path = graph.findPath(sourceId, targetId);
  const switchId = path?.find((id) => {
    const node = graph.getNode(id);
    return node && (node.type === 'l2Switch' || node.type === 'l3Switch');
  }) ?? null;

  const ruleId = `fault-flow-${Date.now().toString(36)}`;
  const rule = {
    id: ruleId,
    policyId: 'fault-policy',
    switchId,
    priority: 200,
    match: { sourceGroup: 'fault', destinationGroup: 'fault', source: sourceId, destination: targetId },
    action: { type: 'drop' },
    injected: true,
  };

  return {
    ok: true,
    sdnState: { ...clone(sdnState ?? {}), policyFlows: [...(sdnState?.policyFlows ?? []), rule] },
    description: `Installed a DENY policy flow for ${sourceId} → ${targetId}.`,
    evidence: `Rule ${ruleId}: match source=${sourceId}, destination=${targetId}, priority 200, action drop.`,
  };
}

/**
 * Apply one fault to the learner's configuration.
 *
 * @param {{ graphData: Object, sdnState: Object, sourceId: string, targetId: string }} config
 * @param {string} faultType   one of FAULT_TYPES[].id
 * @param {{ linkId?: string }} [options] required for the 'link-down' fault
 * @returns {{ ok: boolean, graphData: Object, sdnState: Object, layer: string,
 *             description: string, evidence: string, reason?: string }}
 */
export function applyFault(config, faultType, options = {}) {
  const { graphData, sdnState, sourceId, targetId } = config;
  const base = {
    graphData: graphData ?? { nodes: [], edges: [] },
    sdnState: sdnState ?? {},
    layer: JOURNEY_LAYERS.DATA,
  };

  switch (faultType) {
    case 'link-down': {
      const linkId = options.linkId ?? linkOptions(graphData)[0]?.id;
      if (!linkId) return { ok: false, reason: 'There is no link to remove in this topology.' };
      const result = removeLink(graphData, linkId);
      return { ...base, ...result };
    }
    case 'missing-route': {
      const result = removeRouterInterface(graphData, sourceId, targetId);
      return { ...base, ...result };
    }
    case 'policy-deny': {
      const result = addDenyPolicy(sdnState, graphData, sourceId, targetId);
      return { ...base, ...result, layer: JOURNEY_LAYERS.CONTROL };
    }
    default:
      return { ok: false, reason: `Unknown fault type: ${faultType}` };
  }
}

export { linkOptions };

/**
 * First position where two event lists tell a different story — the moment a
 * fault starts to matter.
 *
 * A divergence is meaningful when the packet is at a different device.
 * Differences in event type at the same device (e.g., ARP vs DROP at the
 * source) are not considered path divergences — the packet hasn't moved
 * to a different place yet.
 */
export function findFirstDivergence(baselineEvents, faultyEvents) {
  const max = Math.max(baselineEvents?.length ?? 0, faultyEvents?.length ?? 0);
  for (let i = 0; i < max; i += 1) {
    const a = baselineEvents?.[i];
    const b = faultyEvents?.[i];
    if (!a || !b) {
      return { index: i, baseline: a ?? null, faulty: b ?? null };
    }
    // Path divergence: different device means the packet went a different way.
    if (a.deviceId !== b.deviceId) {
      return { index: i, baseline: a, faulty: b };
    }
  }
  return null;
}

export default { FAULT_TYPES, applyFault, findFirstDivergence, linkOptions };
