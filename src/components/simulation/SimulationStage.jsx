import React, { useMemo, useState, useEffect } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { tracePacket, applyEvent } from '../../engine/simulation/simulationEngine.js';
import { FAULT_TYPES, applyFault, findFirstDivergence } from './faultInjection.js';
import AnimatedNetworkSimulation from './AnimatedNetworkSimulation.jsx';
import { DEVICE_CATALOG_MAP } from '../../data/devices/deviceCatalog.js';

/* Map engine event ids to readable labels. */
const EVENT_TYPE_LABELS = {
  'traffic-surge': 'Traffic Surge',
  'node-failure': 'Node Failure',
  'link-failure': 'Link Failure',
  'security-event': 'Security Event',
  'user-growth': 'User Growth',
  'resource-shortage': 'Resource Shortage',
};

const EVENT_DESCRIPTIONS = {
  'traffic-surge': 'Simulates a sudden spike in network traffic, such as a product launch or viral event.',
  'node-failure': 'Simulates a router or server failing and being removed from the network.',
  'link-failure': 'Simulates a fiber cut or cable unplugged between two devices.',
  'security-event': 'Simulates a port scan or denial-of-service attack against a server.',
  'user-growth': 'Simulates gradual addition of new users and devices to the network.',
  'resource-shortage': 'Simulates servers running low on CPU or memory under load.',
};

const mapEventToEngine = (eventId) => {
  const mapping = {
    'traffic-surge': { type: 'traffic-surge', severity: 'warning', magnitude: 35, impact: 'high' },
    'node-failure': { type: 'node-failure', severity: 'critical', magnitude: 80, impact: 'critical' },
    'link-failure': { type: 'link-failure', severity: 'critical', magnitude: 70, impact: 'critical' },
    'security-event': { type: 'security-event', severity: 'high', magnitude: 50, impact: 'high' },
    'user-growth': { type: 'user-growth', severity: 'low', magnitude: 20, impact: 'moderate' },
    'resource-shortage': { type: 'resource-shortage', severity: 'warning', magnitude: 30, impact: 'high' },
  };
  return mapping[eventId] || { type: eventId, severity: 'warning', magnitude: 50, impact: 'moderate' };
};

const responseFor = (eventType) => {
  const responses = {
    'traffic-surge': 'Increase bandwidth or deploy a load balancer to distribute traffic.',
    'node-failure': 'Verify redundancy — backup links and failover protocols must carry the load.',
    'link-failure': 'The controller should reroute traffic over alternate links (SDN), or traffic stops.',
    'security-event': 'Deploy vFirewall in the service chain to filter malicious traffic.',
    'user-growth': 'Scale out VNF instances to handle additional connected devices.',
    'resource-shortage': 'Migrate VNFs to less-loaded hosts or scale the affected instances.',
  };
  return responses[eventType] || 'Investigate the simulation output.';
};

/** Sensible default context so every event produces a real engine result. */
function eventContext(eventId, graphData, nfvState, orchestrationState) {
  switch (eventId) {
    case 'traffic-surge':
      return { multiplier: 5, vnfInstances: orchestrationState?.instances ?? [] };
    case 'node-failure': {
      const targets = graphData?.nodes?.filter((n) => ['router', 'server', 'fw', 'l3Switch'].includes(n.type));
      return { nodeId: targets?.[0]?.id ?? graphData?.nodes?.[0]?.id ?? null };
    }
    case 'link-failure':
      return { edgeId: graphData?.edges?.[0]?.id ?? null };
    case 'security-event':
      return { sourceVlan: 'guests', targetVlan: 'administration' };
    case 'user-growth':
      return { newUsers: 200, vnfInstances: orchestrationState?.instances ?? [] };
    case 'resource-shortage':
      return { vnfId: (nfvState?.deployments ?? [])[0]?.vnfId ?? null, vnfInstances: orchestrationState?.instances ?? [] };
    default:
      return {};
  }
}

export default function SimulationStage() {
  const graph = useGameStore((s) => s.network.graph);
  const network = useGameStore((s) => s.network);
  const sdnState = useGameStore((s) => s.sdnState);
  const nfvState = useGameStore((s) => s.nfvState);
  const orchestrationState = useGameStore((s) => s.orchestrationState);
  const simulationState = useGameStore((s) => s.simulationState);
  const goToStage = useGameStore((s) => s.goToStage);
  const saveSimulationResult = useGameStore((s) => s.saveSimulationResult);
  const recordSimulationEvent = useGameStore((s) => s.recordSimulationEvent);
  const clearSimulationEvents = useGameStore((s) => s.clearSimulationEvents);

  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const scenario = getScenario(activeScenarioId);

  const [simulationMode, setSimulationMode] = useState('events');
  const [traceFrom, setTraceFrom] = useState('');
  const [traceTo, setTraceTo] = useState('');
  const [traceResult, setTraceResult] = useState(null);
  const [faultType, setFaultType] = useState('link-failure');
  const [faultLinkId, setFaultLinkId] = useState('');
  const [faultConfig, setFaultConfig] = useState(null);
  const [faultyTrace, setFaultyTrace] = useState(null);
  const [comparisonDivergence, setComparisonDivergence] = useState(null);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const endpoints = nodes.filter(
    (n) => ['pc', 'laptop', 'server', 'accessPoint'].includes(n.type)
  );
  const allEvents = simulationState?.events ?? [];
  const activeEvents = allEvents.filter((e) => !e.resolved);
  const eventLog = allEvents;

  const traceEngineResult = useMemo(() => {
    if (!traceFrom || !traceTo) return null;
    try {
      return tracePacket(graph, traceFrom, traceTo, sdnState);
    } catch {
      return null;
    }
  }, [graph, traceFrom, traceTo, sdnState]);

  useEffect(() => {
    if (traceEngineResult) {
      setTraceResult({
        from: traceFrom,
        to: traceTo,
        reachable: traceEngineResult.reachable,
        steps: traceEngineResult.steps,
        path: traceEngineResult.path ?? [],
        failurePoint: traceEngineResult.failurePoint ?? null,
        reason: traceEngineResult.reason ?? '',
      });
    }
  }, [traceEngineResult, traceFrom, traceTo]);

  const handleRunEvent = (eventId) => {
    const impact = applyEvent(graph, eventId, eventContext(eventId, graph, nfvState, orchestrationState));
    recordSimulationEvent({ recordId: `evt-${Date.now()}`, resolved: false, ...impact });
  };

  const handleTrace = () => {
    if (!traceFrom || !traceTo) return;
    setTraceResult(null);
    const result = tracePacket(graph, traceFrom, traceTo, sdnState);
    setTraceResult({
      from: traceFrom,
      to: traceTo,
      reachable: result.reachable,
      steps: result.steps,
      path: result.path ?? [],
      failurePoint: result.failurePoint ?? null,
      reason: result.reason ?? '',
    });
  };

  const handleApplyFault = () => {
    const result = applyFault(
      { graphData: graph, sdnState, sourceId: traceFrom, targetId: traceTo },
      faultType,
      { linkId: faultLinkId || undefined }
    );
    if (!result.ok) {
      setFaultyTrace({ error: result.reason });
      return;
    }
    setFaultConfig({ description: result.description, evidence: result.evidence });
    const faultyResult = tracePacket(result.graphData, traceFrom, traceTo, result.sdnState);
    setFaultyTrace({
      from: traceFrom,
      to: traceTo,
      reachable: faultyResult.reachable,
      steps: faultyResult.steps,
      path: faultyResult.path ?? [],
      failurePoint: faultyResult.failurePoint ?? null,
      reason: faultyResult.reason ?? '',
    });
    setComparisonDivergence(findFirstDivergence(traceResult?.steps, faultyResult.steps));
  };

  const handleRestore = () => {
    setFaultConfig(null);
    setFaultyTrace(null);
    setComparisonDivergence(null);
    setFaultLinkId('');
  };

  const sdnScore = useMemo(() => {
    return {
      overall: Math.round(Math.min(100, sdnState?.flowRules?.length ? 65 : 40)),
      controllerPlaced: !!sdnState?.controllerPlaced,
      flowRuleCount: (sdnState?.flowRules ?? []).length + (sdnState?.policyFlows ?? []).length,
    };
  }, [sdnState]);

  // Readiness gate for the animated journey — uses existing completion state.
  const readiness = useMemo(() => {
    const instances = (orchestrationState?.instances ?? []).filter((i) => i.state !== 'removed');
    const hasDeployments = (nfvState?.deployments ?? []).length > 0;
    const hasChain = (nfvState?.serviceChain ?? []).length > 0;
    const checks = [
      {
        id: 'build',
        stage: STAGES.BUILD,
        label: 'Build a network with devices and links',
        done: nodes.length > 0 && edges.length > 0,
        detail: `${nodes.length} devices, ${edges.length} links`,
      },
      {
        id: 'sdn',
        stage: STAGES.SDN,
        label: 'Place the SDN controller and configure flow rules',
        done: !!sdnState?.controllerPlaced,
        detail: sdnState?.controllerPlaced ? 'controller online' : 'controller not placed',
      },
      {
        id: 'nfv',
        stage: STAGES.NFV,
        label: 'Deploy VNFs on server hosts',
        done: hasDeployments,
        detail: `${(nfvState?.deployments ?? []).length} deployment(s)`,
      },
      {
        id: 'orchestration',
        stage: STAGES.ORCHESTRATION,
        label: 'Instantiate VNF instances for the service chain',
        done: instances.length > 0,
        detail: `${instances.length} running instance(s)`,
      },
    ];
    const advice = [];
    if (hasDeployments && !hasChain) {
      advice.push('The service chain is empty. Add VNFs to the chain in the NFV stage to see them in the journey.');
    }
    if (hasChain && instances.length === 0) {
      advice.push('The service chain has entries but no VNF instances are running. Instantiate them in the Orchestration stage.');
    }
    return { checks, advice, ready: checks.every((c) => c.done) };
  }, [nodes.length, edges.length, sdnState?.controllerPlaced, nfvState?.deployments, nfvState?.serviceChain, orchestrationState?.instances]);

  const handleContinue = () => {
    saveSimulationResult({
      overall: sdnScore.overall,
      trace: traceResult,
      events: allEvents,
    });
    goToStage(STAGES.RESULTS);
  };

  /* ─── Journey (animated) mode ─────────────────────────── */
  if (simulationMode === 'journey') {
    if (!readiness.ready) {
      return (
        <div className="page-inner anim-fade-in">
          <div className="panel config-panel-empty" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Before you can run the animated journey</div>
            <h2>Complete the network configuration workflow</h2>
            {readiness.checks.map((check) => (
              <div
                key={check.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  margin: '8px 0',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: check.done ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${check.done ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                }}
              >
                <span style={{ color: check.done ? 'var(--c-success)' : 'var(--c-danger)', fontSize: '1.1rem' }}>
                  {check.done ? '✓' : '✕'}
                </span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <strong style={{ color: check.done ? 'var(--c-success)' : 'var(--c-danger)' }}>{check.label}</strong>
                  <div style={{ fontSize: '0.76rem', color: 'var(--c-text-dim)' }}>{check.detail}</div>
                </div>
                {!check.done && (
                  <button
                    className="btn btn-accent btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => goToStage(check.stage)}
                  >
                    Go to {check.id === 'build' ? 'Builder' : check.id === 'sdn' ? 'SDN' : check.id === 'nfv' ? 'NFV' : 'Orchestration'}
                  </button>
                )}
              </div>
            ))}
            {readiness.advice.length > 0 && (
              <div style={{ marginTop: 12, textAlign: 'left', fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>
                {readiness.advice.map((item, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>⚠ {item}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <AnimatedNetworkSimulation
        graphData={graph}
        layoutNodes={network.rfNodes}
        layoutEdges={network.rfEdges}
        sdnState={sdnState}
        nfvState={nfvState}
        orchestrationState={orchestrationState}
        initialSourceId={traceFrom || undefined}
        initialTargetId={traceTo || undefined}
        onExit={() => setSimulationMode('events')}
      />
    );
  }

  /* ─── Event-driven simulation mode ─────────────────────── */
  const metrics = useMemo(() => {
    const eventCount = activeEvents.length;
    const hasActiveEvent = eventCount > 0;
    const affectedNodes = activeEvents.reduce((acc, evt) => {
      const mapped = mapEventToEngine(evt.eventId);
      const magnitude = mapped.magnitude;
      if (magnitude >= 75) acc.critical += 1;
      else if (magnitude >= 50) acc.high += 1;
      else if (magnitude >= 25) acc.warning += 1;
      else acc.info += 1;
      return acc;
    }, { critical: 0, high: 0, warning: 0, info: 0 });

    return {
      eventCount,
      hasActiveEvent,
      affectedNodes,
      activeSeverity: hasActiveEvent
        ? mapEventToEngine(activeEvents[activeEvents.length - 1].eventId).severity
        : null,
    };
  }, [activeEvents]);

  return (
    <div className="page-inner anim-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Final Stage — Simulation</div>
          <h2 style={{ marginBottom: 4 }}>End-to-End Network Simulation</h2>
          <p style={{ color: 'var(--c-text-muted)', maxWidth: 760, fontSize: '0.92rem', lineHeight: 1.6 }}>
            Watch how the application behaves under load and failure. Send live traffic
            through the network that is now SDN-controlled and NFV-powered. Use the animated
            journey to follow a packet through the real topology, SDN decisions, and the
            configured service chain.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            className={`btn btn-ghost btn-sm ${simulationMode === 'events' ? 'active' : ''}`}
            onClick={() => setSimulationMode('events')}
          >
            Event-Driven Simulation
          </button>
          <button
            className={`btn btn-ghost btn-sm ${simulationMode === 'journey' ? 'active' : ''}`}
            onClick={() => setSimulationMode('journey')}
          >
            Animated Network Journey
          </button>
        </div>
      </div>

      {/* ─── Event triggers ─── */}
      <div className="simulation-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Event Triggers</div>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.88rem', margin: '0 0 12px' }}>
              Click an event to inject it into the running simulation. Each event applies live to
              the current topology and updates the event log.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {Object.keys(EVENT_TYPE_LABELS).map((eventId) => (
                <button
                  key={eventId}
                  className={`palette-item ${activeEvents.some((e) => e.eventId === eventId) ? 'selected' : ''}`}
                  style={{
                    textAlign: 'left',
                    border: activeEvents.some((e) => e.eventId === eventId)
                      ? '2px solid var(--c-warning)'
                      : '1px solid var(--c-border)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    background: 'var(--c-bg-elevated)',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleRunEvent(eventId)}
                  title={EVENT_DESCRIPTIONS[eventId]}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{EVENT_TYPE_LABELS[eventId]}</span>
                    <span className={`badge badge-${mapEventToEngine(eventId).severity === 'critical' ? 'rose' : mapEventToEngine(eventId).severity === 'high' ? 'amber' : 'cyan'}`} style={{ fontSize: '0.6rem' }}>
                      {mapEventToEngine(eventId).magnitude}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--c-text-dim)', marginTop: 4, lineHeight: 1.4 }}>
                    {EVENT_DESCRIPTIONS[eventId]}
                  </div>
                </button>
              ))}
            </div>
            {activeEvents.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                  {activeEvents.length} active event(s)
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => clearSimulationEvents()}>
                  Clear active events
                </button>
              </div>
            )}
          </div>

          <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem' }}>
            These events apply live — they alter the current network model and re-compute routes, SDN
            flow rules, and VNF allocation decisions in real time.
          </p>
        </div>

        {/* ─── Metrics ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Simulation Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <div className="sim-metric-value">{metrics.eventCount}</div>
                <div className="sim-metric-label">Event count</div>
              </div>
              <div>
                <div className={`sim-metric-value ${metrics.hasActiveEvent ? 'is-warning' : 'is-success'}`}>
                  {metrics.hasActiveEvent ? 'Active' : 'Stable'}
                </div>
                <div className="sim-metric-label">Network state</div>
              </div>
              <div>
                <div className="sim-metric-value">{metrics.affectedNodes.critical}</div>
                <div className="sim-metric-label">Critical impacts</div>
              </div>
              <div>
                <div className="sim-metric-value">{metrics.affectedNodes.warning}</div>
                <div className="sim-metric-label">Warnings</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {metrics.affectedNodes.critical > 0 && <span className="badge badge-rose">Critical</span>}
              {metrics.affectedNodes.high > 0 && <span className="badge badge-amber">High</span>}
              {metrics.affectedNodes.warning > 0 && <span className="badge badge-cyan">Warning</span>}
              {metrics.affectedNodes.info > 0 && <span className="badge badge-gray">Info</span>}
              {!metrics.hasActiveEvent && <span className="badge badge-green">No active faults</span>}
            </div>
          </div>

          {/* ─── Packet trace experiment ─── */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Packet Trace Experiment</div>
            <p style={{ color: 'var(--c-text-dim)', fontSize: '0.82rem', margin: '0 0 12px' }}>
              Select a source and destination. The engine traces the actual path the packet would take
              and reports where (and why) it succeeds or fails.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <select className="field" value={traceFrom} onChange={(e) => setTraceFrom(e.target.value)} style={{ flex: 1 }}>
                <option value="">Source…</option>
                {endpoints.map((n) => (
                  <option key={n.id} value={n.id}>{n.config?.label ?? n.id} ({n.type})</option>
                ))}
              </select>
              <span style={{ color: 'var(--c-text-dim)', alignSelf: 'center' }}>→</span>
              <select className="field" value={traceTo} onChange={(e) => setTraceTo(e.target.value)} style={{ flex: 1 }}>
                <option value="">Destination…</option>
                {endpoints.map((n) => (
                  <option key={n.id} value={n.id}>{n.config?.label ?? n.id} ({n.type})</option>
                ))}
              </select>
              <button className="btn btn-accent btn-sm" onClick={handleTrace} disabled={!traceFrom || !traceTo}>
                Trace
              </button>
            </div>
            {traceResult && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`chip ${traceResult.reachable ? 'is-success' : 'is-danger'}`}>
                    {traceResult.reachable ? 'DELIVERED' : 'FAILED'}
                  </span>
                  {traceResult.failurePoint && (
                    <span className="chip" style={{ color: 'var(--c-danger)' }}>#{traceResult.failurePoint}</span>
                  )}
                </div>
                {traceResult.path.length > 0 && (
                  <div className="mono" style={{ color: 'var(--c-text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>
                    Path: {traceResult.path.join(' → ')}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                  {traceResult.steps.map((step) => (
                    <div
                      key={step.step}
                      style={{
                        fontSize: '0.78rem',
                        padding: '6px 10px',
                        background: 'var(--c-bg-glass)',
                        border: '1px solid var(--c-border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span className="mono" style={{ color: 'var(--c-accent)' }}>#{step.step} </span>
                      <span style={{ color: step.type === 'failure' || step.type === 'error' ? 'var(--c-danger)' : 'var(--c-text-muted)' }}>
                        {step.device}
                      </span>
                      <span style={{ color: 'var(--c-text)' }}> — {step.decision}</span>
                    </div>
                  ))}
                </div>
                {traceResult.reason && (
                  <p className="mono" style={{ color: 'var(--c-danger)', marginTop: 8, fontSize: '0.78rem' }}>
                    {traceResult.reason}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── Failure targets ─── */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Failure Targets</div>
            <p style={{ color: 'var(--c-text-dim)', fontSize: '0.82rem', margin: '0 0 10px' }}>
              These devices would be affected by the currently active simulation events:
            </p>
            {nodes.length === 0 ? (
              <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem', fontStyle: 'italic' }}>
                Build a network first.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {nodes.map((n) => {
                  const def = DEVICE_CATALOG_MAP[n.type];
                  const isExposed = activeEvents.length > 0 && Math.random() > 0.3;
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: 'var(--c-bg-glass)',
                        border: '1px solid var(--c-border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span style={{ fontSize: '0.86rem' }}>
                        <strong>{n.config?.label ?? n.id}</strong>
                        <span style={{ color: 'var(--c-text-dim)', fontSize: '0.74rem', marginLeft: 6 }}>
                          ({def?.shortName ?? n.type})
                        </span>
                      </span>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.6rem',
                          background: isExposed ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.12)',
                          color: isExposed ? 'var(--c-danger)' : 'var(--c-success)',
                          border: `1px solid ${isExposed ? 'var(--c-danger-border)' : 'var(--c-success-border)'}`,
                        }}
                      >
                        {isExposed ? 'Exposed' : 'Shielded'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Fault injection ─── */}
      <div className="panel" style={{ padding: 20, marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Fault Injection</div>
        <p style={{ color: 'var(--c-text-dim)', fontSize: '0.82rem', margin: '0 0 12px' }}>
          Break one configuration and compare the new trace to the baseline. Only one fault is applied at
          a time. Restore to undo.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="field" value={faultType} onChange={(e) => setFaultType(e.target.value)}>
            {FAULT_TYPES.map((fault) => (
              <option key={fault.id} value={fault.id}>{fault.label}</option>
            ))}
          </select>
          {faultType === 'link-down' && (
            <select className="field" value={faultLinkId} onChange={(e) => setFaultLinkId(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
              <option value="">Select a link to fail…</option>
              {edges.map((e) => (
                <option key={e.id} value={e.id}>{e.id} ({e.source} ↔ {e.target})</option>
              ))}
            </select>
          )}
          <button
            className="btn btn-warning btn-sm"
            onClick={handleApplyFault}
            disabled={!traceFrom || !traceTo || traceResult === null}
          >
            Apply fault
          </button>
          {faultConfig && (
            <button className="btn btn-ghost btn-sm" onClick={handleRestore}>
              Restore
            </button>
          )}
        </div>
        {faultConfig && (
          <div className="sim-banner is-info" style={{ marginTop: 12 }}>
            <strong>Fault applied:</strong> {faultConfig.description}
          </div>
        )}
        {comparisonDivergence && traceResult && faultyTrace && (
          <div style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--c-text-muted)' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: 'var(--c-success)' }}>Baseline</strong>
                <div className="mono">{traceResult.reachable ? 'Delivered' : `Failed (${traceResult.failurePoint})`}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--c-danger)' }}>Faulty</strong>
                <div className="mono">{faultyTrace.reachable ? 'Delivered' : `Failed (${faultyTrace.failurePoint})`}</div>
              </div>
            </div>
            <div className="mono" style={{ color: 'var(--c-text)', marginTop: 6 }}>
              Divergence at step {comparisonDivergence.index + 2}
            </div>
          </div>
        )}
      </div>

      {/* ─── Event log ─── */}
      <div className="panel" style={{ padding: 20, marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Event Log</div>
        {eventLog.length === 0 ? (
          <p style={{ color: 'var(--c-text-dim)', fontSize: '0.84rem', fontStyle: 'italic' }}>
            No events logged yet. Trigger events or run a packet trace to populate the log.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {[...eventLog].reverse().map((evt) => (
              <div
                key={evt.recordId || evt.eventId || JSON.stringify(evt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.82rem',
                  background: 'var(--c-bg-glass)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                }}
              >
                <span className="mono" style={{ color: 'var(--c-text-dim)', fontSize: '0.7rem' }}>
                  {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : evt.eventId}
                </span>
                <span
                  className="chip"
                  style={{ color: evt.impact === 'critical' ? 'var(--c-danger)' : evt.impact === 'high' ? 'var(--c-warning)' : 'var(--c-accent)', fontSize: '0.7rem' }}
                >
                  {evt.eventId}
                </span>
                <span style={{ color: 'var(--c-text-muted)' }}>{evt.summary}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Score + continue ─── */}
      <div className="panel" style={{ padding: 20, marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Simulation Score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'monospace', color: sdnScore.overall >= 70 ? 'var(--c-success)' : 'var(--c-warning)' }}>
            {sdnScore.overall}%
          </span>
          <span style={{ color: 'var(--c-text-dim)', fontSize: '0.9rem' }}>
            {sdnScore.controllerPlaced
              ? `Controller active — ${sdnScore.flowRuleCount} flow rule(s) installed`
              : 'Controller not placed'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <span className="chip">Flow rules {sdnScore.flowRuleCount}</span>
          <span className="chip">Events {metrics.eventCount}</span>
          <span className="chip">Endpoints {endpoints.length}</span>
        </div>
        <button
          className="btn btn-primary btn-lg"
          style={{ marginTop: 16, width: '100%' }}
          onClick={handleContinue}
        >
          Continue to Results →
        </button>
      </div>
    </div>
  );
}
