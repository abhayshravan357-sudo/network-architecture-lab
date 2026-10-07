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

export { runPing } from './ping.js';
export { arpRequest } from './arp.js';
export { icmpEcho } from './icmp.js';

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

export default { applyEvent, scoreSimulation };
