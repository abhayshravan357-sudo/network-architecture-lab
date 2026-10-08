import React, { useMemo, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { analyzeTopology } from '../../engine/learning/topologyAnalyzer.js';
import { learningAssets, deviceAssets } from '../../assets/assetMap.js';

const DIMENSIONS = [
  { id: 'connectivity', label: 'Connectivity', icon: '🔗' },
  { id: 'segmentation', label: 'Segmentation', icon: '🧱' },
  { id: 'routing', label: 'Routing', icon: '📡' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'scalability', label: 'Scalability', icon: '📈' },
];

export default function WhyExplainer() {
  const graph = useGameStore((s) => s.network.graph);
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const scenario = getScenario(activeScenarioId);

  const analysis = useMemo(() => {
    if (!graph?.nodes?.length) return null;
    return analyzeTopology(graph);
  }, [graph]);

  const [activeDimension, setActiveDimension] = useState(null);

  if (!scenario || !analysis) {
    return (
      <div className="page-inner anim-fade-in">
        <div className="panel config-panel-empty" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Learning Phase</div>
          <h2>No topology to analyze yet</h2>
          <p style={{ color: 'var(--c-text-muted)', margin: '12px 0 24px' }}>
            Build and validate your network first — the WHY stage explains your actual architecture.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => goToStage(STAGES.BUILD)}>
            ← Back to Builder
          </button>
        </div>
      </div>
    );
  }

  const { scores, whatYouBuilt, whyItWorks, strengths, missing, improvements, counts, vlans, subnets } = analysis;

  const scoreColor = (value) => value >= 80 ? 'var(--c-success)' : value >= 60 ? 'var(--c-warning)' : 'var(--c-danger)';

  const selectedDimension = activeDimension ? DIMENSIONS.find(d => d.id === activeDimension) : null;
  const dimensionScore = selectedDimension ? scores[selectedDimension.id] : null;
  const dimensionInsights = {
    connectivity: {
      insight: connectivityInsight(scores.connectivity, counts),
      action: 'Check device placement and cable connections in the builder.',
    },
    segmentation: {
      insight: segmentationInsight(scores.segmentation, vlans.length),
      action: 'Review VLAN assignments and subnet design.',
    },
    routing: {
      insight: routingInsight(scores.routing, counts.routers),
      action: 'Verify router interfaces and inter-subnet paths.',
    },
    security: {
      insight: securityInsight(scores.security),
      action: 'Review firewall placement and ACL requirements.',
    },
    scalability: {
      insight: scalabilityInsight(scores.scalability, counts),
      action: 'Consider hierarchical design with core/distribution layers.',
    },
  };

  return (
    <div className="page-inner anim-fade-in">
      <div className="why-layout">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Learning Phase</div>
          <h2>The "Why" Behind Your Design</h2>
          <p style={{ color: 'var(--c-text-muted)', marginTop: 8, maxWidth: 600, margin: '8px auto 0', lineHeight: 1.6 }}>
            A true network architect understands not just <em>how</em> to connect devices,
            but <em>why</em> specific choices solve business requirements.
          </p>
        </div>

        {/* Score overview */}
        <div className="panel" style={{ padding: 20, marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Architecture Analysis</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {DIMENSIONS.map((dim) => (
              <button
                key={dim.id}
                onClick={() => setActiveDimension(activeDimension === dim.id ? null : dim.id)}
                style={{
                  flex: '1 1 140px',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: activeDimension === dim.id ? '2px solid var(--c-accent)' : '1px solid var(--c-border)',
                  background: activeDimension === dim.id ? 'rgba(56,189,248,0.08)' : 'var(--c-bg-elevated)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{dim.icon}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--c-text)', marginBottom: '4px' }}>{dim.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: scoreColor(scores[dim.id]) }}>
                  {scores[dim.id]}%
                </div>
              </button>
            ))}
          </div>

          {selectedDimension && (
            <div className="panel" style={{ padding: 16, background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--c-accent-soft)' }}>
                {selectedDimension.icon} {selectedDimension.label} — {dimensionInsights[selectedDimension.id].insight}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>
                {dimensionInsights[selectedDimension.id].action}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: scoreColor(scores.overall) }}>
              {scores.overall}%
            </span>
            <span style={{ color: 'var(--c-text-dim)', fontSize: '0.9rem' }}>Overall architecture score</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="concept-tabs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'strengths', label: `Strengths (${strengths.length})` },
            { id: 'missing', label: `Missing (${missing.length})` },
            { id: 'improvements', label: `Improvements (${improvements.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`concept-tab ${activeDimension === null && tab.id === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveDimension(null)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="panel concept-panel">
          {activeDimension === null && (
            <div className="anim-fade-in">
              <h3 style={{ marginBottom: 12, color: 'var(--c-text)' }}>What You Built</h3>
              <p style={{ color: 'var(--c-text-muted)', lineHeight: 1.7, marginBottom: 20 }}>{whatYouBuilt}</p>

              <h3 style={{ marginBottom: 12, color: 'var(--c-text)' }}>Why It Works</h3>
              <p style={{ color: 'var(--c-text-muted)', lineHeight: 1.7, marginBottom: 20 }}>{whyItWorks}</p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {vlans.length > 0 && <span className="chip">VLANs: {vlans.join(', ')}</span>}
                {subnets.length > 0 && <span className="chip">Subnets: {subnets.length}</span>}
                <span className="chip">{counts.total} devices</span>
                <span className="chip">{(graph?.edges?.length ?? 0)} links</span>
              </div>
            </div>
          )}

          {activeDimension === null && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ marginBottom: 12, color: 'var(--c-text)' }}>Key Insights</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {strengths.slice(0, 3).map((text, i) => (
                  <div key={i} className="check-item passed">
                    <span className="check-icon" style={{ color: 'var(--c-success)' }}>✓</span>
                    <span className="check-message">{text}</span>
                  </div>
                ))}
                {missing.slice(0, 2).map((text, i) => (
                  <div key={i} className="check-item failed">
                    <span className="check-icon" style={{ color: 'var(--c-warning)' }}>△</span>
                    <span className="check-message">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continue */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => goToStage(STAGES.SDN)}
          >
            Modernize with SDN →
          </button>
        </div>
      </div>
    </div>
  );
}

function connectivityInsight(score, counts) {
  if (score >= 90) return 'Your devices are well connected.';
  if (score >= 70) return 'Most devices can communicate, but a few links may be missing.';
  return 'Several devices appear disconnected. Review your topology.';
}

function segmentationInsight(score, vlanCount) {
  if (score >= 80) return 'Your network is well segmented.';
  if (vlanCount > 0) return 'You have VLANs, but coverage could be stronger.';
  return 'No VLANs detected. Consider adding logical segments.';
}

function routingInsight(score, routerCount) {
  if (score >= 90) return 'Inter-subnet routing is solid.';
  if (routerCount > 0) return 'A router exists, but some paths may not be reachable.';
  return 'No router detected. Add a router for inter-network communication.';
}

function securityInsight(score) {
  if (score >= 80) return 'Security placement looks strong.';
  if (score >= 50) return 'Some security controls are present.';
  return 'Security needs attention. Consider a firewall or ACL policies.';
}

function scalabilityInsight(score, counts) {
  if (score >= 80) return 'Your design has good expansion potential.';
  if (counts.l3Switches > 0) return 'L3 switches help scalability.';
  return 'Consider hierarchical design for future growth.';
}
