// Simulation engine unit tests — node tests/simulationEngine.test.mjs
import { applyEvent, scoreSimulation } from '../src/engine/simulation/simulationEngine.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

const graph = {
  nodes: [
    { id: 'pc1', type: 'pc', config: {} },
    { id: 'pc2', type: 'pc', config: {} },
    { id: 'server1', type: 'server', config: {} },
    { id: 'sw1', type: 'l2Switch', config: {} },
    { id: 'router1', type: 'router', config: {} },
    { id: 'cloud1', type: 'cloud', config: {} },
  ],
  edges: [
    { id: 'e1', source: 'pc1', target: 'sw1' },
    { id: 'e2', source: 'pc2', target: 'sw1' },
    { id: 'e3', source: 'sw1', target: 'router1' },
    { id: 'e4', source: 'router1', target: 'server1' },
    { id: 'e5', source: 'router1', target: 'cloud1' },
  ],
};

// ── node-failure ────────────────────────────────────────────────
const nodeFail = applyEvent(graph, 'node-failure', { nodeId: 'router1' });
check('node-failure: critical when connectivity is lost', nodeFail.impact === 'critical');
check('node-failure: pc1 and pc2 affected',
  nodeFail.details.affectedNodes.includes('pc1') && nodeFail.details.affectedNodes.includes('pc2'));
check('node-failure: graphAfter excludes router1',
  !nodeFail.graphAfter.nodes.some((n) => n.id === 'router1'));
check('node-failure: edges to router1 removed',
  nodeFail.graphAfter.edges.every((e) => e.source !== 'router1' && e.target !== 'router1'));
check('node-failure: original graph untouched (pure)',
  graph.nodes.some((n) => n.id === 'router1'));

const unknownNode = applyEvent(graph, 'node-failure', { nodeId: 'nope' });
check('node-failure: unknown node is a no-op', unknownNode.impact === 'low');

// ── link-failure ────────────────────────────────────────────────
const linkFail = applyEvent(graph, 'link-failure', { edgeId: 'e3' });
check('link-failure: critical when pc→server paths break', linkFail.impact === 'critical');
check('link-failure: broken paths detected for both PCs',
  linkFail.details.brokenPaths.length === 2);
check('link-failure: graphAfter excludes edge e3',
  !linkFail.graphAfter.edges.some((e) => e.id === 'e3'));

const unknownEdge = applyEvent(graph, 'link-failure', { edgeId: 'nope' });
check('link-failure: unknown edge is a no-op', unknownEdge.impact === 'low');

// ── traffic-surge ───────────────────────────────────────────────
const vnfInstances = [
  { id: 'vnf-inst-1', vnfId: 'vFirewall', load: 100, throughput: 1000 },
];
const surge = applyEvent(graph, 'traffic-surge', { vnfInstances, multiplier: 5 });
check('traffic-surge: load multiplied on VNFs',
  surge.details.affectedVnfs[0].newLoad === 500);
check('traffic-surge: endpoint count reported', surge.details.affectedEndpoints === 3);
check('traffic-surge: graph unchanged', surge.graphAfter.nodes.length === graph.nodes.length);

// ── security-event ──────────────────────────────────────────────
const sec = applyEvent(graph, 'security-event', { sourceVlan: 'students', targetVlan: 'administration' });
check('security-event: attempt blocked', sec.details.blocked === true);
check('security-event: segments named in details',
  sec.details.sourceVlan === 'students' && sec.details.targetVlan === 'administration');

// ── user-growth ─────────────────────────────────────────────────
const growth = applyEvent(graph, 'user-growth', { newUsers: 5000, vnfInstances });
check('user-growth: high impact when capacity exceeded', growth.impact === 'high');
check('user-growth: capacity computed from VNFs', growth.details.vnfCapacity === 1000);

const growthOk = applyEvent(graph, 'user-growth', { newUsers: 100, vnfInstances });
check('user-growth: moderate when capacity suffices', growthOk.impact === 'moderate');

// ── resource-shortage ───────────────────────────────────────────
const shortage = applyEvent(graph, 'resource-shortage', { vnfId: 'vFirewall', vnfInstances });
check('resource-shortage: high impact on deployed VNF', shortage.impact === 'high');
const shortageNone = applyEvent(graph, 'resource-shortage', { vnfId: 'vIDS', vnfInstances });
check('resource-shortage: low impact when VNF absent', shortageNone.impact === 'low');

// ── scoreSimulation ─────────────────────────────────────────────
const events = [
  { eventId: 'node-failure', resolved: true, responseKind: 'reroute' },
  { eventId: 'traffic-surge', resolved: true, responseKind: 'scale' },
  { eventId: 'security-event', resolved: false, responseKind: 'ignore' },
];
const simScore = scoreSimulation(events);
check('score: 2/3 resolved gives 67-ish response score', simScore.response === 67);
check('score: three event kinds give 75 coverage', simScore.coverage === 75);

const allKinds = scoreSimulation([
  ...events,
  { eventId: 'link-failure', resolved: true, responseKind: 'reroute' },
]);
check('score: four event kinds give full coverage', allKinds.coverage === 100);

check('score: no events scores 0', scoreSimulation([]).overall === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
