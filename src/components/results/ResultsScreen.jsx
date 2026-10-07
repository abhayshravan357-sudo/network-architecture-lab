import React from 'react';
import { useGameStore } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';

/**
 * Final learning report — aggregates scores from every
 * stage of the journey: planning, architecture, SDN,
 * NFV, orchestration, and simulation.
 */
export default function ResultsScreen() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const scores = useGameStore((s) => s.scores);
  const goToHome = useGameStore((s) => s.goToHome);

  const scenario = getScenario(activeScenarioId);

  if (!scenario) return null;

  const modernStages = [
    { key: 'sdn', label: 'SDN Transformation', score: scores.sdn },
    { key: 'nfv', label: 'VNF Design', score: scores.nfv },
    { key: 'orchestration', label: 'Orchestration', score: scores.orchestration },
    { key: 'simulation', label: 'Failure Handling', score: scores.simulation },
  ];
  const completedModern = modernStages.filter((m) => m.score != null);

  const dimensionScores = [
    ['Connectivity', scores.connectivity],
    ['Segmentation', scores.segmentation],
    ['Routing', scores.routing],
    ['Services', scores.services],
    ['Security', scores.security],
    ['Scalability', scores.scalability],
  ].filter(([, v]) => v != null);

  const strengths = dimensionScores.filter(([, v]) => v >= 80).map(([label]) => label);
  const improvements = dimensionScores.filter(([, v]) => v < 60).map(([label]) => label);
  if (completedModern.length > 0) {
    for (const m of modernStages) {
      if (m.score != null && m.score >= 80) strengths.push(m.label);
      if (m.score != null && m.score < 60) improvements.push(m.label);
    }
  }

  const concepts = [
    ...(scenario.tags ?? []),
    ...(scores.sdn != null ? ['SDN', 'Control Plane', 'Flow Rules'] : []),
    ...(scores.nfv != null ? ['NFV', 'VNFs', 'Service Chaining'] : []),
    ...(scores.orchestration != null ? ['Orchestration', 'Scaling', 'Resource Allocation'] : []),
    ...(scores.simulation != null ? ['Failure Handling', 'Traffic Simulation'] : []),
  ];

  return (
    <div className="page-inner anim-fade-in">
      <div className="results-screen">
        <div className="results-hero">
          <div className="mission-complete-banner">
            <span style={{ fontSize: '1.2rem' }}>🎉</span> MISSION COMPLETE
          </div>
          <h1 style={{ marginBottom: 16 }}>{scenario.name}</h1>
          <p style={{ color: 'var(--c-text-muted)', fontSize: '1.1rem', maxWidth: 640, margin: '0 auto' }}>
            You analyzed the requirements, planned the architecture, built the network,
            understood the why — then modernized it with SDN, virtualized functions
            with NFV, orchestrated the VNFs, and survived live simulation events.
          </p>
        </div>

        <div className="panel" style={{ padding: 'var(--space-2xl) var(--space-xl)', maxWidth: 760, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Final Evaluation</div>
          <div style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'monospace', color: scores.overall >= 80 ? 'var(--c-success)' : 'var(--c-warning)', lineHeight: 1 }}>
            {scores.overall ?? 0}%
          </div>
          <div style={{ color: 'var(--c-text-dim)', marginTop: 8, fontWeight: 600 }}>Architecture Suitability</div>

          <hr />

          <div className="results-score-grid">
            <div className="result-score-card">
              <div className="eyebrow">Connectivity</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{scores.connectivity ?? 0}%</div>
            </div>
            <div className="result-score-card">
              <div className="eyebrow">Segmentation</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{scores.segmentation ?? 0}%</div>
            </div>
            <div className="result-score-card">
              <div className="eyebrow">Routing</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{scores.routing ?? 0}%</div>
            </div>
            <div className="result-score-card">
              <div className="eyebrow">Security</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{scores.security ?? 0}%</div>
            </div>
          </div>

          {completedModern.length > 0 && (
            <>
              <hr />
              <div className="eyebrow" style={{ marginBottom: 12 }}>Modernization</div>
              <div className="results-score-grid">
                {completedModern.map((m) => (
                  <div className="result-score-card" key={m.key}>
                    <div className="eyebrow">{m.label}</div>
                    <div style={{
                      fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace',
                      color: m.score >= 70 ? 'var(--c-success)' : m.score >= 50 ? 'var(--c-warning)' : 'var(--c-danger)',
                    }}>
                      {m.score}%
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(strengths.length > 0 || improvements.length > 0) && (
            <>
              <hr />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {strengths.length > 0 && (
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--c-success)' }}>Strengths</div>
                    <div className="concepts-demonstrated">
                      {strengths.map((s) => <span key={s} className="chip" style={{ color: 'var(--c-success)' }}>{s}</span>)}
                    </div>
                    <p style={{ color: 'var(--c-text-muted)', fontSize: '0.88rem', marginTop: 8 }}>
                      Good {strengths[0]?.toLowerCase()} design — keep reasoning from requirements to architecture.
                    </p>
                  </div>
                )}
                {improvements.length > 0 && (
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--c-warning)' }}>Improvement</div>
                    <div className="concepts-demonstrated">
                      {improvements.map((s) => <span key={s} className="chip" style={{ color: 'var(--c-warning)' }}>{s}</span>)}
                    </div>
                    <p style={{ color: 'var(--c-text-muted)', fontSize: '0.88rem', marginTop: 8 }}>
                      {improvements[0]} could be stronger — revisit the requirement that implies it and re-run validation.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <hr />
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Concepts Demonstrated</div>
            <div className="concepts-demonstrated">
              {concepts.map((tag, i) => (
                <span key={`${tag}-${i}`} className="chip">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <button className="btn btn-ghost btn-lg" onClick={goToHome}>
            Return to Mission Select
          </button>
        </div>
      </div>
    </div>
  );
}
