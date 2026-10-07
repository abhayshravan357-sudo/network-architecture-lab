import React, { useMemo, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import {
  deriveSDNModel,
  generateFlowRules,
  computeReroute,
  scoreSDN,
} from '../../engine/sdn/sdnEngine.js';
import { DEVICE_CATALOG_MAP } from '../../data/devices/deviceCatalog.js';
import { deviceAssets, sdnAssets } from '../../assets/assetMap.js';

/**
 * SDN Stage — modernize the existing architecture with a
 * centralized controller. The student's build stays as the
 * data plane; the controller becomes the control plane.
 */
export default function SdnStage() {
  const graph = useGameStore((s) => s.network.graph);
  const sdnState = useGameStore((s) => s.sdnState);
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const placeController = useGameStore((s) => s.placeController);
  const setFlowRules = useGameStore((s) => s.setFlowRules);
  const setLinkFailure = useGameStore((s) => s.setLinkFailure);
  const saveSDNResult = useGameStore((s) => s.saveSDNResult);

  const [selectedEdge, setSelectedEdge] = useState('');
  const scenario = getScenario(activeScenarioId);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const switches = nodes.filter((n) => n.type === 'l2Switch' || n.type === 'l3Switch');

  const model = useMemo(
    () => (nodes.length ? deriveSDNModel({ nodes, edges }) : null),
    [nodes, edges]
  );

  const score = useMemo(
    () => (nodes.length ? scoreSDN({ nodes, edges }, sdnState ?? { controllerPlaced: false, flowRules: [], reroute: null }) : null),
    [nodes, edges, sdnState]
  );

  if (nodes.length === 0) {
    return (
      <div className="page-inner anim-fade-in">
        <div className="panel config-panel-empty" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>SDN Stage</div>
          <h2>No network to modernize yet</h2>
          <p style={{ color: 'var(--c-text-muted)', margin: '12px 0 24px' }}>
            Build a traditional architecture first — the SDN stage adds a controller on top of it.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => goToStage(STAGES.BUILD)}>
            ← Back to Builder
          </button>
        </div>
      </div>
    );
  }

  const handlePlaceController = () => {
    placeController();
    setFlowRules(generateFlowRules({ nodes, edges }));
  };

  const handleSimulateFailure = () => {
    if (!selectedEdge) return;
    const reroute = computeReroute({ nodes, edges }, selectedEdge);
    setLinkFailure(selectedEdge, reroute);
  };

  const handleContinue = () => {
    saveSDNResult(scoreSDN({ nodes, edges }, sdnState ?? { controllerPlaced: false, flowRules: [], reroute: null }));
    goToStage(STAGES.NFV);
  };

  // ── Layered layout for the read-only diagram ──────
  const layout = useMemo(() => computeLayout(nodes, edges, sdnState?.controllerPlaced), [nodes, edges, sdnState]);

  const failedEdge = edges.find((e) => e.id === sdnState?.failedEdgeId);

  return (
    <div className="page-inner anim-fade-in">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Modernization Stage — SDN</div>
        <h2>Modernize with Software-Defined Networking</h2>
        <p style={{ color: 'var(--c-text-muted)', maxWidth: 640, margin: '10px auto 0' }}>
          Your existing architecture becomes the <strong>data plane</strong>. An SDN controller
          becomes the <strong>control plane</strong> — it sees the whole network and programs
          every switch centrally instead of configuring each device by hand.
        </p>
      </div>

      <div className="sdn-layout">
        {/* Left: diagram */}
        <div className="panel" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            {sdnState?.controllerPlaced ? 'Control Plane + Data Plane' : 'Data Plane (current architecture)'}
          </div>
          <svg viewBox="0 0 800 400" style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* data edges */}
            {edges.map((e) => {
              const a = layout.positions[e.source];
              const b = layout.positions[e.target];
              if (!a || !b) return null;
              const isFailed = e.id === sdnState?.failedEdgeId;
              return (
                <g key={e.id}>
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={isFailed ? 'var(--c-danger)' : 'var(--c-border-lit)'}
                    strokeWidth={isFailed ? 3 : 2}
                    strokeDasharray={isFailed ? '6 5' : undefined}
                  />
                  {isFailed && (
                    <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} textAnchor="middle" fontSize="11" fill="var(--c-danger)">
                      link failed
                    </text>
                  )}
                </g>
              );
            })}
            {/* control edges (controller → switches) */}
            {sdnState?.controllerPlaced &&
              switches.map((s) => {
                const c = layout.positions['sdn-controller'];
                const t = layout.positions[s.id];
                if (!c || !t) return null;
                return (
                  <line
                    key={`ctl-${s.id}`}
                    x1={c.x} y1={c.y} x2={t.x} y2={t.y}
                    stroke="var(--c-accent)"
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                    opacity="0.7"
                  />
                );
              })}
            {/* nodes */}
            {layout.renderNodes}
          </svg>
          <div className="chip-row" style={{ marginTop: 10 }}>
            <span className="chip">━ data plane (your traffic)</span>
            {sdnState?.controllerPlaced && <span className="chip" style={{ color: 'var(--c-accent)' }}>┅ control plane (controller → switches)</span>}
            {failedEdge && <span className="chip" style={{ color: 'var(--c-danger)' }}>┄ failed link</span>}
          </div>
        </div>

        {/* Right: actions + rules + failure */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Controller placement */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>1 · Centralized Control</div>
            {sdnState?.controllerPlaced ? (
              <div>
                <div className="check-item"><span className="check-icon" style={{ color: 'var(--c-success)' }}>✓</span>
                  <span>SDN controller deployed — manages {model?.controller.manages.length} switch(es) via OpenFlow (simulated)</span>
                </div>
                {scenario?.sdnOpportunities?.map((opp) => (
                  <div className="check-item" key={opp.id} style={{ color: 'var(--c-text-muted)' }}>
                    <span className="check-icon">→</span>
                    <span><strong>{opp.label}:</strong> {opp.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--c-text-muted)', fontSize: '0.92rem', margin: '0 0 14px' }}>
                  Today each switch is configured individually. Place a controller to centralize
                  policy, VLANs, and flow rules across the whole network.
                </p>
                <button className="btn btn-primary" onClick={handlePlaceController}>
                  Place SDN Controller
                </button>
              </div>
            )}
          </div>

          {/* Flow rules */}
          {sdnState?.controllerPlaced && (
            <div className="panel" style={{ padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>2 · Flow Rules Pushed by Controller</div>
              <p style={{ color: 'var(--c-text-muted)', fontSize: '0.88rem', margin: '0 0 12px' }}>
                The controller derived {sdnState.flowRules.length} flow rules from your topology —
                each says "match traffic from this source → forward toward the L3 path".
              </p>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sdnState.flowRules.slice(0, 24).map((r) => (
                  <div key={r.id} className="check-item" style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}>
                    <span className="chip" style={{ fontSize: '0.72rem' }}>{r.id}</span>
                    <span className="chip" style={{ fontSize: '0.72rem' }}>{r.switchId}</span>
                    <span>match {r.match.sourceType}:{r.match.source}{r.match.vlan != null ? ` vlan=${r.match.vlan}` : ''} → forward toward {r.action.toward}</span>
                  </div>
                ))}
                {sdnState.flowRules.length > 24 && (
                  <div style={{ color: 'var(--c-text-dim)', fontSize: '0.8rem' }}>…and {sdnState.flowRules.length - 24} more</div>
                )}
              </div>
            </div>
          )}

          {/* Failure simulation */}
          {sdnState?.controllerPlaced && (
            <div className="panel" style={{ padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>3 · Simulate a Link Failure</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select
                  className="field"
                  value={selectedEdge}
                  onChange={(e) => setSelectedEdge(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Choose a link…</option>
                  {edges.map((e) => (
                    <option key={e.id} value={e.id}>{e.id} ({e.source} ↔ {e.target})</option>
                  ))}
                </select>
                <button className="btn btn-danger" onClick={handleSimulateFailure} disabled={!selectedEdge}>
                  Fail Link
                </button>
              </div>
              {sdnState.reroute && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.86rem' }}>
                  <div className="check-item">
                    <span className="check-icon">⚡</span>
                    <span>Controller detected failure — recalculated paths for {sdnState.reroute.affectedPaths.length} flow(s)</span>
                  </div>
                  {sdnState.reroute.rerouted.map((r, i) => (
                    <div className="check-item" key={i}>
                      <span className="check-icon" style={{ color: 'var(--c-success)' }}>✓</span>
                      <span>{r.from} → {r.to}: rerouted via <span className="mono">{r.newPath.join(' → ')}</span></span>
                    </div>
                  ))}
                  {sdnState.reroute.unreachable.map((u, i) => (
                    <div className="check-item" key={i}>
                      <span className="check-icon" style={{ color: 'var(--c-danger)' }}>✗</span>
                      <span>{u.from} → {u.to}: no alternate path — topology needs redundancy</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Score */}
          {score && (
            <div className="panel" style={{ padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>SDN Transformation Score</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'monospace', color: score.overall >= 70 ? 'var(--c-success)' : 'var(--c-warning)' }}>
                  {score.overall}%
                </span>
                <span style={{ color: 'var(--c-text-dim)', fontSize: '0.9rem' }}>{score.message}</span>
              </div>
              <div className="score-dimensions" style={{ marginTop: 12 }}>
                <div className="score-dimension">
                  <span className="score-dimension-label">Switch coverage</span>
                  <span className="score-dimension-value">{score.coverage}%</span>
                </div>
                <div className="score-dimension">
                  <span className="score-dimension-label">Flow rules</span>
                  <span className="score-dimension-value">{score.flowRules}%</span>
                </div>
                <div className="score-dimension">
                  <span className="score-dimension-label">Reroute</span>
                  <span className="score-dimension-value">{score.reroute == null ? '—' : `${score.reroute}%`}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-lg" style={{ marginTop: 16, width: '100%' }} onClick={handleContinue}>
                Continue to NFV →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Layered diagram layout: controller on top, infrastructure
 * (switches/routers/firewalls) in the middle, endpoints and
 * servers at the bottom. Returns positions + rendered nodes.
 */
function computeLayout(nodes, edges, controllerPlaced) {
  const W = 800;
  const layers = { infra: [], end: [] };
  const INFRA = ['l2Switch', 'l3Switch', 'router', 'firewall', 'wirelessController'];
  for (const n of nodes) {
    (INFRA.includes(n.type) ? layers.infra : layers.end).push(n);
  }

  const positions = {};
  const renderNodes = [];

  const placeLayer = (list, y) => {
    const step = list.length > 1 ? (W - 160) / (list.length - 1) : 0;
    list.forEach((n, i) => {
      const x = list.length === 1 ? W / 2 : 80 + i * step;
      positions[n.id] = { x, y };
      const meta = DEVICE_CATALOG_MAP[n.type];
      const icon = deviceAssets[n.type];
      renderNodes.push(
        <g key={n.id}>
          <circle cx={x} cy={y} r={22} fill="var(--c-bg-elevated)" stroke={meta?.color ?? '#64748b'} strokeWidth="2" />
          {icon ? (
            <image href={icon} x={x - 15} y={y - 15} width={30} height={30} />
          ) : (
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="var(--c-text)" fontWeight="700">
              {meta?.shortName ?? n.type}
            </text>
          )}
          <text x={x} y={y + 34} textAnchor="middle" fontSize="9" fill="var(--c-text-dim)">
            {meta?.shortName ?? n.type}
          </text>
        </g>
      );
    });
  };

  if (controllerPlaced) {
    positions['sdn-controller'] = { x: W / 2, y: 46 };
    renderNodes.push(
      <g key="sdn-controller">
        <rect x={W / 2 - 62} y={22} width={124} height={48} rx={10} fill="var(--c-accent-soft)" stroke="var(--c-accent)" strokeWidth="2" />
        <image href={sdnAssets.controller} x={W / 2 - 24} y={26} width={24} height={24} />
        <text x={W / 2 + 14} y={43} textAnchor="middle" fontSize="11" fill="var(--c-accent)" fontWeight="700">SDN</text>
        <text x={W / 2 + 14} y={58} textAnchor="middle" fontSize="10" fill="var(--c-accent)">controller</text>
      </g>
    );
  } else {
    placeLayer(layers.infra, 130);
    placeLayer(layers.end, 290);
  }

  return { positions, renderNodes };
}
