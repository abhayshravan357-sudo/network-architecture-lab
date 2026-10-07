// Orchestration engine unit tests — node tests/orchestratorEngine.test.mjs
import {
  instantiate,
  scaleInstance,
  removeInstance,
  migrateInstance,
  applyLoad,
  poolHealth,
  scoreOrchestration,
} from '../src/engine/orchestration/orchestratorEngine.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

// ── instantiate ───────────────────────────────────────────────────
const fw = instantiate('vFirewall', 'server1');
check('instantiate: state running', fw.state === 'running');
check('instantiate: carries catalog resources', fw.cpu === 4 && fw.memory === 8 && fw.throughput === 1000);
check('instantiate: unique ids', instantiate('vFirewall', 'server1').id !== fw.id);

// ── scale ─────────────────────────────────────────────────────────
const scaled = scaleInstance(fw);
check('scale: doubles cpu/memory/throughput',
  scaled.cpu === 8 && scaled.memory === 16 && scaled.throughput === 2000);
check('scale: state becomes scaled', scaled.state === 'scaled');

// ── remove / migrate ────────────────────────────────────────────
const removed = removeInstance(fw);
check('remove: state removed, load zeroed', removed.state === 'removed' && removed.load === 0);

const migrated = migrateInstance(fw, 'server2');
check('migrate: host changes, state migrated',
  migrated.hostNodeId === 'server2' && migrated.state === 'migrated');

// ── applyLoad / utilization ─────────────────────────────────────
const under = applyLoad([fw], 500);
check('load: 500/1000 utilization is ok', under[0].status === 'ok' && under[0].utilization === 0.5);

const warn = applyLoad([fw], 800);
check('load: 800/1000 utilization is warning', warn[0].status === 'warning');

const over = applyLoad([fw], 1500);
check('load: 1500/1000 utilization is overloaded', over[0].status === 'overloaded');

// Removed instances are skipped by applyLoad.
const withRemoved = applyLoad([fw, removed], 100);
check('load: removed instances untouched', withRemoved[1].state === 'removed' && withRemoved[1].load === 0);

// Scaled instance tolerates proportionally more load.
const scaledOk = applyLoad([scaled], 1500);
check('load: scaled instance handles 1500/2000 without overload',
  scaledOk[0].status !== 'overloaded');
check('load: same load overloads the unscaled instance',
  applyLoad([fw], 1500)[0].status === 'overloaded');

// ── poolHealth ──────────────────────────────────────────────────
const healthy = poolHealth(applyLoad([fw, instantiate('vRouter', 'server1')], 100));
check('health: healthy pool reports ok', healthy.status === 'ok' && healthy.overloaded === 0);

const sick = poolHealth(applyLoad([fw, instantiate('vRouter', 'server1')], 1500));
check('health: overloaded pool reports overloaded', sick.status === 'overloaded' && sick.overloaded >= 1);

check('health: empty pool reports empty', poolHealth([]).status === 'empty');

// ── scoreOrchestration ──────────────────────────────────────────
const goodInstances = applyLoad(
  [scaled, instantiate('vLoadBalancer', 'server2')],
  1500
);
const goodScore = scoreOrchestration(goodInstances, {
  actions: [
    { kind: 'scale', instanceId: scaled.id },
    { kind: 'migrate', instanceId: goodInstances[1].id },
    { kind: 'remove', instanceId: 'unused' },
  ],
  load: 1500,
});
check('score: healthy scaled pool scores high', goodScore.overall >= 80);
check('score: stability 100 when nothing overloaded', goodScore.stability === 100);

const badInstances = applyLoad([fw, instantiate('vRouter', 'server1')], 1500);
const badScore = scoreOrchestration(badInstances, { actions: [], load: 1500 });
check('score: overloaded pool with no scaling scores low', badScore.overall < 60);

check('score: no instances scores 0',
  scoreOrchestration([], {}).overall === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
