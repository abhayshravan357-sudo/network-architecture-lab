import React, { useMemo } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import NetworkBuilder from '../builder/NetworkBuilder.jsx';

export default function PracticeLab() {
  const goToStage = useGameStore((s) => s.goToStage);
  const gameMode = useGameStore((s) => s.gameMode);
  const network = useGameStore((s) => s.network);

  const isPracticeMode = gameMode === 'practice';

  return (
    <div className="page-inner anim-fade-in">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Practice Lab — Sandbox</div>
        <h2>Free Experimentation</h2>
        <p style={{ color: 'var(--c-text-muted)', maxWidth: 640, margin: '10px auto 0' }}>
          Build and test network architectures without scenario constraints.
          All devices are available — experiment with SDN, NFV, and orchestration freely.
        </p>
      </div>

      <div className="panel" style={{ padding: 20, marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Lab Controls</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={() => goToStage(STAGES.BUILD)}>
            Open Network Builder
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => goToStage(STAGES.SDN)}>
            SDN Controller
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => goToStage(STAGES.NFV)}>
            NFV Orchestration
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => goToStage(STAGES.ORCHESTRATION)}>
            VNF Orchestrator
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => goToStage(STAGES.SIMULATION)}>
            Run Simulation
          </button>
        </div>
        <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem', marginTop: 12, textAlign: 'center' }}>
          Your progress is saved automatically. Return to Home to start a scenario-based mission.
        </p>
      </div>

      {/* Embed the Network Builder directly for immediate access */}
      <div style={{ marginTop: 16 }}>
        <NetworkBuilder />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <button className="btn btn-ghost btn-lg" onClick={() => goToStage(STAGES.HOME)}>
          ← Return to Mission Select
        </button>
      </div>
    </div>
  );
}