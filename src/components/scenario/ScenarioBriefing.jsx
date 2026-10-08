import React, { useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { uiAssets } from '../../assets/assetMap.js';
import { getScenario } from '../../data/scenarios/index.js';

export default function ScenarioBriefing() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const [thoughts, setThoughts] = useState({});

  if (!activeScenarioId) return null;
  const scenario = getScenario(activeScenarioId);
  if (!scenario) return <div>Scenario not found</div>;

  const handleThoughtChange = (qid, value) => {
    setThoughts((prev) => ({ ...prev, [qid]: value }));
  };

  return (
    <div className="page-inner anim-fade-in">
      <div className="briefing-layout">
        {/* Left: Story */}
        <div className="panel briefing-story">
          <div className="eyebrow" style={{ marginBottom: '16px' }}>Mission Briefing</div>
          <h1 style={{ marginBottom: '24px', fontSize: '2.4rem' }}>{scenario.name}</h1>

          <div className="story-content" style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
            {scenario.story.split('\n\n').map((paragraph, i) => (
              <p key={i} style={{ marginBottom: '16px' }}>{paragraph}</p>
            ))}
          </div>

          {/* Interactive thinking prompts */}
          {scenario.thinkingPrompts?.length > 0 && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--c-border)' }}>
              <div className="eyebrow" style={{ marginBottom: '16px' }}>Before you build</div>
              {scenario.thinkingPrompts.map((prompt, i) => (
                <div key={prompt.id} style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--c-text)' }}>{prompt.question}</div>
                  <textarea
                    value={thoughts[prompt.id] || ''}
                    onChange={(e) => handleThoughtChange(prompt.id, e.target.value)}
                    placeholder={prompt.placeholder || 'Type your thoughts...'}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      background: 'var(--c-bg-glass)',
                      border: '1px solid var(--c-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      color: 'var(--c-text)',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Requirements Sidebar */}
        <div className="briefing-sidebar">
          <div className="panel requirements-panel" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <img src={uiAssets.clipboard} alt="" style={{ width: '1.1rem', height: '1.1rem' }} /> Core Requirements
            </h3>

            <div className="requirements-list">
              {scenario.requirements?.map((req, i) => (
                <div key={i} className="requirement-item" style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
                  <div className={`requirement-icon ${req.severity || 'normal'}`} style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    background: req.severity === 'critical' ? 'var(--c-danger-bg)' : 'var(--c-success-bg)',
                    color: req.severity === 'critical' ? 'var(--c-danger)' : 'var(--c-success)',
                    border: `1px solid ${req.severity === 'critical' ? 'var(--c-danger-border)' : 'var(--c-success-border)'}`,
                  }}>
                    {req.severity === 'critical' ? '!' : '✓'}
                  </div>
                  <div className="requirement-text" style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--c-text-muted)' }}>{req.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Context cards */}
          {scenario.contextCards?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {scenario.contextCards.map((card) => (
                <div key={card.label} className="panel" style={{ padding: '12px 14px' }}>
                  <div className="eyebrow" style={{ marginBottom: '4px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', lineHeight: 1.5 }}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => goToStage(STAGES.PLANNING_QUIZ)}
          >
            Acknowledge & Begin Planning →
          </button>
        </div>
      </div>
    </div>
  );
}
