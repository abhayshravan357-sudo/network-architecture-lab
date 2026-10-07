import React, { useMemo, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { applyEvent, scoreSimulation } from '../../engine/simulation/simulationEngine.js';
import { computeReroute } from '../../engine/sdn/sdnEngine.js';
import { scaleInstance } from '../../engine/orchestration/orchestratorEngine.js';
import { DEVICE_CATALOG_MAP } from '../../data/devices/deviceCatalog.js';
import { simulationAssets } from '../../assets/assetMap.js';

/** Map a scenario event id to the simulation engine's event vocabulary. */
function mapEventToEngine(eventId) {
  const id = eventId.toLowerCase();
  if (id.includes('traffic') || id.includes('surge') || id.includes('occupancy')) return 'traffic-surge';
  if (id.includes('link') || id.includes('wan')) return 'link-failure';
  if (id.includes('breach') || id.includes('security') || id.includes('unauthorized')) return 'security-event';
  if (id.includes('overload') || id.includes('congestion') || id.includes('exhaust')) return 'resource-shortage';
  if (id.includes('growth') || id.includes('users')) return 'user-growth';
  if (id.includes('failure') || id.includes('down') || id.includes('crash')) return 'node-failure';
  return 'traffic-surge';
}

/**
 * Simulation Stage — run dynamic events against the
 * architecture and respond to them.
 */
export default function SimulationStage() {
  const graph = useGameStore((s) => s.network.graph);
  const orchestrationState = useGameStore((s) => s.orchestrationState);
  const simulationState = useGameStore((s) => s.simulationState);
  const goToStage = useGameStore((s) => s.goToStage);
  const recordSimulationEvent = useGameStore((s) => s.recordSimulationEvent);
  const resolveSimulationEvent = useGameStore((s) => s.resolveSimulationEvent);
  const setSimulationGraph = useGameStore((s) => s.setSimulationGraph);
  const updateInstance = useGameStore((s) => s.updateInstance);
  const saveSimulationResult = useGameStore((s) => s.saveSimulationResult);

  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');

  const activeScenario = useMemo(() => getScenario(useGameStore.getState().activeScenarioId), []);
  const events = activeScenario?.simulationEvents ?? [];

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const currentGraph = simulationState?.graphAfter ?? { nodes, edges };
  const currentNodes = currentGraph.nodes ?? [];
  const currentEdges = currentGraph.edges ?? [];
  const recorded = simulationState?.events ?? [];

  const vnfInstances = (orchestrationState?.instances ?? []).filter(
    (i) => i.state !== 'removed'
  );
  const infraNodes = currentNodes.filter((n) =>
    ['l2Switch', 'l3Switch', 'router', 'firewall', 'wirelessController'].includes(n.type)
  );

  const score = useMemo(() => scoreSimulation(recorded), [recorded]);

  if (nodes.length === 0) {
    return (
      <div className="page-inner anim-fade-in">
        <div className="panel config-panel-empty" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Simulation Stage</div>
          <h2>No network to simulate yet</h2>
          <p style={{ color: 'var(--c-text-muted)', margin: '12px 0 24px' }}>
            Build a traditional architecture first — simulations run against your design.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => goToStage(STAGES.BUILD)}>
            ← Back to Builder
          </button>
        </div>
      </div>
    );
  }

  const buildContext = (engineEvent) => {
    switch (engineEvent) {
      case 'node-failure': {
        const nodeId = selectedNodeId || infraNodes[0]?.id || currentNodes[0]?.id;
        return { nodeId };
      }
      case 'link-failure': {
        const edgeId = selectedEdgeId || currentEdges[Math.floor(currentEdges.length / 2)]?.id;
        return { edgeId };
      }
      case 'traffic-surge':
        return { vnfInstances, multiplier: 5 };
      case 'user-growth':
        return { vnfInstances, newUsers: 200 };
      case 'resource-shortage':
        return { vnfInstances, vnfId: vnfInstances[0]?.vnfId ?? 'vFirewall' };
      case 'security-event':
        return { sourceVlan: 'students', targetVlan: 'administration' };
      default:
        return {};
    }
  };

  const handleRunEvent = (event) => {
    const engineEvent = mapEventToEngine(event.id);
    const context = buildContext(engineEvent);
    const result = applyEvent(currentGraph, engineEvent, context);
    recordSimulationEvent({
      recordId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventId: engineEvent,
      scenarioEventId: event.id,
      label: event.label,
      timestamp: Date.now(),
      impact: result.impact,
      resolved: false,
      responseKind: null,
      summary: result.summary,
      details: result.details,
      graphAfter: result.graphAfter,
    });
    setSimulationGraph(result.graphAfter);
  };

  // ── Student responses ──────────────────────────────────
  // A failure response only resolves the event when the
  // post-event graph still provides endpoint→server reachability
  // (i.e. the controller actually found an alternate path).

  const graphHasConnectivity = (afterGraph) => {
    const endpoints = (afterGraph.nodes ?? []).filter((n) =>
      ['pc', 'laptop'].includes(n.type)
    );
    const targets = (afterGraph.nodes ?? []).filter((n) => n.type === 'server');
    if (endpoints.length === 0 || targets.length === 0) return true;
    for (const e of endpoints) {
      for (const t of targets) {
        if (computePathExists({ nodes: afterGraph.nodes, edges: afterGraph.edges }, e.id, t.id)) {
          return true;
        }
      }
    }
    return false;
  };

  const handleRerouteResponse = (record) => {
    const recovered = graphHasConnectivity(record.graphAfter);
    if (recovered) {
      resolveSimulationEvent(record.recordId, record.eventId === 'link-failure' ? 'reroute' : 'failover');
    }
  };

  const handleScaleResponse = (record) => {
    if (vnfInstances.length === 0) {
      resolveSimulationEvent(record.recordId, 'observe');
      return;
    }
    const scaled = vnfInstances.map((i) => scaleInstance(i));
    scaled.forEach(updateInstance);
    const stillOverloaded = scaled.some((i) => (i.load ?? 0) > i.throughput);
    resolveSimulationEvent(
      record.recordId,
      stillOverloaded ? 'scale-insufficient' : 'scale'
    );
  };

  const handleSecurityResponse = (record) => {
    const firewalls = nodes.filter((n) => n.type === 'firewall').length;
    const vlans = new Set(nodes.flatMap((n) => n.config?.vlans ?? [])).size;
    const enforced = firewalls > 0 || vlans >= 2;
    resolveSimulationEvent(
      record.recordId,
      enforced ? 'acl-verified' : 'no-policy'
    );
  };

  const responseFor = (record) => {
    if (record.eventId === 'link-failure' || record.eventId === 'node-failure') {
      return { label: '⚡ Reroute via SDN controller', fn: () => handleRerouteResponse(record) };
    }
    if (['traffic-surge', 'user-growth', 'resource-shortage'].includes(record.eventId)) {
      return { label: '📈 Scale VNFs', fn: () => handleScaleResponse(record) };
    }
    if (record.eventId === 'security-event') {
      return { label: '🔒 Verify segmentation & ACLs', fn: () => handleSecurityResponse(record) };
    }
    return null;
  };

  const handleContinue = () => {
    saveSimulationResult(scoreSimulation(recorded));
    goToStage(STAGES.RESULTS);
  };

  return (
    <div className="page-inner anim-fade-in">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Final Stage — Simulation</div>
        <h2>Run Network Simulations</h2>
        <p style={{ color: 'var(--c-text-muted)', maxWidth: 640, margin: '10px auto 0' }}>
          Networks change: traffic surges, links fail, attackers probe.
          Trigger events against your architecture and respond —
          this is where the design proves itself.
        </p>
      </div>

      <div className="simulation-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Event triggers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Trigger Events</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map((event) => {
                const engineEvent = mapEventToEngine(event.id);
                return (
                  <button
                    key={event.id}
                    className="btn btn-ghost"
                    style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                    onClick={() => handleRunEvent(event)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {simulationAssets[engineEvent] && (
                        <img
                          src={simulationAssets[engineEvent]}
                          alt=""
                          style={{ width: 26, height: 26, flexShrink: 0 }}
                          draggable={false}
                        />
                      )}
                      <span>
                        <span style={{ fontWeight: 700 }}>{event.label}</span>
                        <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--c-text-muted)', fontWeight: 400, marginTop: 2 }}>
                          {event.description}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ color: 'var(--c-text-dim)', fontSize: '0.78rem', margin: '12px 0 0' }}>
              Events apply to the current (post-event) network state. Failure effects persist
              until you reload the mission.
            </p>
          </div>

          {/* Target pickers for failure events */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Failure Targets (optional)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select className="field" value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)}>
                <option value="">Node failure: auto-pick infrastructure node</option>
                {infraNodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.id} ({n.type})</option>
                ))}
              </select>
              <select className="field" value={selectedEdgeId} onChange={(e) => setSelectedEdgeId(e.target.value)}>
                <option value="">Link failure: auto-pick a link</option>
                {currentEdges.map((e) => (
                  <option key={e.id} value={e.id}>{e.id} ({e.source} ↔ {e.target})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Event log + responses */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Event Log</div>
            {recorded.length === 0 ? (
              <p style={{ color: 'var(--c-text-dim)', fontSize: '0.88rem', fontStyle: 'italic' }}>
                No events yet — trigger one to see how your architecture responds.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                {[...recorded].reverse().map((record, i) => {
                  const response = record.resolved ? null : responseFor(record);
                  return (
                    <div
                      key={`${record.timestamp}-${i}`}
                      style={{
                        border: '1px solid var(--c-border)',
                        borderRadius: 10,
                        padding: 12,
                        background: 'var(--c-bg-elevated)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem' }}>
                          {simulationAssets[record.eventId] && (
                            <img
                              src={simulationAssets[record.eventId]}
                              alt=""
                              style={{ width: 22, height: 22, flexShrink: 0 }}
                              draggable={false}
                            />
                          )}
                          {record.label}
                        </span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.62rem',
                            background: record.impact === 'critical' || record.impact === 'high' ? 'var(--c-danger-bg)' : 'var(--c-bg-deep)',
                            color: record.impact === 'critical' || record.impact === 'high' ? 'var(--c-danger)' : 'var(--c-text-dim)',
                          }}
                        >
                          {record.impact.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--c-text-muted)' }}>{record.summary}</div>
                      {record.details?.brokenPaths && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--c-danger)', marginTop: 4 }}>
                          Broken paths: {record.details.brokenPaths.map((p) => `${p.from}→${p.to}`).join(', ')}
                        </div>
                      )}
                      {record.details?.affectedNodes && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--c-text-dim)', marginTop: 4 }}>
                          Lost connectivity: {record.details.affectedNodes.join(', ')}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        {record.resolved ? (
                          <span style={{ color: 'var(--c-success)', fontSize: '0.82rem' }}>
                            ✓ Handled — response: <span className="mono">{record.responseKind}</span>
                          </span>
                        ) : response ? (
                          <button className="btn btn-accent btn-sm" onClick={response.fn}>
                            {response.label}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--c-warning)', fontSize: '0.82rem' }}>△ Awaiting response</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Score */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Failure-Handling Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'monospace', color: score.overall >= 70 ? 'var(--c-success)' : 'var(--c-warning)' }}>
                {score.overall}%
              </span>
              <span style={{ color: 'var(--c-text-dim)', fontSize: '0.9rem' }}>{score.message}</span>
            </div>
            <div className="score-dimensions" style={{ marginTop: 12 }}>
              <div className="score-dimension"><span className="score-dimension-label">Response</span><span className="score-dimension-value">{score.response}%</span></div>
              <div className="score-dimension"><span className="score-dimension-label">Event coverage</span><span className="score-dimension-value">{score.coverage}%</span></div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 16, width: '100%' }} onClick={handleContinue}>
              View Final Learning Report →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** BFS path existence — small local helper for response checks. */
function computePathExists(graphData, fromId, toId) {
  const neighbors = new Map();
  for (const n of graphData.nodes ?? []) neighbors.set(n.id, []);
  for (const e of graphData.edges ?? []) {
    if (neighbors.has(e.source) && neighbors.has(e.target)) {
      neighbors.get(e.source).push(e.target);
      neighbors.get(e.target).push(e.source);
    }
  }
  const visited = new Set();
  const queue = [fromId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of neighbors.get(current) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return false;
}
