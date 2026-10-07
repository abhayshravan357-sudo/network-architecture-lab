import React from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';

export default function ScenarioBriefing() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  
  if (!activeScenarioId) return null;
  const scenario = getScenario(activeScenarioId);
  if (!scenario) return <div>Scenario not found</div>;

  return (
    <div className="page-inner anim-fade-in">
      <div className="briefing-layout">
        
        {/* Left: Story */}
        <div className="panel briefing-story">
          <div className="eyebrow" style={{ marginBottom: '16px' }}>Mission Briefing</div>
          <h1 style={{ marginBottom: '24px', fontSize: '2.4rem' }}>{scenario.name}</h1>
          
          <div className="story-content" style={{ fontSize: '1.05rem' }}>
            {scenario.story.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Right: Requirements Sidebar */}
        <div className="briefing-sidebar">
          <div className="panel requirements-panel">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Core Requirements
            </h3>
            
            <div className="requirements-list">
              {scenario.requirements?.map((req, i) => (
                <div key={i} className="requirement-item">
                  <div className={`requirement-icon ${req.severity || 'normal'}`}>
                    {req.severity === 'critical' ? '!' : '✓'}
                  </div>
                  <div className="requirement-text">{req.description}</div>
                </div>
              ))}
            </div>
          </div>

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
