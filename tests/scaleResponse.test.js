import { describe, it, expect } from 'vitest';
import { resolveScaleResponse } from '../src/components/simulation/scaleResponse.js';

describe('resolveScaleResponse', () => {
  const instance = {
    id: 'vnf-inst-1',
    vnfId: 'vFirewall',
    hostNodeId: 'server1',
    cpu: 2,
    memory: 4,
    throughput: 500,
    load: 100,
    utilization: 0.2,
    status: 'ok',
    state: 'running',
  };

  it('scales running instances and applies the adjusted simulated load', () => {
    const second = { ...instance, id: 'vnf-inst-2' };
    const { applied, responseKind } = resolveScaleResponse(
      [instance, second],
      1000
    );

    expect(applied).toHaveLength(2);
    expect(applied[0].cpu).toBe(4);
    expect(applied[0].memory).toBe(8);
    expect(applied[0].throughput).toBe(1000);
    expect(applied[0].state).toBe('scaled');
    expect(applied[0].load).toBe(200);
    expect(applied[0].utilization).toBe(0.2);
    expect(applied[0].status).toBe('ok');
    expect(applied[1].load).toBe(200);
    expect(responseKind).toBe('scale');
  });

  it('resolves scale-insufficient when a scaled instance remains overloaded', () => {
    const { applied, responseKind } = resolveScaleResponse([instance], 2000);

    expect(applied[0].load).toBe(1200);
    expect(applied[0].utilization).toBe(1.2);
    expect(applied[0].status).toBe('overloaded');
    expect(responseKind).toBe('scale-insufficient');
  });

  it('resolves observe without scaling when there are no instances', () => {
    const { applied, responseKind } = resolveScaleResponse([], 1000);

    expect(applied).toEqual([]);
    expect(responseKind).toBe('observe');
  });

  it('clamps the load adjustment at zero below the adjustment threshold', () => {
    const { applied, responseKind } = resolveScaleResponse([instance], 500);

    expect(applied[0].load).toBe(0);
    expect(applied[0].utilization).toBe(0);
    expect(applied[0].status).toBe('ok');
    expect(responseKind).toBe('scale');
  });
});
