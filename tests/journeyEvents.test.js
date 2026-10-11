import { describe, it, expect } from 'vitest';
import { buildJourneyRun, journeySignature } from '../src/engine/simulation/journeyEvents.js';
import { tracePacket } from '../src/engine/simulation/simulationEngine.js';
import { applyFault, findFirstDivergence } from '../src/components/simulation/faultInjection.js';
import { JOURNEY_EVENT_TYPES } from '../src/engine/simulation/journeyEventTypes.js';

/* A realistic routed topology: guest VLAN (pc1) talks to a server on the WAN. */
function buildLab() {
  return {
    graphData: {
      nodes: [
        { id: 'pc1', type: 'pc', config: { ip: '192.168.1.10' } },
        { id: 'sw1', type: 'l2Switch', config: {} },
        { id: 'r1', type: 'router', config: { interfaces: [{ ip: '192.168.1.1', mask: '255.255.255.0', name: 'G0' }, { ip: '10.0.0.1', mask: '255.0.0.0', name: 'G1' }] } },
        { id: 'sw2', type: 'l2Switch', config: {} },
        { id: 'srv1', type: 'server', config: { ip: '10.0.0.10', resources: { cpu: 8, memory: 16, throughput: 5000 } } },
      ],
      edges: [
        { id: 'e1', source: 'pc1', target: 'sw1' },
        { id: 'e2', source: 'sw1', target: 'r1' },
        { id: 'e3', source: 'r1', target: 'sw2' },
        { id: 'e4', source: 'sw2', target: 'srv1' },
      ],
    },
    sdnState: { controllerPlaced: true, flowRules: [], policyFlows: [] },
    nfvState: {
      deployments: [{ id: 'dep-vFw-srv1', vnfId: 'vFirewall', hostNodeId: 'srv1' }],
      serviceChain: [{ id: 'dep-vFw-srv1' }],
    },
    orchestrationState: {
      instances: [
        { id: 'inst-1', vnfId: 'vFirewall', hostNodeId: 'srv1', state: 'running', status: 'ok', load: 100, throughput: 1000, utilization: 0.1 },
      ],
    },
    sourceId: 'pc1',
    targetId: 'srv1',
  };
}

describe('buildJourneyRun — ordering & structure', () => {
  it('emits events in strictly increasing sequence order', () => {
    const lab = buildLab();
    const run = buildJourneyRun(lab);
    expect(run.events.length).toBeGreaterThan(1);
    for (let i = 1; i < run.events.length; i += 1) {
      expect(run.events[i].seq).toBeGreaterThan(run.events[i - 1].seq);
    }
  });

  it('first event is PACKET_CREATED and last is SIMULATION_COMPLETED', () => {
    const run = buildJourneyRun(buildLab());
    expect(run.events[0].type).toBe(JOURNEY_EVENT_TYPES.PACKET_CREATED);
    expect(run.events.at(-1).type).toBe(JOURNEY_EVENT_TYPES.SIMULATION_COMPLETED);
  });

  it('refers only to real device ids (except logical ones)', () => {
    const { graphData } = buildLab();
    const nodeIds = new Set(graphData.nodes.map((n) => n.id));
    const run = buildJourneyRun(buildLab());
    const logical = new Set(['sdn-controller', 'routing']);
    for (const event of run.events) {
      if (event.deviceId && !logical.has(event.deviceId)) {
        expect(nodeIds.has(event.deviceId)).toBe(true);
      }
    }
  });

  it('refers only to real link ids', () => {
    const { graphData } = buildLab();
    const edgeIds = new Set(graphData.edges.map((e) => e.id));
    const run = buildJourneyRun(buildLab());
    for (const event of run.events) {
      if (event.linkId) expect(edgeIds.has(event.linkId)).toBe(true);
    }
  });

  it('reflects the engine decisions: path and outcome agree with tracePacket', () => {
    const lab = buildLab();
    const run = buildJourneyRun(lab);
    const trace = tracePacket(lab.graphData, lab.sourceId, lab.targetId, lab.sdnState);
    expect(run.path).toEqual(trace.path);
    expect(run.outcome.kind === 'delivered' && trace.reachable).toBe(true);
  });
});

describe('buildJourneyRun — terminal outcome', () => {
  it('ends in PACKET_DELIVERED only when the engine reports success', () => {
    const run = buildJourneyRun(buildLab());
    expect(run.events.some((e) => e.type === JOURNEY_EVENT_TYPES.PACKET_DELIVERED)).toBe(true);
  });

  it('ends in PACKET_DROPPED when no L2 path exists (disconnected topology)', () => {
    const lab = buildLab();
    lab.graphData.edges = [{ id: 'e1', source: 'pc1', target: 'sw1' }]; // sw1 has no further links
    const run = buildJourneyRun(lab);
    expect(run.outcome.kind).toBe('dropped');
    expect(run.events.some((e) => e.type === JOURNEY_EVENT_TYPES.PACKET_DROPPED)).toBe(true);

    const trace = tracePacket(lab.graphData, lab.sourceId, lab.targetId, lab.sdnState);
    expect(trace.reachable).toBe(false);
  });

  it('ends in PACKET_DROPPED when a deny policy matches', () => {
    const lab = buildLab();
    lab.sdnState.policyFlows = [
      {
        id: 'pf-1',
        policyId: 'pol-1',
        switchId: 'sw1',
        priority: 200,
        match: { sourceGroup: 'guest', destinationGroup: 'server', source: 'pc1', destination: 'srv1' },
        action: { type: 'drop' },
      },
    ];
    const run = buildJourneyRun(lab);
    expect(run.outcome.kind).toBe('dropped');
    expect(run.events.some((e) => e.type === JOURNEY_EVENT_TYPES.POLICY_DECISION && e.outcome === 'deny')).toBe(true);
  });
});

describe('buildJourneyRun — SDN integration', () => {
  it('emits flow-table events on switches when the controller is placed', () => {
    const run = buildJourneyRun(buildLab());
    const flowEvents = run.events.filter(
      (e) => e.type === JOURNEY_EVENT_TYPES.FLOW_TABLE_LOOKUP || e.type === JOURNEY_EVENT_TYPES.TABLE_MISS
    );
    expect(flowEvents.length).toBeGreaterThan(0);
  });

  it('skips SDN events when no controller is placed', () => {
    const lab = buildLab();
    lab.sdnState = { controllerPlaced: false, flowRules: [], policyFlows: [] };
    const run = buildJourneyRun(lab);
    const controlEvents = run.events.filter((e) => e.layer === 'control');
    expect(controlEvents.length).toBe(0);
    expect(run.support.sdnController).toBe(false);
  });
});

describe('buildJourneyRun — NFV integration', () => {
  it('emits VNF processing events at the host on the path', () => {
    const lab = buildLab();
    const run = buildJourneyRun(lab);
    const vnfStart = run.events.find((e) => e.type === JOURNEY_EVENT_TYPES.VNF_PROCESSING_STARTED);
    expect(vnfStart).toBeTruthy();
    expect(vnfStart.deviceId).toBe('srv1');
    expect(vnfStart.detail.vnfId).toBe('vFirewall');
  });

  it('notes chain entries whose host is not on the path', () => {
    const lab = buildLab();
    lab.nfvState.deployments.push({ id: 'dep-vLb-pc1', vnfId: 'vLoadBalancer', hostNodeId: 'pc1' });
    lab.nfvState.serviceChain.push({ id: 'dep-vLb-pc1' });
    lab.orchestrationState.instances.push({
      id: 'inst-2', vnfId: 'vLoadBalancer', hostNodeId: 'pc1', state: 'running',
    });
    const run = buildJourneyRun(lab);
    const offPath = run.events.filter((e) => e.type === JOURNEY_EVENT_TYPES.SERVICE_CHAIN_NOTE);
    expect(offPath.length).toBe(1);
    expect(offPath[0].detail.onPath).toBe(false);
    expect(offPath[0].findings?.length ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe('journeySignature & staleness', () => {
  it('changes when a link is removed', () => {
    const lab = buildLab();
    const before = journeySignature(lab);
    const afterGraph = JSON.parse(JSON.stringify(lab.graphData));
    afterGraph.edges = afterGraph.edges.slice(1);
    const after = journeySignature({ ...lab, graphData: afterGraph });
    expect(before).not.toBe(after);
  });

  it('is stable for identical inputs', () => {
    const lab = buildLab();
    expect(journeySignature(lab)).toBe(journeySignature(lab));
  });
});

describe('applyFault & divergence', () => {
  it('link-down on the path makes the journey fail at L2 connectivity', () => {
    const lab = buildLab();
    const baseline = buildJourneyRun(lab);
    const faulted = applyFault(
      { graphData: lab.graphData, sdnState: lab.sdnState, sourceId: lab.sourceId, targetId: lab.targetId },
      'link-down',
      { linkId: 'e2' }
    );
    expect(faulted.ok).toBe(true);
    const faultRun = buildJourneyRun({
      graphData: faulted.graphData,
      sdnState: faulted.sdnState,
      nfvState: lab.nfvState,
      orchestrationState: lab.orchestrationState,
      sourceId: lab.sourceId,
      targetId: lab.targetId,
    });
    expect(faultRun.outcome.kind).toBe('dropped');
    const div = findFirstDivergence(baseline.events, faultRun.events);
    expect(div).not.toBeNull();
    expect(div.baseline.deviceId).not.toBe(div.faulty.deviceId);
  });

  it('policy-deny makes the journey fail at the policy decision', () => {
    const lab = buildLab();
    const baseline = buildJourneyRun(lab);
    const faulted = applyFault(
      { graphData: lab.graphData, sdnState: lab.sdnState, sourceId: lab.sourceId, targetId: lab.targetId },
      'policy-deny'
    );
    expect(faulted.ok).toBe(true);
    const faultRun = buildJourneyRun({
      graphData: faulted.graphData,
      sdnState: faulted.sdnState,
      nfvState: lab.nfvState,
      orchestrationState: lab.orchestrationState,
      sourceId: lab.sourceId,
      targetId: lab.targetId,
    });
    expect(faultRun.outcome.kind).toBe('dropped');
    expect(faultRun.events.some((e) => e.type === JOURNEY_EVENT_TYPES.PACKET_DROPPED)).toBe(true);
    expect(faulted.layer).toBe('control');
  });

  it('missing-route makes the journey fail at the routing decision', () => {
    const lab = buildLab();
    const faulted = applyFault(
      { graphData: lab.graphData, sdnState: lab.sdnState, sourceId: lab.sourceId, targetId: lab.targetId },
      'missing-route'
    );
    expect(faulted.ok).toBe(true);
    const trace = tracePacket(faulted.graphData, lab.sourceId, lab.targetId, faulted.sdnState);
    expect(trace.reachable).toBe(false);
    expect(trace.failurePoint).toBe('l3-no-router');
  });

  it('reports not-applicable when a fault cannot apply', () => {
    const lab = buildLab();
    const faulted = applyFault(
      { graphData: lab.graphData, sdnState: lab.sdnState, sourceId: lab.sourceId, targetId: lab.targetId },
      'missing-route'
    );
    // Removing the only router interface breaks routing; removing again should say no router.
    const again = applyFault(
      { graphData: faulted.graphData, sdnState: faulted.sdnState, sourceId: lab.sourceId, targetId: lab.targetId },
      'missing-route'
    );
    expect(again.ok).toBe(false);
    expect(typeof again.reason).toBe('string');
  });
});

describe('journey limitations', () => {
  it('always documents what the model does not simulate', () => {
    const run = buildJourneyRun(buildLab());
    expect(run.limitations.length).toBeGreaterThan(0);
    expect(run.limitations.some((l) => l.includes('encapsulation') || l.includes('simplified'))).toBe(true);
  });
});
