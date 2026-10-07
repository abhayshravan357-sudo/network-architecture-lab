/**
 * NFV Engine — pure, deterministic logic for the NFV stage.
 *
 * The student takes physical network functions (firewall, router,
 * NAT…) and virtualizes them as VNFs deployed on server hosts,
 * then orders them into service chains that traffic traverses.
 *
 * No real virtualization — logical simulation of placement,
 * chaining, and validation.
 */

import { NetworkGraph } from '../graph/graphModel.js';
import { VNF_MAP } from '../../data/vnfs/vnfCatalog.js';

/**
 * Deploy a VNF onto a host node.
 * Only server-class nodes can host VNFs.
 *
 * @param {string} vnfId
 * @param {string} hostNodeId
 * @param {{ nodes: Array, edges: Array }} graphData
 * @returns {{ ok: boolean, deployment?: Object, error?: string }}
 */
export function deployVNF(vnfId, hostNodeId, graphData) {
  const vnf = VNF_MAP[vnfId];
  if (!vnf) return { ok: false, error: `Unknown VNF: ${vnfId}` };

  const graph = NetworkGraph.fromJSON(graphData);
  const host = graph.getNode(hostNodeId);
  if (!host) return { ok: false, error: `Host node not found: ${hostNodeId}` };
  if (host.type !== 'server') {
    return { ok: false, error: `${host.type} cannot host VNFs — only servers can` };
  }

  return {
    ok: true,
    deployment: {
      id: `dep-${vnfId}-${hostNodeId}`,
      vnfId,
      hostNodeId,
      resources: { cpu: vnf.cpu, memory: vnf.memory, throughput: vnf.throughput },
    },
  };
}

/**
 * Build a service chain: an ordered list of deployed VNFs that
 * traffic passes through, in order.
 *
 * @param {Array} deployments  [{ id, vnfId, hostNodeId }]
 * @param {Array} order        deployment ids in traversal order
 * @returns {{ chain: Array, valid: boolean, errors: Array }}
 */
export function buildServiceChain(deployments, order) {
  const byId = Object.fromEntries(deployments.map((d) => [d.id, d]));
  const errors = [];
  const chain = [];

  for (const depId of order) {
    const dep = byId[depId];
    if (!dep) {
      errors.push(`Unknown deployment: ${depId}`);
      continue;
    }
    if (chain.some((c) => c.id === dep.id)) {
      errors.push(`${dep.vnfId} appears twice in the chain`);
      continue;
    }
    chain.push({ id: dep.id, vnfId: dep.vnfId, hostNodeId: dep.hostNodeId });
  }

  // Chaining rules: inspection functions (vFirewall/vIDS) should come
  // before distribution functions (vLoadBalancer/vProxy) — traffic is
  // inspected, then distributed.
  const guardIndex = chain.findIndex((c) => ['vFirewall', 'vIDS'].includes(c.vnfId));
  const distIndex = chain.findIndex((c) => ['vLoadBalancer', 'vProxy'].includes(c.vnfId));
  if (guardIndex !== -1 && distIndex !== -1 && guardIndex > distIndex) {
    errors.push('Inspection VNFs (vFirewall, vIDS) should precede distribution VNFs (vLoadBalancer, vProxy)');
  }

  return { chain, valid: errors.length === 0, errors };
}

/**
 * Score the NFV design against the scenario's virtualization
 * opportunities and the student's placement/chain decisions.
 *
 * @param {{ nodes: Array, edges: Array }} graphData
 * @param {{ deployments: Array, serviceChain: Array }} nfvState
 * @param {{ vnfOpportunities?: Array }} scenario
 */
export function scoreNFV(graphData, nfvState, scenario) {
  const graph = NetworkGraph.fromJSON(graphData);
  const servers = graph.getNodesByType('server');
  const opportunities = scenario?.vnfOpportunities ?? [];

  // 1. Opportunity coverage: which suggested virtualizations were done
  // Opportunities are matched to catalog VNFs by the physical
  // function they replace (e.g. firewall -> vFirewall).
  const opportunityVnfIds = (scenario?.vnfOpportunities ?? []).map((opp) => {
    const match = Object.values(VNF_MAP).find((v) => v.replaces === opp.replaces);
    return match?.id ?? null;
  }).filter(Boolean);
  const deployedVnfIds = new Set((nfvState?.deployments ?? []).map((d) => d.vnfId));
  const covered = opportunityVnfIds.filter((vnfId) => deployedVnfIds.has(vnfId));
  const opportunityScore =
    opportunityVnfIds.length === 0 ? 100 : Math.round((covered.length / opportunityVnfIds.length) * 100);

  // 2. Placement validity: all deployments on servers
  const deployments = nfvState?.deployments ?? [];
  const validPlacements = deployments.filter((d) => {
    const host = graph.getNode(d.hostNodeId);
    return host?.type === 'server';
  });
  const placementScore =
    deployments.length === 0 ? 0 : Math.round((validPlacements.length / deployments.length) * 100);

  // 3. Chain quality: a non-empty, valid, ordered chain
  const chain = nfvState?.serviceChain ?? [];
  let chainScore = 0;
  if (chain.length > 0) {
    const { valid, errors } = buildServiceChain(deployments, chain.map((c) => c.id ?? c));
    chainScore = valid ? 100 : Math.max(20, 100 - errors.length * 25);
  }

  // 4. Host capacity sanity: server count vs deployed VNFs
  const capacityScore =
    deployments.length === 0 || servers.length === 0
      ? 0
      : Math.min(100, Math.round((servers.length / Math.max(1, deployments.length)) * 100));

  const overall = Math.round(
    opportunityScore * 0.35 + placementScore * 0.25 + chainScore * 0.25 + capacityScore * 0.15
  );

  return {
    overall,
    opportunities: opportunityScore,
    placement: placementScore,
    chain: chainScore,
    capacity: capacityScore,
    message:
      deployments.length === 0
        ? 'No VNFs deployed yet'
        : `${deployments.length} VNF(s) deployed on ${validPlacements.length} server host(s)`,
  };
}

export default { deployVNF, buildServiceChain, scoreNFV };
