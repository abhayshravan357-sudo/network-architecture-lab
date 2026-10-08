import React from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { getDeviceDef } from '../../data/devices/deviceCatalog.js';
import { deviceAssets } from '../../assets/assetMap.js';

export default function ResourcePool() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const network = useGameStore((s) => s.network);

  if (!activeScenarioId) return null;
  const scenario = getScenario(activeScenarioId);
  if (!scenario || !scenario.resourcePool) return <div>Resources not found</div>;

  const pool = scenario.resourcePool;
  const deployed = {};
  (network.rfNodes ?? []).forEach((n) => {
    const type = n.data.type;
    deployed[type] = (deployed[type] || 0) + 1;
  });

  const deviceTypes = Object.keys(pool).filter(type => pool[type] > 0);

  return (
    <div className="page-inner anim-fade-in">
      <div className="resource-pool">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="eyebrow" style={{ marginBottom: '16px' }}>Inventory Authorized</div>
          <h2>Available Resources</h2>
          <p style={{ color: 'var(--c-text-muted)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0', lineHeight: 1.6 }}>
            Based on your planning phase, the following equipment has been approved for this project.
            You must accomplish the requirements using <strong>only</strong> these resources.
          </p>
        </div>

        <div className="resource-grid">
          {deviceTypes.map(type => {
            const count = pool[type];
            const used = deployed[type] || 0;
            const remaining = count - used;
            const def = getDeviceDef(type);

            return (
              <div key={type} className="resource-card" style={{
                border: remaining === 0 ? '1px solid var(--c-danger-border)' : '1px solid var(--c-border)',
                background: remaining === 0 ? 'var(--c-danger-bg)' : 'var(--c-bg-elevated)',
              }}>
                <div className="resource-card-icon">
                  {deviceAssets[type] ? (
                    <img src={deviceAssets[type]} alt="" />
                  ) : (
                    <img src={deviceAssets.box} alt="" style={{ width: '1.1rem', height: '1.1rem' }} />
                  )}
                </div>
                <div className="resource-card-name">{def?.name || type}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                  <div className="resource-card-count" style={{ fontSize: '1.2rem', fontWeight: 700 }}>×{count}</div>
                  {used > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--c-text-dim)' }}>
                      {remaining === 0 ? <span style={{ color: 'var(--c-danger)' }}>DEPLOYED</span> : <span>{used} used</span>}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--c-text-dim)', marginTop: '4px' }}>
                  {remaining > 0 ? `${remaining} available` : 'Allocated'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => goToStage(STAGES.BUILD)}
          >
            Enter Network Builder →
          </button>
        </div>
      </div>
    </div>
  );
}
