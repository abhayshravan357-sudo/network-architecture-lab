import React from 'react';
import { useGameStore } from '../../state/gameStore.js';
import { learningAssets } from '../../assets/assetMap.js';
import { getScenario } from '../../data/scenarios/index.js';

export default function ResultsScreen() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const scores = useGameStore((s) => s.scores);
  const network = useGameStore((s) => s.network);
  const sdnState = useGameStore((s) => s.sdnState);
  const nfvState = useGameStore((s) => s.nfvState);
  const orchestrationState = useGameStore((s) => s.orchestrationState);
  const simulationState = useGameStore((s) => s.simulationState);
  const goToHome = useGameStore((s) => s.goToHome);

  const scenario = getScenario(activeScenarioId);

  if (!scenario) return null;

  const graph = network.graph ?? { nodes: [], edges: [] };
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const deployments = nfvState?.deployments ?? [];
  const serviceChain = nfvState?.serviceChain ?? [];
  const orchestrationActions = orchestrationState?.actions ?? [];
  const simulationEvents = simulationState?.events ?? [];
  const vlans = [...new Set(nodes.flatMap((n) => n.config?.vlans ?? []))];
  const routers = nodes.filter((n) => (n.type ?? n.data?.type) === 'router').length;

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

  const learningSummary = [
    scores.connectivity != null && scores.connectivity >= 80
      ? 'Connectivity and path design are solid.'
      : scores.connectivity != null && scores.connectivity < 60
        ? 'Some endpoints or services were unreachable — revisit cabling, switching, and routing.'
        : null,
    scores.security != null && scores.security >= 80
      ? 'Security placement and segmentation are strong.'
      : scores.security != null && scores.security < 60
        ? 'Security boundaries need work — check firewalls, VLANs, and protected server placement.'
        : null,
    scores.sdn != null && scores.sdn >= 80
      ? 'SDN policies and controller coverage are coherent.'
      : scores.sdn != null && scores.sdn < 60
        ? 'SDN policies need clearer intent — revisit controller placement and required allow/deny rules.'
        : null,
    scores.nfv != null && scores.nfv >= 80
      ? 'NFV placement and service chaining are well designed.'
      : scores.nfv != null && scores.nfv < 60
        ? 'NFV deployment needs adjustment — check host resources and chain order.'
        : null,
    scores.simulation != null && scores.simulation >= 80
      ? 'You responded well to runtime events and kept the network stable.'
      : scores.simulation != null && scores.simulation < 60
        ? 'Event responses were incomplete — revisit failure recovery and scaling decisions.'
        : null,
  ].filter(Boolean);

  const networkStory = generateNetworkStory({
    nodes,
    edges,
    vlans,
    routers,
    sdnState,
    deployments,
    serviceChain,
    orchestrationActions,
    simulationEvents,
    scores,
  });

  return (
    <div className="page-inner anim-fade-in">
      <div className="results-screen">
        <div className="results-hero">
          <div className="mission-complete-banner">
            <img src={learningAssets.celebration} alt="" style={{ width: '1.4rem', height: '1.4rem', verticalAlign: '-0.25rem' }} /> MISSION COMPLETE
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

          <div className="eyebrow" style={{ marginBottom: 12 }}>Topology Summary</div>
          <div className="results-score-grid">
            <div className="result-score-card">
              <div className="eyebrow">Devices</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{nodes.length}</div>
            </div>
            <div className="result-score-card">
              <div className="eyebrow">Links</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{edges.length}</div>
            </div>
            <div className="result-score-card">
              <div className="eyebrow">VLANs</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{vlans.length}</div>
            </div>
            <div className="result-score-card">
              <div className="eyebrow">VNFs</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-text)' }}>{deployments.length}</div>
            </div>
          </div>

          <hr />
          <div className="eyebrow" style={{ marginBottom: 12 }}>Modernization Journey</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="check-item">
              <span className="check-icon" style={{ color: sdnState ? 'var(--c-success)' : 'var(--c-text-dim)' }}>✓</span>
              <span>
                SDN controller{sdnState?.controllerPlaced ? ' placed' : ' not placed'} · {sdnState?.policies?.length ?? 0} policies · {(sdnState?.policyFlows?.length ?? 0) + (sdnState?.flowRules?.length ?? 0)} flow rules
              </span>
            </div>
            <div className="check-item">
              <span className="check-icon" style={{ color: deployments.length > 0 ? 'var(--c-success)' : 'var(--c-text-dim)' }}>✓</span>
              <span>
                {deployments.length} VNF(s) deployed · {serviceChain.length} in service chain
              </span>
            </div>
            <div className="check-item">
              <span className="check-icon" style={{ color: orchestrationActions.length > 0 ? 'var(--c-success)' : 'var(--c-text-dim)' }}>✓</span>
              <span>
                {orchestrationActions.length} orchestration action(s) recorded
              </span>
            </div>
            <div className="check-item">
              <span className="check-icon" style={{ color: simulationEvents.length > 0 ? 'var(--c-success)' : 'var(--c-text-dim)' }}>✓</span>
              <span>
                {simulationEvents.length} simulation event(s) triggered
              </span>
            </div>
          </div>

          <hr />
          <div className="eyebrow" style={{ marginBottom: 12 }}>Network Story</div>
          <div style={{ fontSize: '0.95rem', color: 'var(--c-text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
            {networkStory}
          </div>

          <hr />
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

          {learningSummary.length > 0 && (
            <>
              <hr />
              <div className="eyebrow" style={{ marginBottom: 12 }}>Learning Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {learningSummary.map((item, i) => (
                  <div key={i} className="check-item">
                    <span className="check-icon" style={{ color: 'var(--c-accent)' }}>→</span>
                    <span className="check-message">{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
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

function generateNetworkStory({ nodes, edges, vlans, routers, sdnState, deployments, serviceChain, orchestrationActions, simulationEvents, scores }) {
  const parts = [];
  parts.push(`You designed a network with ${nodes.length} devices and ${edges.length} links.`);
  if (routers > 0) parts.push(`Routers provide inter-subnet connectivity.`);
  if (vlans.length > 0) parts.push(`VLANs segment the network into ${vlans.length} logical zones.`);
  if (sdnState?.controllerPlaced) parts.push(`SDN centralization adds a control plane on top of the data plane.`);
  if (deployments.length > 0) parts.push(`${deployments.length} VNF(s) were deployed and ${serviceChain.length} placed in the service chain.`);
  if (orchestrationActions.length > 0) parts.push(`The orchestrator performed ${orchestrationActions.length} lifecycle actions.`);
  if (simulationEvents.length > 0) parts.push(`${simulationEvents.length} simulation event(s) tested the architecture.`);
  return parts.join(' ');
}
