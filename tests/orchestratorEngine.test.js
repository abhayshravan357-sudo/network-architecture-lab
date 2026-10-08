import { describe, it, expect } from 'vitest';
import { instantiate, scaleInstance, migrateInstance, removeInstance, applyLoad, poolHealth, scoreOrchestration } from '../src/engine/orchestration/orchestratorEngine.js';

describe('orchestratorEngine', () => {
  it('instantiates a VNF with default state', () => {
    const instance = instantiate('vFirewall', 'server1');
    expect(instance.vnfId).toBe('vFirewall');
    expect(instance.hostNodeId).toBe('server1');
    expect(instance.state).toBe('running');
    expect(instance.load).toBe(0);
  });

  it('scales instance resources by factor', () => {
    const instance = scaleInstance({ ...instantiate('vFirewall', 'server1'), cpu: 4, memory: 8, throughput: 1000 });
    expect(instance.cpu).toBe(8);
    expect(instance.memory).toBe(16);
    expect(instance.throughput).toBe(2000);
    expect(instance.state).toBe('scaled');
  });

  it('migrates instance to a new host', () => {
    const instance = migrateInstance(instantiate('vFirewall', 'server1'), 'server2');
    expect(instance.hostNodeId).toBe('server2');
    expect(instance.state).toBe('migrated');
  });

  it('removes instance without deleting other state', () => {
    const instance = removeInstance({ ...instantiate('vFirewall', 'server1'), cpu: 4 });
    expect(instance.state).toBe('removed');
    expect(instance.cpu).toBe(4);
  });

  it('computes utilization and warns when overloaded', () => {
    const instances = applyLoad([instantiate('vFirewall', 'server1')], 1500);
    expect(instances[0].status).toBe('overloaded');
    expect(instances[0].utilization).toBeGreaterThan(1);
  });

  it('reports pool health from active instances', () => {
    const instances = applyLoad([instantiate('vFirewall', 'server1'), instantiate('vIDS', 'server2')], 800);
    const health = poolHealth(instances);
    expect(health.active).toBe(2);
  });

  it('scores orchestration higher when scaling is used under overload', () => {
    const instances = applyLoad([instantiate('vFirewall', 'server1')], 1500);
    const scaled = scoreOrchestration([scaleInstance(instances[0])], { actions: [{ kind: 'scale', instanceId: 'x' }], load: 1500 });
    const unscaled = scoreOrchestration(instances, { actions: [], load: 1500 });
    expect(scaled.overall).toBeGreaterThan(unscaled.overall);
  });
});
