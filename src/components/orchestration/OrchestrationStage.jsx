import React, { useMemo, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import {
  instantiate,
  scaleInstance,
  migrateInstance,
  removeInstance,
  applyLoad,
  poolHealth,
  scoreOrchestration,
} from '../../engine/orchestration/orchestratorEngine.js';
import { VNF_MAP } from '../../data/vnfs/vnfCatalog.js';
import { vnfAssets } from '../../assets/assetMap.js';

export default function OrchestrationStage() {
  const graph = useGameStore((s) => s.network.graph);
  const nfvState = useGameStore((s) => s.nfvState);
  const orchestrationState = useGameStore((s) => s.orchestrationState);
  const goToStage = useGameStore((s) => s.goToStage);
  const addInstance = useGameStore((s) => s.addInstance);
  const updateInstance = useGameStore((s) => s.updateInstance);
  const removeInstanceById = useGameStore((s) => s.removeInstanceById);
  const recordOrchestrationAction = useGameStore((s) => s.recordOrchestrationAction);
  const setSimulatedLoad = useGameStore((s) => s.setSimulatedLoad);
  const saveOrchestrationResult = useGameStore((s) => s.saveOrchestrationResult);

  const nodes = graph?.nodes ?? [];
  const servers = nodes.filter((n) => n.type === 'server');
  const deployments = nfvState?.deployments ?? [];
  const instances = orchestrationState?.instances ?? [];
  const actions = orchestrationState?.actions ?? [];
  const load = orchestrationState?.load ?? 0;

  const activeInstances = instances.filter((i) => i.state !== 'removed');
  const health = useMemo(() => poolHealth(activeInstances), [activeInstances]);
  const score = useMemo(
    () => scoreOrchestration(activeInstances, { actions, load }),
    [activeInstances, actions, load]
  );

  const overloaded = useMemo(() => activeInstances.filter((i) => (i.utilization ?? 0) > 1), [activeInstances]);
  const warned = useMemo(() => activeInstances.filter((i) => {
    const util = i.utilization ?? 0;
    return util >= 0.7 && util <= 1;
  }), [activeInstances]);

  if (deployments.length === 0) {
    return (
      <div className="page-inner anim-fade-in">
        <div className="panel config-panel-empty" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Orchestration Stage</div>
          <h2>No VNFs to orchestrate yet</h2>
          <p style={{ color: 'var(--c-text-muted)', margin: '12px 0 24px' }}>
            Deploy VNFs in the NFV stage first — the orchestrator manages their lifecycle.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => goToStage(STAGES.NFV)}>
            ← Back to NFV
          </button>
        </div>
      </div>
    );
  }

  const handleInstantiateAll = () => {
    deployments.forEach((d) => addInstance(instantiate(d.vnfId, d.hostNodeId)));
    recordOrchestrationAction({ kind: 'instantiate', instanceId: 'all', timestamp: Date.now() });
  };

  const applyCurrentLoad = (list, newLoad) => {
    setSimulatedLoad(newLoad);
    applyLoad(list, newLoad).forEach(updateInstance);
  };

  const handleLoadChange = (newLoad) => {
    applyCurrentLoad(instances, Number(newLoad));
  };

  const handleScale = (inst) => {
    const scaled = scaleInstance(inst);
    recordOrchestrationAction({ kind: 'scale', instanceId: inst.id, timestamp: Date.now() });
    applyCurrentLoad(
      instances.map((i) => (i.id === inst.id ? scaled : i)),
      load
    );
  };

  const handleMigrate = (inst, newHost) => {
    const migrated = migrateInstance(inst, newHost);
    recordOrchestrationAction({ kind: 'migrate', instanceId: inst.id, timestamp: Date.now() });
    applyCurrentLoad(
      instances.map((i) => (i.id === inst.id ? migrated : i)),
      load
    );
  };

  const handleRemove = (inst) => {
    const removed = removeInstance(inst);
    recordOrchestrationAction({ kind: 'remove', instanceId: inst.id, timestamp: Date.now() });
    updateInstance(removed);
  };

  const handleAutoRemediate = () => {
    const updated = [...instances];
    let changed = false;

    for (const inst of updated) {
      const util = inst.utilization ?? 0;
      if (util > 1 && inst.state !== 'scaled') {
        updated.splice(updated.indexOf(inst), 1, scaleInstance(inst));
        recordOrchestrationAction({ kind: 'auto-scale', instanceId: inst.id, timestamp: Date.now() });
        changed = true;
      }
    }

    if (changed) {
      applyCurrentLoad(updated, load);
    }
  };

  const statusColor = (status) =>
    status === 'overloaded' ? 'var(--c-danger)' : status === 'warning' ? 'var(--c-warning)' : 'var(--c-success)';

  return (
    <div className="page-inner anim-fade-in">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Modernization Stage — Orchestration</div>
        <h2>Orchestrate the VNFs</h2>
        <p style={{ color: 'var(--c-text-muted)', maxWidth: 640, margin: '10px auto 0' }}>
          Creating VNFs is not enough — an orchestrator deploys, scales, migrates,
          and removes them, and allocates their resources. Watch utilization respond
          to load.
        </p>
      </div>

      {/* Pool health + load control */}
      <div className="panel" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Pool Health</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{
                fontSize: '1.6rem', fontWeight: 800, textTransform: 'uppercase',
                color: health.status === 'ok' ? 'var(--c-success)' : health.status === 'warning' ? 'var(--c-warning)' : health.status === 'overloaded' ? 'var(--c-danger)' : 'var(--c-text-dim)',
              }}>
                {health.status}
              </span>
              <span style={{ color: 'var(--c-text-dim)', fontSize: '0.9rem' }}>
                {health.active} running · {health.overloaded} overloaded{health.avgUtilization != null ? ` · avg ${health.avgUtilization}%` : ''}
              </span>
            </div>
            {(overloaded.length > 0 || warned.length > 0) && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {overloaded.map((inst) => (
                  <div key={inst.id} style={{ fontSize: '0.84rem', color: 'var(--c-danger)' }}>
                    {inst.name} is overloaded — scale or migrate it.
                  </div>
                ))}
                {warned.map((inst) => (
                  <div key={inst.id} style={{ fontSize: '0.84rem', color: 'var(--c-warning)' }}>
                    {inst.name} is under warning load — consider scaling soon.
                  </div>
                ))}
                <button className="btn btn-accent btn-sm" onClick={handleAutoRemediate} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                  Auto-remediate overload
                </button>
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Simulated Traffic Load: <span className="mono">{load.toLocaleString()}</span> users
            </div>
            <input
              type="range"
              min="0"
              max="4000"
              step="50"
              value={load}
              onChange={(e) => handleLoadChange(e.target.value)}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--c-text-dim)' }}>
              <span>0</span><span>1k</span><span>2k</span><span>3k</span><span>4k</span>
            </div>
          </div>
          {activeInstances.length === 0 && (
            <button className="btn btn-primary" onClick={handleInstantiateAll}>
              Instantiate {deployments.length} deployed VNF(s)
            </button>
          )}
        </div>
      </div>

      {/* Instance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
        {activeInstances.length === 0 && instances.length > 0 && (
          <p style={{ color: 'var(--c-text-dim)' }}>All instances removed. Re-instantiate from the NFV stage.</p>
        )}
        {activeInstances.map((inst) => {
          const util = inst.utilization ?? 0;
          const utilPct = Math.min(100, Math.round(util * 100));
          return (
            <div key={inst.id} className="panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                  {vnfAssets[inst.vnfId] ? (
                    <img src={vnfAssets[inst.vnfId]} alt="" style={{ width: 24, height: 24 }} draggable={false} />
                  ) : (
                    <span>{VNF_MAP[inst.vnfId]?.icon}</span>
                  )}
                  {inst.name}
                </span>
                <span
                  className="badge"
                  style={{
                    fontSize: '0.66rem',
                    background: statusColor(inst.status) + '22',
                    color: statusColor(inst.status),
                    border: `1px solid ${statusColor(inst.status)}`,
                  }}
                >
                  {inst.status?.toUpperCase() ?? 'IDLE'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--c-text-dim)', marginBottom: 8 }}>
                host: <span className="mono">{inst.hostNodeId}</span> · state: {inst.state}
              </div>
              {/* utilization bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--c-text-dim)' }}>
                  <span>Load</span><span className="mono">{inst.load.toLocaleString()} / {inst.throughput.toLocaleString()}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--c-bg-deep)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${utilPct}%`,
                    background: statusColor(inst.status),
                    transition: 'width 0.2s',
                  }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.74rem', color: 'var(--c-text-dim)', marginBottom: 12 }}>
                <span>CPU: <span className="mono">{inst.cpu}</span> units</span>
                <span>Memory: <span className="mono">{inst.memory}</span> units</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-accent btn-sm" onClick={() => handleScale(inst)} title="Double resources">
                  Scale ×2
                </button>
                <select
                  className="field btn-sm"
                  value=""
                  onChange={(e) => { if (e.target.value) handleMigrate(inst, e.target.value); }}
                  style={{ fontSize: '0.78rem' }}
                >
                  <option value="">Migrate…</option>
                  {servers.filter((s) => s.id !== inst.hostNodeId).map((s) => (
                    <option key={s.id} value={s.id}>→ {s.id}</option>
                  ))}
                </select>
                <button className="btn btn-danger btn-sm" onClick={() => handleRemove(inst)}>
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lifecycle log + score */}
      <div className="orchestration-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="panel" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Lifecycle Actions</div>
          {actions.length === 0 ? (
            <p style={{ color: 'var(--c-text-dim)', fontSize: '0.88rem', fontStyle: 'italic' }}>
              Instantiate, scale, migrate, or remove VNFs — every action is recorded.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {[...actions].reverse().map((a, i) => (
                <div key={i} className="check-item" style={{ fontSize: '0.84rem' }}>
                  <span className="chip" style={{ fontSize: '0.7rem' }}>{a.kind}</span>
                  <span className="mono">{a.instanceId}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Orchestration Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'monospace', color: score.overall >= 70 ? 'var(--c-success)' : 'var(--c-warning)' }}>
              {score.overall}%
            </span>
            <span style={{ color: 'var(--c-text-dim)', fontSize: '0.9rem' }}>{score.message}</span>
          </div>
          <div className="score-dimensions" style={{ marginTop: 12 }}>
            <div className="score-dimension"><span className="score-dimension-label">Stability</span><span className="score-dimension-value">{score.stability}%</span></div>
            <div className="score-dimension"><span className="score-dimension-label">Scaling</span><span className="score-dimension-value">{score.scaling}%</span></div>
            <div className="score-dimension"><span className="score-dimension-label">Lifecycle</span><span className="score-dimension-value">{score.lifecycle}%</span></div>
          </div>
          <button className="btn btn-primary btn-lg" style={{ marginTop: 16, width: '100%' }} onClick={() => { saveOrchestrationResult(score); goToStage(STAGES.SIMULATION); }}>
            Continue to Simulation →
          </button>
        </div>
      </div>
    </div>
  );
}
