// NFV engine unit tests — node tests/nfvEngine.test.mjs
import { deployVNF, buildServiceChain, scoreNFV } from '../src/engine/nfv/nfvEngine.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

const graph = {
  nodes: [
    { id: 'server1', type: 'server', config: {} },
    { id: 'server2', type: 'server', config: {} },
    { id: 'pc1', type: 'pc', config: {} },
    { id: 'sw1', type: 'l2Switch', config: {} },
  ],
  edges: [
    { id: 'e1', source: 'pc1', target: 'sw1' },
    { id: 'e2', source: 'sw1', target: 'server1' },
    { id: 'e3', source: 'sw1', target: 'server2' },
  ],
};

// ── deployVNF ───────────────────────────────────────────────────
const ok = deployVNF('vFirewall', 'server1', graph);
check('deploy: VNF on server succeeds', ok.ok === true);
check('deploy: deployment carries catalog resources',
  ok.deployment.resources.cpu > 0 && ok.deployment.resources.throughput > 0);

const onPc = deployVNF('vFirewall', 'pc1', graph);
check('deploy: PC cannot host VNFs', onPc.ok === false);

const badVnf = deployVNF('vDoesNotExist', 'server1', graph);
check('deploy: unknown VNF rejected', badVnf.ok === false);

const badHost = deployVNF('vFirewall', 'nope', graph);
check('deploy: unknown host rejected', badHost.ok === false);

// ── buildServiceChain ───────────────────────────────────────────
const deployments = [
  ok.deployment,
  deployVNF('vLoadBalancer', 'server2', graph).deployment,
  deployVNF('vIDS', 'server2', graph).deployment,
];

const good = buildServiceChain(deployments, [
  deployments[0].id,  // vFirewall
  deployments[2].id,  // vIDS
  deployments[1].id,  // vLoadBalancer
]);
check('chain: inspection-before-distribution is valid', good.valid === true);
check('chain: chain preserves requested order',
  good.chain.map((c) => c.vnfId).join(',') === 'vFirewall,vIDS,vLoadBalancer');

const reversed = buildServiceChain(deployments, [
  deployments[1].id,  // vLoadBalancer first
  deployments[0].id,  // vFirewall after
]);
check('chain: distribution-before-inspection is flagged', reversed.valid === false);

const dup = buildServiceChain(deployments, [deployments[0].id, deployments[0].id]);
check('chain: duplicate deployment flagged', dup.valid === false);

const empty = buildServiceChain(deployments, []);
check('chain: empty chain is valid but empty', empty.valid === true && empty.chain.length === 0);

// ── scoreNFV ──────────────────────────────────────────────────────
const scenario = {
  vnfOpportunities: [
    { id: 'vnf-firewall', replaces: 'firewall', label: 'vFirewall' },
    { id: 'vnf-dhcp', replaces: 'dhcp-server', label: 'vDHCP' },
  ],
};

const scored = scoreNFV(graph, {
  deployments,
  serviceChain: good.chain,
}, scenario);
check('score: deployments on servers score placement 100', scored.placement === 100);
check('score: valid chain scores chain 100', scored.chain === 100);
check('score: overall reflects partial opportunity coverage',
  scored.overall > 0 && scored.overall < 100);

const none = scoreNFV(graph, { deployments: [], serviceChain: [] }, scenario);
check('score: empty NFV design scores 0', none.overall === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
