import { describe, it, expect } from 'vitest';
import { applyEvent, scoreSimulation, tracePacket } from '../src/engine/simulation/simulationEngine.js';
import { NetworkGraph } from '../src/engine/graph/graphModel.js';

describe('simulationEngine', () => {
  const baseGraph = {
    nodes: [
      { id: 'pc1', type: 'pc', config: { interfaces: [{ ip: '192.168.1.10', mask: '255.255.255.0', gateway: '192.168.1.1' }] } },
      { id: 'sw1', type: 'l2Switch', config: {} },
      { id: 'srv1', type: 'server', config: { interfaces: [{ ip: '192.168.1.20', mask: '255.255.255.0' }] } },
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

describe('NetworkGraph ARP and MAC learning', () => {
  const graphData = {
    nodes: [
      { id: 'pc1', type: 'pc', config: { interfaces: [{ ip: '192.168.1.10', mask: '255.255.255.0', gateway: '192.168.1.1' }] } },
      { id: 'sw1', type: 'l2Switch', config: {} },
      { id: 'pc2', type: 'pc', config: { interfaces: [{ ip: '192.168.1.20', mask: '255.255.255.0', gateway: '192.168.1.1' }] } },
      { id: 'router1', type: 'router', config: { interfaces: [{ ip: '192.168.1.1', mask: '255.255.255.0' }, { ip: '10.0.0.1', mask: '255.0.0.0' }] } },
      { id: 'sw2', type: 'l2Switch', config: {} },
      { id: 'srv1', type: 'server', config: { interfaces: [{ ip: '10.0.0.10', mask: '255.0.0.0' }] } },
    ],
    edges: [
      { id: 'e1', source: 'pc1', target: 'sw1' },
      { id: 'e2', source: 'sw1', target: 'router1' },
      { id: 'e3', source: 'router1', target: 'sw2' },
      { id: 'e4', source: 'sw2', target: 'srv1' },
      { id: 'e5', source: 'pc2', target: 'sw1' },
    ],
  };

  it('generates deterministic MAC addresses', () => {
    const graph = NetworkGraph.fromJSON(graphData);
    const mac1 = graph.getNodeMac('pc1');
    const mac2 = graph.getNodeMac('pc1');
    expect(mac1).toBe(mac2);
    expect(mac1).toMatch(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/);
  });

  it('resolves MAC for same-subnet destination via ARP', () => {
    const graph = NetworkGraph.fromJSON(graphData);
    const result = graph.resolveMac('pc1', '192.168.1.20');
    expect(result.mac).toBeTruthy();
    expect(result.viaGateway).toBe(false);
    expect(result.targetNodeId).toBe('pc2');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].type).toBe('arp-request');
    expect(result.steps[1].type).toBe('arp-reply');
  });

  it('resolves MAC for different-subnet destination via gateway ARP', () => {
    const graph = NetworkGraph.fromJSON(graphData);
    const result = graph.resolveMac('pc1', '10.0.0.10');
    expect(result.mac).toBeTruthy();
    expect(result.viaGateway).toBe(true);
    expect(result.gatewayNodeId).toBe('router1');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].type).toBe('arp-request');
    expect(result.steps[1].type).toBe('arp-reply');
  });

  it('caches ARP entries after resolution', () => {
    const graph = NetworkGraph.fromJSON(graphData);
    graph.resolveMac('pc1', '192.168.1.20');
    const cached = graph.getArpEntry('pc1', '192.168.1.20');
    expect(cached).toBeTruthy();
  });

  it('learns MAC addresses on switch ports', () => {
    const graph = NetworkGraph.fromJSON(graphData);
    graph.learnMac('sw1', 'aa:bb:cc:dd:ee:ff', 'pc1');
    expect(graph.hasMacEntry('sw1', 'aa:bb:cc:dd:ee:ff')).toBe(true);
    expect(graph.lookupMac('sw1', 'aa:bb:cc:dd:ee:ff')).toBe('pc1');
  });

  it('floods unknown unicast to all ports except ingress', () => {
    const graph = NetworkGraph.fromJSON(graphData);
    const flooded = graph.floodPorts('sw1', 'pc1');
    expect(flooded).toContain('router1');
    expect(flooded).toContain('pc2');
    expect(flooded).not.toContain('pc1');
  });

  it('generates deterministic MAC addresses', () => {
    const mac1 = NetworkGraph.generateMac('test-node');
    const mac2 = NetworkGraph.generateMac('test-node');
    expect(mac1).toBe(mac2);
    expect(mac1).toMatch(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/);
  });
});
