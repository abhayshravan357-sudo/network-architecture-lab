import React, { useMemo, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import {
  deriveSDNModel,
  generateFlowRules,
  computeReroute,
  scoreSDN,
  evaluateTraffic,
  resolveTrafficCandidates,
} from '../../engine/sdn/sdnEngine.js';
import { createPolicy, policiesToFlowRules, scoreSDNPolicies } from '../../engine/sdn/sdnPolicyEngine.js';
import { DEVICE_CATALOG_MAP } from '../../data/devices/deviceCatalog.js';
import { deviceAssets, sdnAssets, uiAssets } from '../../assets/assetMap.js';

const TRAFFIC_GROUPS = [
  { id: 'guest', label: 'Guest', types: ['pc', 'laptop'] },
  { id: 'student', label: 'Student', types: ['pc', 'laptop'] },
  { id: 'admin', label: 'Admin', types: ['pc', 'laptop'] },
  { id: 'server', label: 'Server', types: ['server'] },
  { id: 'internet', label: 'Internet', types: ['cloud'] },
];

const GROUP_ACTIONS = [
  { id: 'ALLOW', label: 'ALLOW' },
  { id: 'DENY', label: 'DENY' },
];

export default function SdnStage() {
  const graph = useGameStore((s) => s.network.graph);
  const sdnState = useGameStore((s) => s.sdnState);
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const placeController = useGameStore((s) => s.placeController);
  const setFlowRules = useGameStore((s) => s.setFlowRules);
  const setLinkFailure = useGameStore((s) => s.setLinkFailure);
  const saveSDNResult = useGameStore((s) => s.saveSDNResult);
  const addSDNPolicy = useGameStore((s) => s.addSDNPolicy);
  const removeSDNPolicy = useGameStore((s) => s.removeSDNPolicy);
  const setSDNPolicyFlows = useGameStore((s) => s.setSDNPolicyFlows);
  const recordSDNEvent = useGameStore((s) => s.recordSDNEvent);
  const setSDNTrafficResult = useGameStore((s) => s.setSDNTrafficResult);

  const [selectedEdge, setSelectedEdge] = useState('');
  const [sourceGroup, setSourceGroup] = useState('guest');
  const [destinationGroup, setDestinationGroup] = useState('admin');
  const [action, setAction] = useState('DENY');
  const [activeTab, setActiveTab] = useState('overview');
  const [trafficFrom, setTrafficFrom] = useState('');
  const [trafficTo, setTrafficTo] = useState('');
  const scenario = getScenario(activeScenarioId);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const switches = nodes.filter((n) => n.type === 'l2Switch' || n.type === 'l3Switch');
  const policies = sdnState?.policies ?? [];
  const policyFlows = sdnState?.policyFlows ?? [];

  const model = useMemo(() => (nodes.length ? deriveSDNModel({ nodes, edges }) : null), [nodes, edges]);
  const topologyScore = useMemo(() => (nodes.length ? scoreSDN({ nodes, edges }, sdnState ?? { controllerPlaced: false, flowRules: [], reroute: null }) : null), [nodes, edges, sdnState]);
  const policyScore = useMemo(() => {
    if (!scenario?.sdnPolicyRequirements?.length) return null;
    return scoreSDNPolicies(policies, scenario.sdnPolicyRequirements, { nodes, edges });
  }, [policies, scenario, nodes, edges]);

  const overallSDNScore = useMemo(() => {
    const topology = topologyScore?.overall ?? 0;
    const policy = policyScore?.overall ?? 0;
    const topologyWeight = sdnState?.controllerPlaced ? 0.5 : 0.8;
    const policyWeight = sdnState?.controllerPlaced ? 0.5 : 0.2;
    const raw = topology * topologyWeight + policy * policyWeight;
    return Math.round(Math.min(100, raw));
  }, [topologyScore, policyScore, sdnState?.controllerPlaced]);

  const readiness = useMemo(() => {
    const hasDevices = nodes.length > 0;
    const hasSwitch = switches.length > 0;
    const hasLinks = edges.length > 0;
    const ready = hasDevices && hasSwitch && hasLinks;
    return { hasDevices, hasSwitch, hasLinks, ready };
  }, [nodes.length, switches.length, edges.length]);

  if (!readiness.ready) {
    return (
      <div className="page-inner anim-fade-in">
        <div className="panel config-panel-empty" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>SDN Readiness Check</div>
          <h2>Network not ready for SDN transformation</h2>
          <p style={{ color: 'var(--c-text-muted)', margin: '12px 0 24px', lineHeight: 1.7 }}>
            Your current topology needs a switch-based data path before the controller can manage it.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, textAlign: 'left', maxWidth: 320, margin: '0 auto 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: readiness.hasDevices ? 'var(--c-success)' : 'var(--c-danger)', fontSize: '1rem' }}>{readiness.hasDevices ? '✓' : '✕'}</span>
              <span>At least one device deployed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: readiness.hasSwitch ? 'var(--c-success)' : 'var(--c-danger)', fontSize: '1rem' }}>{readiness.hasSwitch ? '✓' : '✕'}</span>
              <span>At least one switch added</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: readiness.hasLinks ? 'var(--c-success)' : 'var(--c-danger)', fontSize: '1rem' }}>{readiness.hasLinks ? '✓' : '✕'}</span>
              <span>At least one link connecting devices</span>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => goToStage(STAGES.BUILD)}>
            ← Back to Builder
          </button>
        </div>
      </div>
    );
  }

  const handlePlaceController = () => {
    placeController();
    const rules = generateFlowRules({ nodes, edges });
    setFlowRules(rules);
    recordSDNEvent({ kind: 'controller-online', timestamp: Date.now(), detail: 'Controller placed' });
    recordSDNEvent({ kind: 'flow-rules-installed', timestamp: Date.now(), detail: `${rules.length} flow rule(s) installed` });
  };

  const handleAddPolicy = () => {
    if (!sourceGroup || !destinationGroup) return;
    const policy = createPolicy(sourceGroup, destinationGroup, action);
    addSDNPolicy(policy);
    const generated = policiesToFlowRules([policy], { nodes, edges });
    setSDNPolicyFlows([...(sdnState?.policyFlows ?? []), ...generated]);
    recordSDNEvent({ kind: 'policy-created', timestamp: Date.now(), detail: `${policy.source} → ${policy.destination}: ${policy.action}` });
    recordSDNEvent({ kind: 'flow-installed', timestamp: Date.now(), detail: `${generated.length} policy flow rule(s)` });
  };

  const handleSimulateFailure = () => {
    if (!selectedEdge) return;
    const reroute = computeReroute({ nodes, edges }, selectedEdge);
    setLinkFailure(selectedEdge, reroute);
    recordSDNEvent({ kind: 'link-failure', timestamp: Date.now(), detail: selectedEdge });
    if (reroute?.reroute) {
      recordSDNEvent({ kind: 'reroute-calculated', timestamp: Date.now(), detail: `${reroute.reroute.affectedPaths.length} affected path(s)` });
    }
  };

  const handleTrafficTest = () => {
    if (!trafficFrom || !trafficTo) return;
    const result = evaluateTraffic({ nodes, edges }, sdnState, trafficFrom, trafficTo);
    setSDNTrafficResult(result);
    recordSDNEvent({ kind: 'traffic-test', timestamp: Date.now(), detail: `${trafficFrom} → ${trafficTo}: ${result.allowed ? 'ALLOWED' : 'DENIED'}` });
  };

  const handleContinue = () => {
    saveSDNResult({ overall: overallSDNScore });
    goToStage(STAGES.NFV);
  };

  const layout = useMemo(() => computeLayout(nodes, edges, sdnState?.controllerPlaced), [nodes, edges, sdnState]);
  const failedEdge = edges.find((e) => e.id === sdnState?.failedEdgeId);
  const managedSwitches = switches.map((s) => s.id);
  const flowRules = sdnState?.flowRules ?? [];
  const trafficCandidates = useMemo(() => resolveTrafficCandidates({ nodes, edges }), [nodes, edges]);
  const trafficResult = sdnState?.activeTrafficTest ?? null;
  const sdnEvents = useMemo(() => (sdnState?.sdnEvents ?? []).slice(-20), [sdnState]);

  return (
    <div className="page-inner anim-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Modernization Stage — SDN</div>
          <h2 style={{ marginBottom: 4 }}>Software-Defined Networking</h2>
          <p style={{ color: 'var(--c-text-muted)', maxWidth: 700, fontSize: '0.92rem', lineHeight: 1.6 }}>
            Your existing architecture is the <strong>data plane</strong>. Add a controller to become the <strong>control plane</strong>:
            centralized policies, switch-wide flow rules, and logical rerouting.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={handlePlaceController} disabled={sdnState?.controllerPlaced}>
            {sdnState?.controllerPlaced ? 'Controller Online' : 'Place Controller'}
          </button>
        </div>
      </div>

      <div className="sdn-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: topology + control/data planes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {sdnState?.controllerPlaced ? 'Control Plane + Data Plane' : 'Data Plane (current architecture)'}
            </div>
            <svg viewBox="0 0 800 400" style={{ width: '100%', height: 'auto', display: 'block' }}>
              {edges.map((e) => {
                const a = layout.positions[e.source];
                const b = layout.positions[e.target];
                if (!a || !b) return null;
                const isFailed = e.id === sdnState?.failedEdgeId;
                return (
                  <g key={e.id}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isFailed ? 'var(--c-danger)' : 'var(--c-border-lit)'} strokeWidth={isFailed ? 3 : 2} strokeDasharray={isFailed ? '6 5' : undefined} />
                    {isFailed && (
                      <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} textAnchor="middle" fontSize="11" fill="var(--c-danger)">link failed</text>
                    )}
                  </g>
                );
              })}
              {sdnState?.controllerPlaced &&
                managedSwitches.map((sw) => {
                  const c = layout.positions['sdn-controller'];
                  const t = layout.positions[sw];
                  if (!c || !t) return null;
                  return (
                    <line key={`ctl-${sw}`} x1={c.x} y1={c.y} x2={t.x} y2={t.y} stroke="var(--c-accent)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.85" />
                  );
                })}
              {layout.renderNodes}
            </svg>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <span className="chip">━ data plane</span>
              {sdnState?.controllerPlaced && <span className="chip" style={{ color: 'var(--c-accent)' }}>┅ control plane</span>}
              {failedEdge && <span className="chip" style={{ color: 'var(--c-danger)' }}>┄ failed link</span>}
            </div>
          </div>

          <div className="panel" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Controller</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: 4 }}>Status</div>
                <div style={{ color: sdnState?.controllerPlaced ? 'var(--c-success)' : 'var(--c-text-dim)', fontWeight: 700 }}>{sdnState?.controllerPlaced ? 'ONLINE' : 'OFFLINE'}</div>
              </div>
              <div style={{ background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: 4 }}>Managed switches</div>
                <div style={{ fontWeight: 700 }}>{managedSwitches.length}</div>
              </div>
              <div style={{ background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: 4 }}>Installed flows</div>
                <div style={{ fontWeight: 700 }}>{policyFlows.length + flowRules.length}</div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: 4 }}>Policies</div>
                <div style={{ fontWeight: 700 }}>{policies.length}</div>
              </div>
              <div style={{ background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: 4 }}>Endpoints</div>
                <div style={{ fontWeight: 700 }}>{model?.endpointCount ?? 0}</div>
              </div>
              <div style={{ background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: 4 }}>Topology score</div>
                <div style={{ fontWeight: 700 }}>{topologyScore?.overall ?? 0}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: tabs for policies / flows / failure / score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
             {[
              { id: 'overview', label: 'Overview' },
              { id: 'policies', label: 'Policies' },
              { id: 'flows', label: 'Flow Table' },
              { id: 'traffic', label: 'Traffic Test' },
              { id: 'failure', label: 'Failure' },
              { id: 'log', label: 'Event Log' },
            ].map((tab) => (
              <button key={tab.id} className={`btn btn-ghost btn-sm ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="panel" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>What Changed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: 'var(--c-text-muted)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: 'var(--c-text)' }}>Before:</strong> each switch makes forwarding decisions locally.
                </div>
                <div>
                  <strong style={{ color: 'var(--c-text)' }}>After:</strong> the controller maintains a logical view of the network and programs forwarding rules.
                </div>
                <div>
                  Control plane = controller decisions. Data plane = switch forwarding.
                </div>
              </div>
              {scenario?.sdnOpportunities?.length ? (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {scenario.sdnOpportunities.map((opp) => (
                    <div key={opp.id} style={{ fontSize: '0.84rem', color: 'var(--c-text-muted)' }}>
                      <strong>{opp.label}:</strong> {opp.description}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="panel" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Traffic Policies</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <select className="field" value={sourceGroup} onChange={(e) => setSourceGroup(e.target.value)}>
                  {TRAFFIC_GROUPS.map((g) => (<option key={g.id} value={g.id}>{g.label}</option>))}
                </select>
                <span style={{ color: 'var(--c-text-dim)', alignSelf: 'center' }}>→</span>
                <select className="field" value={destinationGroup} onChange={(e) => setDestinationGroup(e.target.value)}>
                  {TRAFFIC_GROUPS.map((g) => (<option key={g.id} value={g.id}>{g.label}</option>))}
                </select>
                <select className="field" value={action} onChange={(e) => setAction(e.target.value)}>
                  {GROUP_ACTIONS.map((a) => (<option key={a.id} value={a.id}>{a.label}</option>))}
                </select>
                <button className="btn btn-accent btn-sm" onClick={handleAddPolicy} disabled={sourceGroup === destinationGroup}>Install Policy</button>
              </div>
              {policies.length === 0 && <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem', fontStyle: 'italic' }}>No policies installed yet.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {policies.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: '0.84rem' }}>
                    <span>{p.source} → {p.destination}: <span className="mono">{p.action}</span></span>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeSDNPolicy(p.id)}>✕</button>
                  </div>
                ))}
              </div>
              {policyScore && (
                <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--c-text-muted)' }}>
                  {policyScore.satisfied}/{policyScore.total} scenario requirements satisfied
                </div>
              )}
            </div>
          )}

          {activeTab === 'flows' && (
            <div className="panel" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Flow Table</div>
              {policyFlows.length === 0 && flowRules.length === 0 ? (
                <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem', fontStyle: 'italic' }}>No flow rules yet. Place the controller or install a policy.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--c-border)', color: 'var(--c-text-dim)' }}>
                        <th style={{ textAlign: 'left', padding: '6px 4px' }}>Priority</th>
                        <th style={{ textAlign: 'left', padding: '6px 4px' }}>Match</th>
                        <th style={{ textAlign: 'left', padding: '6px 4px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyFlows.slice(0, 24).map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                          <td style={{ padding: '6px 4px', color: 'var(--c-accent-soft)' }}>{r.priority}</td>
                          <td style={{ padding: '6px 4px', color: 'var(--c-text-muted)' }}>{r.match.sourceGroup} → {r.match.destinationGroup}</td>
                          <td style={{ padding: '6px 4px', color: r.action.type === 'drop' ? 'var(--c-danger)' : 'var(--c-success)' }}>{r.action.type.toUpperCase()}</td>
                        </tr>
                      ))}
                      {flowRules.slice(0, 24).map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                          <td style={{ padding: '6px 4px', color: 'var(--c-accent-soft)' }}>{r.priority}</td>
                          <td style={{ padding: '6px 4px', color: 'var(--c-text-muted)' }}>{r.match.sourceType}:{r.match.source}{r.match.vlan != null ? ` vlan=${r.match.vlan}` : ''}</td>
                          <td style={{ padding: '6px 4px', color: 'var(--c-success)' }}>FORWARD → {r.action.toward}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

           {activeTab === 'failure' && (
             <div className="panel" style={{ padding: 16 }}>
               <div className="eyebrow" style={{ marginBottom: 8 }}>Simulate a Link Failure</div>
               <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                 <select className="field" value={selectedEdge} onChange={(e) => setSelectedEdge(e.target.value)} style={{ flex: 1 }}>
                   <option value="">Choose a link…</option>
                   {edges.map((e) => (<option key={e.id} value={e.id}>{e.id} ({e.source} ↔ {e.target})</option>))}
                 </select>
                 <button className="btn btn-danger btn-sm" onClick={handleSimulateFailure} disabled={!selectedEdge}>Fail Link</button>
               </div>
               {sdnState.reroute && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.86rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <img src={uiAssets.bolt} alt="" style={{ width: '0.85rem', height: '0.85rem' }} />
                     <span>Controller recalculated {sdnState.reroute.affectedPaths.length} path(s)</span>
                   </div>
                   {sdnState.reroute.rerouted.map((r, i) => (
                     <div key={i} style={{ color: 'var(--c-success)' }}>{r.from} → {r.to}: rerouted via {r.newPath.join(' → ')}</div>
                   ))}
                   {sdnState.reroute.unreachable.map((u, i) => (
                     <div key={i} style={{ color: 'var(--c-danger)' }}>{u.from} → {u.to}: no alternate path</div>
                   ))}
                 </div>
               )}
             </div>
           )}

           {activeTab === 'log' && (
             <div className="panel" style={{ padding: 16 }}>
               <div className="eyebrow" style={{ marginBottom: 8 }}>SDN Event Log</div>
               {sdnEvents.length === 0 && (
                 <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem', fontStyle: 'italic' }}>No events yet. Place the controller or run a traffic test.</p>
               )}
               <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                 {sdnEvents.map((evt, i) => (
                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
                     <span className="mono" style={{ color: 'var(--c-text-dim)', fontSize: '0.7rem' }}>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                     <span className="chip" style={{ color: 'var(--c-accent)', fontSize: '0.7rem' }}>{evt.kind}</span>
                     <span style={{ color: 'var(--c-text-muted)' }}>{evt.detail}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}

          {activeTab === 'traffic' && (
            <div className="panel" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Traffic Test</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <select className="field" value={trafficFrom} onChange={(e) => setTrafficFrom(e.target.value)} style={{ flex: 1 }}>
                  <option value="">From…</option>
                  {trafficCandidates.map((c) => (<option key={c.id} value={c.id}>{c.label} ({c.type})</option>))}
                </select>
                <span style={{ color: 'var(--c-text-dim)', alignSelf: 'center' }}>→</span>
                <select className="field" value={trafficTo} onChange={(e) => setTrafficTo(e.target.value)} style={{ flex: 1 }}>
                  <option value="">To…</option>
                  {trafficCandidates.map((c) => (<option key={c.id} value={c.id}>{c.label} ({c.type})</option>))}
                </select>
                <button className="btn btn-accent btn-sm" onClick={handleTrafficTest} disabled={!trafficFrom || !trafficTo}>Test</button>
              </div>
              {!trafficResult && (
                <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem', fontStyle: 'italic' }}>
                  Select a source and destination to test controller behavior.
                </p>
              )}
              {trafficResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.86rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="chip" style={{ color: trafficResult.allowed ? 'var(--c-success)' : 'var(--c-danger)' }}>
                      {trafficResult.allowed ? 'ALLOWED' : 'DENIED'}
                    </span>
                    <span style={{ color: 'var(--c-text-muted)' }}>{trafficResult.reason}</span>
                  </div>
                  {trafficResult.path && (
                    <div>
                      <div style={{ color: 'var(--c-text-dim)', marginBottom: 4 }}>Path</div>
                      <div className="mono" style={{ color: 'var(--c-text-muted)' }}>{trafficResult.path.join(' → ')}</div>
                    </div>
                  )}
                  {trafficResult.policy && (
                    <div>
                      <div style={{ color: 'var(--c-text-dim)', marginBottom: 4 }}>Matched policy</div>
                      <div style={{ color: 'var(--c-text-muted)' }}>
                        {trafficResult.policy.source} → {trafficResult.policy.destination}: <span className="mono">{trafficResult.policy.action}</span>
                      </div>
                    </div>
                  )}
                  {trafficResult.flowRule && (
                    <div>
                      <div style={{ color: 'var(--c-text-dim)', marginBottom: 4 }}>Flow rule</div>
                      <div style={{ color: 'var(--c-text-muted)' }}>
                        switch <span className="mono">{trafficResult.flowRule.switchId}</span>: priority {trafficResult.flowRule.priority} → action <span className="mono">{trafficResult.flowRule.action.type.toUpperCase()}</span>
                      </div>
                    </div>
                  )}
                  {!trafficResult.path && (
                    <div style={{ color: 'var(--c-danger)' }}>No reachable path exists in the current topology.</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="panel" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>SDN Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: overallSDNScore >= 70 ? 'var(--c-success)' : 'var(--c-warning)' }}>{overallSDNScore}%</span>
              <span style={{ color: 'var(--c-text-dim)', fontSize: '0.88rem' }}>{sdnState?.controllerPlaced ? 'Controller active' : 'Controller not placed'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <span className="chip">Topology {topologyScore?.overall ?? 0}%</span>
              <span className="chip">Policies {policyScore?.overall ?? 0}%</span>
              <span className="chip">Switches {managedSwitches.length}</span>
            </div>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 12, width: '100%' }} onClick={handleContinue}>Continue to NFV →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="var(--c-text)" fontWeight="700">{meta?.shortName ?? n.type}</text>
          )}
          <text x={x} y={y + 34} textAnchor="middle" fontSize="9" fill="var(--c-text-dim)">{meta?.shortName ?? n.type}</text>
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
