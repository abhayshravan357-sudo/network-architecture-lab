// Phase 2 MVP engine verification — runnable with: node tests/pingEngine.test.mjs
import assert from 'node:assert/strict';
import {
  createTopology,
  addDevice,
  addLink,
  removeLink,
  updateDevice,
} from '../src/engine/topology/topologyModel.js';
import { runPing } from '../src/engine/simulation/ping.js';
import { ValidationEngine } from '../src/engine/validation/validationEngine.js';
import { applyEvent } from '../src/engine/simulation/simulationEngine.js';

/** Adapt topologyModel shapes to NetworkGraph shapes. */
function toGraph(t) {
  return {
    nodes: t.devices.map((d) => ({
      id: d.id,
      type: d.type === 'switch' ? 'l2Switch' : d.type,
      config: d,
    })),
    edges: t.links.map((l) => ({
      id: l.id,
      source: l.source.deviceId,
      target: l.target.deviceId,
      connectionType: l.type,
    })),
  };
}

function buildLab() {
  const t = createTopology();
  const pc1 = addDevice(t, {
    type: 'pc', name: 'PC1', ip: '192.168.1.10', mask: '255.255.255.0', x: 0, y: 0,
  });
  const sw = addDevice(t, { type: 'switch', name: 'Switch1', x: 200, y: 0 });
  const pc2 = addDevice(t, {
    type: 'pc', name: 'PC2', ip: '192.168.1.11', mask: '255.255.255.0', x: 400, y: 0,
  });
  addLink(t, pc1.id, sw.id);
  addLink(t, sw.id, pc2.id);
  return { t, pc1, sw, pc2 };
}

// --- Positive path ---
{
  const { t, pc1, pc2 } = buildLab();
  const result = runPing(t, pc1.id, pc2.id);
  assert.equal(result.success, true, 'same-subnet ping must succeed');
  assert.deepEqual(result.path, [pc1.id, t.devices[1].id, pc2.id], 'path must be PC1->Switch->PC2');
  const types = result.events.map((e) => e.packetType);
  assert.ok(types.includes('arp-request'), 'ARP request event missing');
  assert.ok(types.includes('arp-reply'), 'ARP reply event missing');
  assert.ok(types.includes('icmp-echo'), 'ICMP echo request event missing');
  assert.ok(types.includes('icmp-reply'), 'ICMP echo reply event missing');
  assert.ok(result.steps.length >= 6, 'animation steps missing');
  console.log('PASS positive: ping succeeds, 4 packet types simulated, path = PC1->Switch->PC2');
}

// --- Negative A: removed link ---
{
  const { t, pc1, pc2 } = buildLab();
  removeLink(t, t.links[1].id);
  const result = runPing(t, pc1.id, pc2.id);
  assert.equal(result.success, false);
  assert.equal(result.reason, 'No link path between devices');
  console.log('PASS negative A: removed link -> "No link path between devices"');
}

// --- Negative B: different subnet ---
{
  const { t, pc1, pc2 } = buildLab();
  updateDevice(t, pc2.id, { ip: '192.168.2.11' });
  const result = runPing(t, pc1.id, pc2.id);
  assert.equal(result.success, false);
  assert.equal(result.reason, 'No route to destination (router not in topology)');
  console.log('PASS negative B: different subnet -> "No route to destination (router not in topology)"');
}

// --- Negative C: duplicate IP ---
{
  const { t, pc1, pc2 } = buildLab();
  updateDevice(t, pc2.id, { ip: '192.168.1.10' });
  const result = runPing(t, pc1.id, pc2.id);
  assert.equal(result.success, false);
  assert.equal(result.reason, 'Duplicate IP address');
  console.log('PASS negative C: duplicate IP -> "Duplicate IP address"');
}

// --- Mission validation (scenario requirement checks) ---
{
  const { t, pc1, pc2 } = buildLab();
  const ping = runPing(t, pc1.id, pc2.id);
  assert.equal(ping.success, true, 'ping succeeds on correct topology');
  const scenario = {
    id: 'first-ping',
    validationRules: [
      { id: 'pcs-on-switch', check: 'pcs-reachable-from-switch', weight: 100 },
    ],
  };
  const verdict = new ValidationEngine(scenario, toGraph(t)).run();
  assert.equal(verdict.passed, true, 'mission must pass on correct topology');
  assert.equal(verdict.scores.overall, 100);
  // Wrong topology: no switch -> mission must fail
  const t2 = createTopology();
  const a = addDevice(t2, { type: 'pc', name: 'PC1', ip: '192.168.1.10', mask: '255.255.255.0' });
  const b = addDevice(t2, { type: 'pc', name: 'PC2', ip: '192.168.1.11', mask: '255.255.255.0' });
  addLink(t2, a.id, b.id);
  const ping2 = runPing(t2, a.id, b.id);
  assert.equal(ping2.success, true, 'direct PC-PC ping still succeeds at engine level');
  assert.equal(
    new ValidationEngine(scenario, toGraph(t2)).run().passed,
    false,
    'mission must require a switch'
  );
  console.log('PASS mission: correct topology scores 100; PC-PC without switch fails mission check');
}

// --- Engine contracts ---
{
  const { t } = buildLab();
  const surge = applyEvent(toGraph(t), 'traffic-surge', { multiplier: 5 });
  assert.equal(surge.impact, 'high');
  assert.equal(surge.details.multiplier, 5);
  const scenario = {
    id: 'lab',
    validationRules: [
      { id: 'pcs-on-switch', check: 'pcs-reachable-from-switch', weight: 50 },
      { id: 'pcs-connected', check: 'type-connected', deviceType: 'pc', weight: 50 },
    ],
  };
  const v = new ValidationEngine(scenario, toGraph(t)).run();
  assert.equal(v.scores.overall, 100, 'lab topology satisfies design contract');
  assert.ok(Array.isArray(v.checks) && Array.isArray(v.concepts), 'result shape preserved');
  console.log('PASS contracts: applyEvent + ValidationEngine shapes preserved (both design shapes)');
}

console.log('\nAll engine tests passed.');
