import { scaleInstance, applyLoad } from '../../engine/orchestration/orchestratorEngine.js';

/**
 * Pure calculation behind the simulation stage's "Scale VNFs" response.
 * Preserves the original handler semantics: no running instances -> observe;
 * otherwise double each instance's resources, re-apply the current simulated
 * load with the established 800 adjustment clamped at zero, and resolve as
 * 'scale' when no instance remains overloaded, 'scale-insufficient' otherwise.
 * @param {Array} instances non-removed orchestrated VNF instances
 * @param {number} currentLoad current simulated load (orchestrationState.load)
 * @returns {{ applied: Array, responseKind: 'observe' | 'scale' | 'scale-insufficient' }}
 */
export function resolveScaleResponse(instances, currentLoad) {
  if (!instances || instances.length === 0) {
    return { applied: [], responseKind: 'observe' };
  }
  const scaled = instances.map((i) => scaleInstance(i));
  const applied = applyLoad(scaled, Math.max(0, currentLoad - 800));
  const stillOverloaded = applied.some((i) => (i.load ?? 0) > i.throughput);
  return {
    applied,
    responseKind: stillOverloaded ? 'scale-insufficient' : 'scale',
  };
}
