import { describe, it, expect } from 'vitest';
import {
  evaluateTraffic,
  resolveTrafficCandidates,
} from '../src/engine/sdn/sdnEngine.js';
import { deriveSDNModel, generateFlowRules, computeReroute, scoreSDN } from '../src/engine/sdn/sdnEngine.js';

describe('sdnEngine', () => {
  const graph = {
    nodes: [
      { id: 'pc1', type: 'pc', config: { vlan: 20 } },
      { id: 'sw1', type: 'l2Switch', config: {} },
      { id: 'sw2', type: 'l2Switch', config: {} },
      { id: 'srv1', type: 'server', config: {} },
      { id: 'cloud1', type: 'cloud', config: {} },
    ],
    edges: [
      { id: 'e1', source: 'pc1', target: 'sw1' },
      { id: 'e2', source: 'sw1', target: 'sw2' },
      { id: 'e3', source: 'sw2', target: 'srv1' },
      { id: 'e4', source: 'sw2', target: 'cloud1' },
    ],
  };

  it('derives controller model from actual topology', () => {
    const model = deriveSDNModel(graph);
    expect(model.controller.manages).toEqual(['sw1', 'sw2']);
    expect(model.dataPlane.endpoints).toEqual(['pc1', 'srv1']);
  });

  it('generates flow rules for endpoint paths', () => {
    const rules = generateFlowRules(graph);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => ['sw1', 'sw2'].includes(r.switchId))).toBe(true);
  });

  it('marks affected paths when a core link fails', () => {
    const reroute = computeReroute(graph, 'e2');
    expect(reroute.affectedPaths.some((p) => p.from === 'pc1' && p.to === 'srv1')).toBe(true);
    expect(reroute.unreachable.some((u) => u.from === 'pc1' && u.to === 'srv1')).toBe(true);
  });

  it('reports unreachable when removing the only path to a target', () => {
    const minimal = {
      nodes: [graph.nodes[0], graph.nodes[1], graph.nodes[3]],
      edges: [graph.edges[0], { id: 'e2', source: 'sw1', target: 'srv1' }],
    };
    const reroute = computeReroute(minimal, 'e1');
    expect(reroute.affectedPaths.some((p) => p.from === 'pc1')).toBe(true);
    expect(reroute.unreachable.some((u) => u.from === 'pc1')).toBe(true);
  });

  it('scores SDN higher when controller and flows are present', () => {
    const rules = generateFlowRules(graph);
    const full = scoreSDN(graph, { controllerPlaced: true, flowRules: rules, reroute: null });
    const empty = scoreSDN(graph, { controllerPlaced: false, flowRules: [], reroute: null });
    expect(full.overall).toBeGreaterThan(empty.overall);
  });

  it('resolves traffic candidates from actual endpoints', () => {
    const candidates = resolveTrafficCandidates(graph);
    expect(candidates.map((c) => c.id)).toEqual(['pc1', 'srv1']);
  });

  it('evaluates denied traffic from matched policy flow', () => {
    const sdnState = {
      controllerPlaced: true,
      flowRules: generateFlowRules(graph),
      policyFlows: [
        {
          id: 'policy-flow-1',
          policyId: 'policy-1',
          switchId: 'sw2',
          priority: 200,
          match: { source: 'pc1', destination: 'srv1', sourceGroup: 'guest', destinationGroup: 'server' },
          action: { type: 'drop', toward: 'srv1' },
        },
      ],
      policies: [
        { id: 'policy-1', source: 'guest', destination: 'server', action: 'DENY' },
      ],
    };
    const result = evaluateTraffic(graph, sdnState, 'pc1', 'srv1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('policy-deny');
    expect(result.policy?.action).toBe('DENY');
    expect(result.path).toEqual(['pc1', 'sw1', 'sw2', 'srv1']);
  });

  it('evaluates allowed traffic when no policy blocks the path', () => {
    const sdnState = {
      controllerPlaced: true,
      flowRules: generateFlowRules(graph),
      policyFlows: [],
      policies: [],
    };
    const result = evaluateTraffic(graph, sdnState, 'pc1', 'cloud1');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('default-forward');
  });

  it('returns missing-endpoint when either endpoint is absent', () => {
    const sdnState = { controllerPlaced: true, flowRules: [], policyFlows: [], policies: [] };
    const result = evaluateTraffic(graph, sdnState, 'pc1', 'missing');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing-endpoint');
    expect(result.path).toBeNull();
  });
});
