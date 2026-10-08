import React, { useEffect, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { ValidationEngine } from '../../engine/validation/validationEngine.js';
import { learningAssets } from '../../assets/assetMap.js';

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
        <img src={learningAssets.radio} alt="" style={{ width: '3rem', height: '3rem', animation: 'packet-pulse 1s ease-in-out infinite' }} />
        <h2 style={{ color: 'var(--c-text-muted)' }}>Analyzing Architecture...</h2>
      </div>
    );
  }

  const { scores, checks } = validationResult;

  const overallClass =
    scores.overall >= 90 ? 'excellent' :
    scores.overall >= 75 ? 'good' :
    scores.overall >= 50 ? 'partial' : 'poor';

  const findings = checks.map((check) => {
    if (check.passed) {
      return { ...check, kind: 'pass', label: 'Pass', color: 'var(--c-success)' };
    }
    const lower = (check.message || '').toLowerCase();
    if (lower.includes('vlan') || lower.includes('segment')) return { ...check, kind: 'warn', label: 'Segmentation', color: 'var(--c-warning)' };
    if (lower.includes('security') || lower.includes('firewall') || lower.includes('acl')) return { ...check, kind: 'warn', label: 'Security', color: 'var(--c-warning)' };
    if (lower.includes('route') || lower.includes('router')) return { ...check, kind: 'fail', label: 'Routing', color: 'var(--c-danger)' };
    return { ...check, kind: 'fail', label: 'Architecture', color: 'var(--c-danger)' };
  });

  return (
    <div className="page-inner anim-fade-in">
      <div className="validation-layout">

        {/* Left: Overall Score & Diagnostic Findings */}
        <div>
          <div className="panel validation-score-hero" style={{ padding: '20px', marginBottom: '16px' }}>
            <div className="eyebrow" style={{ marginBottom: '8px' }}>Architecture Health</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '12px' }}>
              <div className={`overall-score ${overallClass}`} style={{ fontSize: '3rem' }}>{scores.overall}%</div>
              <div style={{ color: 'var(--c-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {scores.overall >= 80
                  ? 'Strong design. This architecture meets the scenario requirements.'
                  : scores.overall >= 60
                    ? 'Workable design, but some requirements need attention.'
                    : 'This design does not yet satisfy the scenario requirements.'}
              </div>
            </div>
            <div style={{ height: '10px', borderRadius: '5px', background: 'var(--c-bg-deep)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${scores.overall}%`,
                background: scores.overall >= 80 ? 'var(--c-success)' : scores.overall >= 60 ? 'var(--c-warning)' : 'var(--c-danger)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          <div className="score-dimensions" style={{ marginBottom: '16px' }}>
            {[
              ['Connectivity', scores.connectivity],
              ['Segmentation', scores.segmentation],
              ['Security', scores.security],
              ['Scalability', scores.scalability],
              ['Routing', scores.routing],
            ].map(([label, value]) => (
              <div key={label} className="score-dimension" style={{ background: 'var(--c-bg-elevated)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <span className="score-dimension-label" style={{ fontSize: '0.78rem' }}>{label}</span>
                  <span className="score-dimension-value" style={{ fontSize: '0.85rem', color: value >= 80 ? 'var(--c-success)' : value >= 60 ? 'var(--c-warning)' : 'var(--c-danger)' }}>{value}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--c-bg-deep)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${value}%`, background: value >= 80 ? 'var(--c-success)' : value >= 60 ? 'var(--c-warning)' : 'var(--c-danger)', transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="panel" style={{ padding: '20px' }}>
            <div className="eyebrow" style={{ marginBottom: '12px' }}>Diagnostic Findings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {findings.map((check, i) => (
                <div key={i} style={{
                  border: `1px solid ${check.color === 'var(--c-success)' ? 'var(--c-success-border)' : check.color === 'var(--c-warning)' ? 'var(--c-warning-border)' : 'var(--c-danger-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  background: check.color === 'var(--c-success)' ? 'var(--c-success-bg)' : check.color === 'var(--c-warning)' ? 'var(--c-warning-bg)' : 'var(--c-danger-bg)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: check.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{check.label}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--c-text-muted)' }}>{check.message || (check.passed ? 'Requirement satisfied.' : 'Requirement not met.')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div className="eyebrow" style={{ marginBottom: '8px' }}>What This Means</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--c-text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Every network tells a story. Before we modernize with SDN, let's review <strong>why</strong> this architecture was required and what it does well.
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
