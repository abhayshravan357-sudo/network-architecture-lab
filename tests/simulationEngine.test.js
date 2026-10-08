import { describe, it, expect } from 'vitest';
import { applyEvent, scoreSimulation } from '../src/engine/simulation/simulationEngine.js';

describe('simulationEngine', () => {
  const baseGraph = {
    nodes: [
      { id: 'pc1', type: 'pc', config: {} },
      { id: 'sw1', type: 'l2Switch', config: {} },
      { id: 'srv1', type: 'server', config: {} },
    ],
    edges: [
      { id: 'e1', source: 'pc1', target: 'sw1' },
      { id: 'e2', source: 'sw1', target: 'srv1' },
    ],
  };

  it('applies traffic-surge deterministically', () => {
    const result = applyEvent(baseGraph, 'traffic-surge', { vnfInstances: [], multiplier: 5 });
    expect(result.impact).toBe('high');
    expect(result.summary).toContain('multiplied by 5');
  });

  it('applies link-failure and reports broken paths', () => {
    const result = applyEvent(baseGraph, 'link-failure', { edgeId: 'e2' });
    expect(result.impact).toBe('critical');
    expect(result.details.brokenPaths.length).toBeGreaterThan(0);
    expect(result.graphAfter.edges.find((e) => e.id === 'e2')).toBeUndefined();
  });

  it('applies security-event without modifying graph', () => {
    const result = applyEvent(baseGraph, 'security-event', { sourceVlan: 'students', targetVlan: 'administration' });
    expect(result.impact).toBe('high');
    expect(result.graphAfter.nodes.length).toBe(baseGraph.nodes.length);
  });

  it('scores unresolved events lower than resolved ones', () => {
    const unresolved = [{ eventId: 'link-failure', resolved: false }];
    const resolved = [{ eventId: 'link-failure', resolved: true }];
    expect(scoreSimulation(unresolved).overall).toBeLessThan(scoreSimulation(resolved).overall);
  });
});
