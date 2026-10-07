// SDN engine unit tests — node tests/sdnEngine.test.mjs
import {
  deriveSDNModel,
  generateFlowRules,
  computeReroute,
  scoreSDN,
} from '../src/engine/sdn/sdnEngine.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

// Fixture: pc1,pc2 — sw1 — l3sw1 — router1 — cloud1; server1 on l3sw1;
// redundant link sw2 between l3sw1 and router1 for reroute tests.
const graph = {
  nodes: [
    { id: 'pc1', type: 'pc', config: { vlan: 30 } },
    { id: 'pc2', type: 'pc', config: { vlan: 30 } },
    { id: 'server1', type: 'server', config: { services: ['dhcp', 'dns'] } },
    { id: 'sw1', type: 'l2Switch', config: { vlans: [30] } },
    { id: 'sw2', type: 'l2Switch', config: { vlans: [30] } },
    { id: 'l3sw1', type: 'l3Switch', config: { vlans: [10, 30, 40] } },
    { id: 'router1', type: 'router', config: {} },
    { id: 'cloud1', type: 'cloud', config: {} },
  ],
  edges: [
    { id: 'e1', source: 'pc1', target: 'sw1' },
    { id: 'e2', source: 'pc2', target: 'sw1' },
    { id: 'e3', source: 'sw1', target: 'l3sw1' },
    { id: 'e4', source: 'server1', target: 'l3sw1' },
    { id: 'e5', source: 'l3sw1', target: 'router1' },
    { id: 'e6', source: 'router1', target: 'cloud1' },
    // redundancy: sw2 as an alternate path l3sw1 - sw2 - router1
    { id: 'e7', source: 'l3sw1', target: 'sw2' },
    { id: 'e8', source: 'sw2', target: 'router1' },
  ],
};

// ── deriveSDNModel ──────────────────────────────────────────────
const model = deriveSDNModel(graph);
check('derive: controller manages 3 switches', model.controller.manages.length === 3);
check('derive: control edges = switch count', model.controlEdges.length === 3);
check('derive: control edges originate at controller',
  model.controlEdges.every((e) => e.source === 'sdn-controller'));
check('derive: 3 endpoints in data plane', model.dataPlane.endpoints.length === 3);

// ── generateFlowRules ─────────────────────────────────────────────
const rules = generateFlowRules(graph);
check('flow: rules generated for endpoints', rules.length >= 3);
check('flow: every rule targets a switch',
  rules.every((r) => ['sw1', 'sw2', 'l3sw1'].includes(r.switchId)));
check('flow: rules carry match + forward action',
  rules.every((r) => r.match && r.match.source && r.action.type === 'forward'));
const pc1Rules = rules.filter((r) => r.match.source === 'pc1');
check('flow: pc1 rules traverse sw1 and l3sw1',
  pc1Rules.some((r) => r.switchId === 'sw1') && pc1Rules.some((r) => r.switchId === 'l3sw1'));
check('flow: vlan from endpoint config is matched',
  pc1Rules.every((r) => r.match.vlan === 30));

// ── computeReroute ────────────────────────────────────────────────
// Fail the primary l3sw1-router1 link (e5): sw2 path should reroute.
const reroute = computeReroute(graph, 'e5');
check('reroute: e5 failure affects pc1→cloud path',
  reroute.affectedPaths.some((p) => p.from === 'pc1' && p.to === 'cloud1'));
check('reroute: pc1→cloud rerouted via sw2',
  reroute.rerouted.some((r) =>
    r.from === 'pc1' && r.to === 'cloud1' && r.newPath.includes('sw2')));
check('reroute: new flow rules produced', reroute.newFlowRules.length > 0);

// Fail a leaf link (e1): pc1 becomes unreachable, not rerouted.
const leafFail = computeReroute(graph, 'e1');
check('reroute: leaf failure leaves pc1 unreachable',
  leafFail.unreachable.some((u) => u.from === 'pc1'));

// Unknown edge: no impact.
const noop = computeReroute(graph, 'does-not-exist');
check('reroute: unknown edge is a no-op', noop.affectedPaths.length === 0);

// ── scoreSDN ────────────────────────────────────────────────────
const full = scoreSDN(graph, {
  controllerPlaced: true,
  flowRules: rules,
  reroute,
});
check('score: full SDN transformation scores high', full.overall >= 80);
check('score: coverage 100 when controller placed', full.coverage === 100);

const empty = scoreSDN(graph, { controllerPlaced: false, flowRules: [], reroute: null });
check('score: no controller scores low', empty.overall < 50);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
