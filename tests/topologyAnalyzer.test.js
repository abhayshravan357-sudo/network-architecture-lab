import { describe, it, expect } from 'vitest';
import { analyzeTopology } from '../src/engine/learning/topologyAnalyzer.js';

describe('topologyAnalyzer', () => {
  it('returns scores and insights for a basic topology', () => {
    const analysis = analyzeTopology({
      nodes: [
        { id: 'pc1', type: 'pc', config: {} },
        { id: 'sw1', type: 'l2Switch', config: { vlans: [10] } },
        { id: 'r1', type: 'router', config: { interfaces: [{ ip: '192.168.1.1', mask: 24 }] } },
        { id: 'srv1', type: 'server', config: {} },
        { id: 'cloud1', type: 'cloud', config: {} },
      ],
      edges: [
        { id: 'e1', source: 'pc1', target: 'sw1' },
        { id: 'e2', source: 'sw1', target: 'r1' },
        { id: 'e3', source: 'r1', target: 'srv1' },
        { id: 'e4', source: 'r1', target: 'cloud1' },
      ],
    });

    expect(analysis.scores).toBeDefined();
    expect(analysis.scores.overall).toBeGreaterThanOrEqual(0);
    expect(analysis.scores.overall).toBeLessThanOrEqual(100);
    expect(analysis.vlans).toContain(10);
    expect(analysis.counts.total).toBe(5);
    expect(analysis.whatYouBuilt).toContain('network');
  });
});
