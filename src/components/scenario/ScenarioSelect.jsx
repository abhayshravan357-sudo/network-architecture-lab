import React from 'react';
import { useGameStore } from '../../state/gameStore.js';
import { scenarios } from '../../data/scenarios/index.js';
import { scenarioAssets } from '../../assets/assetMap.js';

export default function ScenarioSelect() {
  const startScenario = useGameStore((s) => s.startScenario);

  return (
    <div className="page-inner scenario-select anim-fade-in">
      <div className="scenario-select-header">
        <div className="eyebrow">Mission Select</div>
        <h2>Choose a Scenario</h2>
        <p style={{ color: 'var(--c-text-muted)', marginTop: '8px' }}>
          Select a real-world networking challenge to begin your architectural planning.
        </p>
      </div>

      <div className="scenario-grid">
        {scenarios.map((scenario) => {
          // Fill array for difficulty dots
          const dots = Array.from({ length: 5 }, (_, i) => i < scenario.difficulty);

          return (
            <div 
              key={scenario.id} 
              className="scenario-card"
              onClick={() => startScenario(scenario.id)}
            >
              <div 
                className="scenario-card-header"
                style={{ background: scenario.coverGradient || 'linear-gradient(135deg, #1e3a8a, #312e81)' }}
              >
                <div className="scenario-card-icon">
                  <img
                    src={scenarioAssets[scenario.id] || scenarioAssets.campus}
                    alt=""
                  />
                </div>
                <h3 className="scenario-card-name">{scenario.name}</h3>
                <p className="scenario-card-tagline">{scenario.tagline || 'Design a network architecture.'}</p>
              </div>

              <div className="scenario-card-body">
                <div className="scenario-card-tags">
                  {scenario.tags?.map((tag) => (
                    <span key={tag} className="chip">{tag}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <div className="scenario-card-difficulty" title={`Difficulty: ${scenario.difficulty}/5`}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginRight: '6px' }}>Difficulty:</span>
                    {dots.map((filled, i) => (
                      <span key={i} className={`difficulty-dot ${filled ? 'filled' : ''}`} />
                    ))}
                  </div>
                  
                  {scenario.estimatedMinutes && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-text-dim)' }}>
                      ⏱️ ~{scenario.estimatedMinutes}m
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
