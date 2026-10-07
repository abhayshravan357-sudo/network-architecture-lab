import React, { useEffect, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { ValidationEngine } from '../../engine/validation/validationEngine.js';

export default function ValidationResults() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const graph = useGameStore((s) => s.network.graph);
  const saveValidationResult = useGameStore((s) => s.saveValidationResult);
  const validationResult = useGameStore((s) => s.validationResult);
  const goToStage = useGameStore((s) => s.goToStage);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const planningAnswers = useGameStore((s) => s.planningAnswers);
  
  const [isEvaluating, setIsEvaluating] = useState(true);

  const scenario = getScenario(activeScenarioId);

  useEffect(() => {
    if (!scenario || !graph) return;

    // We simulate a tiny delay so it feels like it's "computing"
    const timer = setTimeout(() => {
      const result = new ValidationEngine(scenario, graph, {
        hintsUsed,
        planningAnswers,
      }).run();
      saveValidationResult(result);
      setIsEvaluating(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [graph, scenario, hintsUsed, planningAnswers, saveValidationResult]);

  if (!scenario) return null;

  if (isEvaluating || !validationResult) {
    return (
      <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ fontSize: '3rem', animation: 'packet-pulse 1s ease-in-out infinite' }}>📡</div>
        <h2 style={{ color: 'var(--c-text-muted)' }}>Analyzing Architecture...</h2>
      </div>
    );
  }

  const { scores, checks } = validationResult;
  
  const overallClass = 
    scores.overall >= 90 ? 'excellent' : 
    scores.overall >= 75 ? 'good' : 
    scores.overall >= 50 ? 'partial' : 'poor';

  return (
    <div className="page-inner anim-fade-in">
      <div className="validation-layout">
        
        {/* Left: Overall Score & Checks */}
        <div>
          <div className="panel validation-score-hero">
            <div className="eyebrow" style={{ marginBottom: '8px' }}>Architecture Suitability</div>
            <div className={`overall-score ${overallClass}`}>{scores.overall}%</div>
            <p style={{ color: 'var(--c-text-muted)' }}>
              {scores.overall >= 80 
                ? "Excellent design. The architecture meets all critical requirements."
                : scores.overall >= 60 
                ? "Acceptable design, but with some architectural flaws or missing redundancies."
                : "The architecture fails to meet the scenario requirements."}
            </p>
          </div>

          <div className="score-dimensions">
            <div className="score-dimension">
              <div className="score-dimension-value" style={{ color: scores.connectivity > 80 ? 'var(--c-success)' : 'var(--c-warning)' }}>
                {scores.connectivity}%
              </div>
              <div className="score-dimension-label">Connectivity</div>
            </div>
            <div className="score-dimension">
              <div className="score-dimension-value" style={{ color: scores.segmentation > 80 ? 'var(--c-success)' : 'var(--c-warning)' }}>
                {scores.segmentation}%
              </div>
              <div className="score-dimension-label">Segmentation</div>
            </div>
            <div className="score-dimension">
              <div className="score-dimension-value" style={{ color: scores.security > 80 ? 'var(--c-success)' : 'var(--c-warning)' }}>
                {scores.security}%
              </div>
              <div className="score-dimension-label">Security</div>
            </div>
          </div>

          <div className="panel" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: '16px' }}>Detailed Analysis</h3>
            <div className="check-list">
              {checks.map((check, i) => (
                <div key={i} className={`check-item ${check.passed ? 'passed' : 'failed'}`}>
                  <div className="check-icon">{check.passed ? '✓' : '✕'}</div>
                  <div className="check-message">
                    <span className="check-label">{check.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                    {check.message || (check.passed ? 'Requirement satisfied.' : 'Requirement not met.')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: '8px' }}>Next Steps</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--c-text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>
              Every network tells a story. Before we proceed to SDN modernization, 
              let's review <strong>why</strong> certain concepts were required for this architecture.
            </p>
            
            <button 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
              onClick={() => goToStage(STAGES.LEARN)}
            >
              Understand Why →
            </button>
            
            <button 
              className="btn btn-ghost" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => goToStage(STAGES.BUILD)}
            >
              ← Back to Builder
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
