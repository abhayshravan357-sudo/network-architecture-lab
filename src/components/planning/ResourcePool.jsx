import React from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { getDeviceDef } from '../../data/devices/deviceCatalog.js';
import { deviceAssets } from '../../assets/assetMap.js';

export default function ResourcePool() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  
  if (!activeScenarioId) return null;
  const scenario = getScenario(activeScenarioId);
  if (!scenario || !scenario.resourcePool) return <div>Resources not found</div>;

  const pool = scenario.resourcePool;
  const deviceTypes = Object.keys(pool).filter(type => pool[type] > 0);

  return (
    <div className="page-inner anim-fade-in">
      <div className="resource-pool">
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="eyebrow" style={{ marginBottom: '16px' }}>Inventory Authorized</div>
          <h2>Available Resources</h2>
          <p style={{ color: 'var(--c-text-muted)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Based on your planning phase, the following equipment has been approved for this project.
            You must accomplish the requirements using <strong>only</strong> these resources.
          </p>
        </div>

        <div className="resource-grid">
          {deviceTypes.map(type => {
            const count = pool[type];
            const def = getDeviceDef(type);
            
            return (
              <div key={type} className="resource-card">
                <div className="resource-card-icon">
                  {deviceAssets[type] ? (
                    <img src={deviceAssets[type]} alt="" />
                  ) : (
                    def?.icon || '📦'
                  )}
                </div>
                <div className="resource-card-name">{def?.name || type}</div>
                <div className="resource-card-count">×{count}</div>
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
