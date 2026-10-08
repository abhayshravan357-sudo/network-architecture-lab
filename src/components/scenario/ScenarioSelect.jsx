import React from 'react';
import { useGameStore } from '../../state/gameStore.js';
import { scenarios } from '../../data/scenarios/index.js';
import { scenarioAssets } from '../../assets/assetMap.js';

export default function ScenarioSelect() {
  const startScenario = useGameStore((s) => s.startScenario);

  return (
    <div className="page-inner scenario-select anim-fade-in">
      <div className="scenario-select-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div className="eyebrow" style={{ marginBottom: '12px' }}>Mission Select</div>
        <h2>Choose a Scenario</h2>
        <p style={{ color: 'var(--c-text-muted)', marginTop: '8px', maxWidth: 600, margin: '8px auto 0', lineHeight: 1.6 }}>
          Select a real-world networking challenge to begin your architectural planning.
          Each scenario tests different aspects of network design, security, and modern SDN/NFV concepts.
        </p>
      </div>

      <div className="scenario-grid">
        {scenarios.map((scenario) => {
          const dots = Array.from({ length: 5 }, (_, i) => i < scenario.difficulty);

          return (
            <div
              key={scenario.id}
              className="scenario-card"
              onClick={() => startScenario(scenario.id)}
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
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

              <div className="scenario-card-body" style={{ padding: '16px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {scenario.description || 'Solve realistic networking challenges.'}
                </p>

                <div className="scenario-card-tags" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {scenario.tags?.map((tag) => (
                    <span key={tag} className="chip" style={{ fontSize: '0.68rem' }}>{tag}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="scenario-card-difficulty" title={`Difficulty: ${scenario.difficulty}/5`}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)', marginRight: '6px' }}>Difficulty:</span>
                    {dots.map((filled, i) => (
                      <span key={i} className={`difficulty-dot ${filled ? 'filled' : ''}`} />
                    ))}
                  </div>

                  {scenario.estimatedMinutes && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-dim)' }}>
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
