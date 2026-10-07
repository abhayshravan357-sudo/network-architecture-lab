/**
 * Orchestrator Engine — pure, deterministic VNF lifecycle
 * and resource management.
 *
 * The orchestrator deploys, scales, removes, and migrates
 * VNF instances, and allocates logical resources (CPU units,
 * memory units, throughput capacity). Under load it reports
 * utilization so the student learns when to scale.
 */

import { VNF_MAP } from '../../data/vnfs/vnfCatalog.js';

let instanceSeq = 0;

/**
 * Instantiate a VNF on a host.
 * @param {string} vnfId
 * @param {string} hostNodeId
 * @returns VNF instance
 */
export function instantiate(vnfId, hostNodeId) {
  const vnf = VNF_MAP[vnfId];
  if (!vnf) throw new Error(`Unknown VNF: ${vnfId}`);
  instanceSeq += 1;
  return {
    id: `vnf-inst-${instanceSeq}`,
    vnfId,
    name: vnf.name,
    hostNodeId,
    cpu: vnf.cpu,
    memory: vnf.memory,
    throughput: vnf.throughput,
    /** current offered load (concurrent users) */
    load: 0,
    utilization: 0,
    status: 'ok',
    state: 'running',
    lifecycle: [...vnf.lifecycle],
  };
}

/**
 * Scale an instance by a factor (doubles by default).
 * @param {Object} instance
 * @param {number} factor
 */
export function scaleInstance(instance, factor = 2) {
  if (instance.state === 'removed') {
    return { ...instance, error: 'Cannot scale a removed instance' };
  }
  return {
    ...instance,
    cpu: instance.cpu * factor,
    memory: instance.memory * factor,
    throughput: instance.throughput * factor,
    state: 'scaled',
  };
}

/**
 * Remove an instance (lifecycle terminate).
 */
export function removeInstance(instance) {
  return { ...instance, state: 'removed', load: 0 };
}

/**
 * Migrate an instance to another host.
 */
export function migrateInstance(instance, newHostNodeId) {
  if (instance.state === 'removed') {
    return { ...instance, error: 'Cannot migrate a removed instance' };
  }
  return { ...instance, hostNodeId: newHostNodeId, state: 'migrated' };
}

/**
 * Apply offered load to instances and compute utilization.
 * utilization = load / throughput; status thresholds:
 *   < 0.7 ok, 0.7–1.0 warning, > 1.0 overloaded
 *
 * @param {Array} instances
 * @param {number} load concurrent users offered to each instance
 */
export function applyLoad(instances, load) {
  return instances.map((inst) => {
    if (inst.state === 'removed') return inst;
    const utilization = inst.throughput === 0 ? 0 : load / inst.throughput;
    const status =
      utilization > 1 ? 'overloaded' : utilization >= 0.7 ? 'warning' : 'ok';
    return { ...inst, load, utilization, status };
  });
}

/**
 * Aggregate health of an instance pool.
 */
export function poolHealth(instances) {
  const active = instances.filter((i) => i.state !== 'removed');
  if (active.length === 0) return { status: 'empty', overloaded: 0, active: 0 };
  const overloaded = active.filter((i) => i.status === 'overloaded').length;
  const avgUtil =
    active.reduce((sum, i) => sum + (i.utilization ?? 0), 0) / active.length;
  return {
    status: overloaded > 0 ? 'overloaded' : avgUtil >= 0.7 ? 'warning' : 'ok',
    overloaded,
    active: active.length,
    avgUtilization: Math.round(avgUtil * 100),
  };
}

/**
 * Score orchestration quality:
 *  - no overloaded instances under the simulated load
 *  - scaling was applied when needed
 *  - lifecycle actions were exercised (scale/migrate/remove)
 *
 * @param {Array} instances
 * @param {{ actions: Array, load: number }} orchestrationState
 */
export function scoreOrchestration(instances, orchestrationState = {}) {
  const active = instances.filter((i) => i.state !== 'removed');
  if (active.length === 0) {
    return { overall: 0, stability: 0, scaling: 0, lifecycle: 0, message: 'No VNF instances running' };
  }

  const overloaded = active.filter((i) => (i.utilization ?? 0) > 1).length;
  const stability = Math.round(((active.length - overloaded) / active.length) * 100);

  const actions = orchestrationState.actions ?? [];
  const scaled = active.filter((i) => i.state === 'scaled').length;
  const needsScaling = active.some((i) => (i.utilization ?? 0) > 0.7);
  const scalingScore = needsScaling
    ? (scaled > 0 ? 100 : 30)
    : 100;

  const kinds = new Set(actions.map((a) => a.kind));
  const lifecycleScore = Math.min(100, (kinds.size / 3) * 100 + (kinds.size > 0 ? 20 : 0));

  const overall = Math.round(stability * 0.5 + scalingScore * 0.3 + lifecycleScore * 0.2);
  return {
    overall,
    stability,
    scaling: scalingScore,
    lifecycle: lifecycleScore,
    message:
      overloaded > 0
        ? `${overloaded} instance(s) overloaded — scale them`
        : 'All instances healthy under load',
  };
}

export default {
  instantiate,
  scaleInstance,
  removeInstance,
  migrateInstance,
  applyLoad,
  poolHealth,
  scoreOrchestration,
};
