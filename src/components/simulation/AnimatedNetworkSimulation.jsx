/**
 * Animated Network Simulation — the end-to-end packet journey.
 *
 * Visualisation layer over the network engine:
 *   - topology = the learner's real project (ReactFlow layout or fallback),
 *   - packet movement follows links the engine actually selected,
 *   - decisions / explanations / failures come from the engine's run,
 *   - events are generated once per configuration and only played back here.
 *
 * journeyEvents.js builds events, useJourneyPlayback.js owns playback state,
 * this file renders. useJourneyFlow and FaultExperiment are kept in this file
 * for now but are self-contained and can be moved out as-is.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

import { NetworkGraph } from '../../engine/graph/graphModel.js';
import { buildJourneyRun, journeySignature } from '../../engine/simulation/journeyEvents.js';
import { JOURNEY_LAYERS } from '../../engine/simulation/journeyEventTypes.js';
import SimDeviceNode from './SimDeviceNode.jsx';
import SimLinkEdge from './SimLinkEdge.jsx';
import SimTimeline from './SimTimeline.jsx';
import SimInspector from './SimInspector.jsx';
import SimPlaybackToolbar from './SimPlaybackToolbar.jsx';
import { useJourneyPlayback } from './useJourneyPlayback.js';
import { fallbackPositions, positionsBounds } from './graphLayout.js';
import { FAULT_TYPES, applyFault, findFirstDivergence, linkOptions } from './faultInjection.js';

const ENDPOINT_TYPES = ['pc', 'laptop', 'server', 'accessPoint'];
const SWITCH_TYPES = ['l2Switch', 'l3Switch'];
const CONTROLLER_ID = 'sdn-controller';

const nodeTypes = { simDevice: SimDeviceNode };
const edgeTypes = { simLink: SimLinkEdge };

/** OS reduced-motion preference (with legacy Safari fallback). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const onChange = (event) => setReduced(event.matches);
    if (query.addEventListener) query.addEventListener('change', onChange);
    else query.addListener?.(onChange);
    return () => {
      if (query.removeEventListener) query.removeEventListener('change', onChange);
      else query.removeListener?.(onChange);
    };
  }, []);
  return reduced;
}

/** Everything the journey needs from the three later stages. */
function collectState({ graphData, sdnState, nfvState, orchestrationState }) {
  const graph = NetworkGraph.fromJSON(graphData ?? { nodes: [], edges: [] });
  const nodes = graph.getNodes();
  const deployments = nfvState?.deployments ?? [];
  const serviceChain = nfvState?.serviceChain ?? [];
  const instances = (orchestrationState?.instances ?? []).filter((i) => i.state !== 'removed');

  const vnfByHost = new Map();
  serviceChain.forEach((entry, index) => {
    const deployment = deployments.find((d) => d.id === entry.id) ?? entry;
    if (!deployment.hostNodeId) return;
    if (!vnfByHost.has(deployment.hostNodeId)) vnfByHost.set(deployment.hostNodeId, []);
    vnfByHost.get(deployment.hostNodeId).push({
      vnfId: deployment.vnfId,
      chainPosition: index + 1,
      running: instances.some((i) => i.vnfId === deployment.vnfId && i.hostNodeId === deployment.hostNodeId),
    });
  });

  const chainHosts = serviceChain
    .map((entry) => (deployments.find((d) => d.id === entry.id) ?? entry).hostNodeId)
    .filter(Boolean);

  return {
    graph,
    nodes,
    endpoints: nodes.filter((n) => ENDPOINT_TYPES.includes(n.type)),
    switches: nodes.filter((n) => SWITCH_TYPES.includes(n.type)).map((n) => n.id),
    controllerPlaced: sdnState?.controllerPlaced === true,
    vnfByHost,
    chainHosts,
    instances,
  };
}

/**
 * Builds ReactFlow nodes/edges for the current playback position.
 * The structural layer depends on playback.index; the animation clock is
 * applied afterwards to the single active edge only, so a tick no longer
 * rebuilds every node and edge.
 */
function useJourneyFlow({
  state, positions, graphData, run, playback, sourceId, targetId, showLabels, onSelectNode, onSelectEdge,
}) {
  const { index, currentEvent: current, clock } = playback;

  const { flowNodes, baseEdges } = useMemo(() => {
    const traversedNodes = new Set();
    const traversedLinks = new Set();
    let droppedNodeId = null;
    let dropLinkId = null;
    let lastLinkId = null;
    const events = run?.events ?? [];

    for (let i = 0; i <= index && i < events.length; i += 1) {
      const event = events[i];
      if (event.fromId) traversedNodes.add(event.fromId);
      if (event.toId) traversedNodes.add(event.toId);
      if (event.deviceId) traversedNodes.add(event.deviceId);
      if (event.linkId) {
        traversedLinks.add(event.linkId);
        lastLinkId = event.linkId;
      }
      if (event.type === 'PACKET_DROPPED') {
        droppedNodeId = event.deviceId;
        dropLinkId = lastLinkId; // only the link the packet died on
      }
    }

    const activeLinkId = current?.linkId ?? null;
    const activeNodeId = current ? (current.linkId ? current.toId : current.deviceId) : null;
    const packetRestNodeId = current && !current.linkId && current.deviceId !== CONTROLLER_ID ? current.deviceId : null;

    const nodes = state.nodes.map((node) => {
      const position = positions[node.id] ?? fallbackPositions([node])[node.id];
      let status = 'idle';
      if (node.id === droppedNodeId) status = 'drop';
      else if (node.id === activeNodeId) status = 'active';
      else if (traversedNodes.has(node.id)) status = 'traversed';

      let roleLabel = null;
      if (node.id === sourceId) roleLabel = 'SOURCE';
      else if (node.id === targetId) roleLabel = 'DESTINATION';

      return {
        id: node.id,
        type: 'simDevice',
        position,
        data: {
          id: node.id,
          type: node.type,
          label: node.config?.label ?? node.id,
          ip: node.config?.ip,
          interfaces: node.config?.interfaces,
          vlans: node.config?.vlans,
          status,
          roleLabel,
          packetHere: node.id === packetRestNodeId,
          isActive: node.id === activeNodeId,
          vnfBadges: state.vnfByHost.get(node.id) ?? [],
          onSelect: onSelectNode,
        },
        selectable: true,
      };
    });

    if (state.controllerPlaced) {
      const bounds = positionsBounds(positions);
      const controllerActive = current?.deviceId === CONTROLLER_ID || current?.layer === JOURNEY_LAYERS.CONTROL;
      nodes.push({
        id: CONTROLLER_ID,
        type: 'simDevice',
        position: { x: bounds.centerX, y: Math.max(20, bounds.topY - 110) },
        data: {
          id: CONTROLLER_ID,
          role: 'controller',
          managedCount: state.switches.length,
          isActive: controllerActive,
          onSelect: onSelectNode,
        },
        selectable: true,
      });
    }

    const edges = [];
    for (const edge of graphData?.edges ?? []) {
      const isActive = edge.id === activeLinkId;
      let status = 'idle';
      if (isActive) status = 'active';
      else if (edge.id === dropLinkId) status = 'drop';
      else if (traversedLinks.has(edge.id)) status = 'traversed';

      edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'simLink',
        data: {
          variant: 'link',
          status,
          active: isActive,
          direction: current && isActive ? (edge.source === current.fromId ? 1 : -1) : 1,
          label: showLabels && isActive ? 'packet' : null,
          onSelect: onSelectEdge,
        },
      });
    }

    if (state.controllerPlaced) {
      for (const switchId of state.switches) {
        if (!state.nodes.some((n) => n.id === switchId)) continue;
        const controlActive = current?.layer === JOURNEY_LAYERS.CONTROL && current?.deviceId === switchId;
        edges.push({
          id: `control-${switchId}`,
          source: CONTROLLER_ID,
          target: switchId,
          type: 'simLink',
          data: { variant: 'control', status: controlActive ? 'active' : 'idle', label: null },
        });
      }
    }

    for (let i = 0; i < state.chainHosts.length - 1; i += 1) {
      const from = state.chainHosts[i];
      const to = state.chainHosts[i + 1];
      if (!state.nodes.some((n) => n.id === from) || !state.nodes.some((n) => n.id === to)) continue;
      edges.push({
        id: `chain-${i}-${from}-${to}`,
        source: from,
        target: to,
        type: 'simLink',
        data: { variant: 'chain', order: i + 1, status: 'idle', label: null },
      });
    }

    return { flowNodes: nodes, baseEdges: edges };
  }, [state, positions, graphData, run, index, current, sourceId, targetId, showLabels, onSelectNode, onSelectEdge]);

  // Per-tick layer: only the active edge gets a new object.
  const flowEdges = useMemo(
    () => baseEdges.map((e) => (e.data?.active ? { ...e, data: { ...e.data, clock } } : e)),
    [baseEdges, clock]
  );

  return { flowNodes, flowEdges };
}

/** Fault experiment panel with its own form state. */
function FaultExperiment({
  graphData, canRun, run, faultRun, faultError, divergence, viewMode, onViewMode, onRunFault, onClear, onRestore,
}) {
  const [faultType, setFaultType] = useState('link-down');
  const [faultLinkId, setFaultLinkId] = useState('');

  return (
    <details className="sim-faults">
      <summary>Fault experiment — break one thing and compare</summary>
      <div className="sim-faults-body">
        <p className="sim-faults-hint">
          A fault edits a real configuration value and re-computes the journey. The comparison below shows the
          first point where the two runs tell a different story.
        </p>
        <div className="sim-faults-row">
          <select className="field" value={faultType} onChange={(e) => setFaultType(e.target.value)}>
            {FAULT_TYPES.map((fault) => (
              <option key={fault.id} value={fault.id}>{fault.label}</option>
            ))}
          </select>
          {faultType === 'link-down' && (
            <select className="field" value={faultLinkId} onChange={(e) => setFaultLinkId(e.target.value)}>
              <option value="">First available link</option>
              {linkOptions(graphData).map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          )}
          <button
            className="btn btn-warning"
            onClick={() => onRunFault(faultType, faultLinkId || undefined)}
            disabled={!canRun}
          >
            Run faulty journey
          </button>
          {faultRun && (
            <>
              <button
                className={`btn btn-sm ${viewMode === 'baseline' ? 'btn-accent' : 'btn-ghost'}`}
                onClick={() => onViewMode('baseline')}
              >
                ▶ Animate baseline
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'faulty' ? 'btn-accent' : 'btn-ghost'}`}
                onClick={() => onViewMode('faulty')}
              >
                ▶ Animate faulty
              </button>
              <button className="btn btn-ghost" onClick={onClear}>Clear comparison</button>
            </>
          )}
        </div>

        <p className="sim-faults-description">
          {FAULT_TYPES.find((f) => f.id === faultType)?.description}
        </p>

        {faultError && <div className="sim-banner is-warning">{faultError}</div>}

        {faultRun && (
          <div className="sim-faults-result">
            <div className="sim-faults-columns">
              <div>
                <div className="sim-faults-column-title is-success">Baseline run</div>
                <div className="mono">{run?.outcome?.label ?? '—'}</div>
                <div className="sim-faults-note">{run?.outcome?.reason}</div>
              </div>
              <div>
                <div className="sim-faults-column-title is-danger">Faulty run</div>
                <div className="mono">{faultRun.outcome?.label ?? '—'}</div>
                <div className="sim-faults-note">{faultRun.outcome?.reason}</div>
              </div>
            </div>
            {faultRun.appliedFault && (
              <div className="sim-faults-evidence">
                <strong>What changed:</strong> {faultRun.appliedFault.description} ({faultRun.appliedFault.evidence})
              </div>
            )}
            {divergence ? (
              <div className="sim-faults-divergence">
                <strong>First divergence — event {divergence.index + 1}:</strong>
                <div className="sim-faults-line">
                  Baseline:{' '}
                  {divergence.baseline
                    ? `${divergence.baseline.type} @ ${divergence.baseline.deviceId} — ${divergence.baseline.decision}`
                    : 'run ended here'}
                </div>
                <div className="sim-faults-line">
                  Faulty:{' '}
                  {divergence.faulty
                    ? `${divergence.faulty.type} @ ${divergence.faulty.deviceId} — ${divergence.faulty.decision}`
                    : 'run ended here'}
                </div>
              </div>
            ) : (
              <div className="sim-faults-evidence">
                The two runs produced identical event sequences — this fault does not change this journey.
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onRestore}>
              Restore configuration and re-run baseline
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

export default function AnimatedNetworkSimulation({
  graphData,
  layoutNodes,
  layoutEdges, // eslint-disable-line no-unused-vars
  sdnState,
  nfvState,
  orchestrationState,
  initialSourceId,
  initialTargetId,
  onExit,
}) {
  const state = useMemo(
    () => collectState({ graphData, sdnState, nfvState, orchestrationState }),
    [graphData, sdnState, nfvState, orchestrationState]
  );

  const [sourceId, setSourceId] = useState(() => initialSourceId || state.endpoints[0]?.id || '');
  const [targetId, setTargetId] = useState(() => initialTargetId || state.endpoints[1]?.id || '');
  const [run, setRun] = useState(null);
  const [faultRun, setFaultRun] = useState(null);
  const [viewMode, setViewMode] = useState('baseline'); // which run is animated
  const [faultError, setFaultError] = useState(null);
  const [selection, setSelection] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [rfInstance, setRfInstance] = useState(null);
  const [forceMotion, setForceMotion] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  const osReducedMotion = usePrefersReducedMotion();
  const reducedMotion = osReducedMotion && !forceMotion;

  const signature = useMemo(
    () => journeySignature({ graphData, sdnState, nfvState, orchestrationState }),
    [graphData, sdnState, nfvState, orchestrationState]
  );

  const activeRun = viewMode === 'faulty' && faultRun ? faultRun : run;
  const stale = !!run && run.baseSignature !== signature;

  const playback = useJourneyPlayback(activeRun?.events ?? [], { reducedMotion });

  // Keep the dropdowns valid when devices are removed.
  useEffect(() => {
    const ids = new Set(state.endpoints.map((n) => n.id));
    if (sourceId && !ids.has(sourceId)) setSourceId(state.endpoints[0]?.id || '');
    if (targetId && !ids.has(targetId)) setTargetId(state.endpoints[1]?.id || '');
  }, [state.endpoints, sourceId, targetId]);

  // A fault comparison against an outdated configuration is misleading — drop it.
  useEffect(() => {
    if (faultRun && faultRun.baseSignature !== signature) {
      setFaultRun(null);
      setViewMode('baseline');
    }
  }, [signature, faultRun]);

  const build = useCallback(
    (from, to, fault, linkId) => {
      const config = fault
        ? applyFault({ graphData, sdnState, sourceId: from, targetId: to }, fault, { linkId })
        : { ok: true, graphData, sdnState };
      if (!config.ok) {
        setFaultError(config.reason);
        return null;
      }
      const next = buildJourneyRun({
        graphData: config.graphData,
        sdnState: config.sdnState,
        nfvState,
        orchestrationState,
        sourceId: from,
        targetId: to,
      });
      next.sourceId = from; // badges follow the run, not the live dropdowns
      next.targetId = to;
      next.baseSignature = signature;
      next.appliedFault = fault
        ? { type: fault, description: config.description, evidence: config.evidence }
        : null;
      setFaultError(null);
      setSelection(null);
      return next;
    },
    [graphData, sdnState, nfvState, orchestrationState, signature]
  );

  const runJourney = useCallback(
    (options = {}) => {
      const from = options.sourceId ?? sourceId;
      const to = options.targetId ?? targetId;
      if (!from || !to || from === to) return;

      if (options.fault) {
        // The comparison needs a current baseline for the same pair.
        let base = run;
        if (!base || base.baseSignature !== signature || base.sourceId !== from || base.targetId !== to) {
          base = build(from, to);
          if (base) setRun(base);
        }
        const faulty = base && build(from, to, options.fault, options.linkId);
        if (faulty) {
          setFaultRun(faulty);
          setViewMode('faulty');
        }
      } else {
        const next = build(from, to);
        if (next) {
          setRun(next);
          setFaultRun(null);
          setViewMode('baseline');
        }
      }
    },
    [build, run, signature, sourceId, targetId]
  );

  // Start from the caller's selection once, on mount.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    if (initialSourceId && initialTargetId && initialSourceId !== initialTargetId) {
      autoRan.current = true;
      runJourney({ sourceId: initialSourceId, targetId: initialTargetId });
    }
  }, [initialSourceId, initialTargetId, runJourney]);

  // Start playing whenever a new run (or the baseline/faulty view) is shown.
  const playRef = useRef(playback.play);
  playRef.current = playback.play;
  useEffect(() => {
    if (activeRun?.events?.length) playRef.current?.();
  }, [activeRun]);

  // Never keep playing when the view goes away or the tab is hidden.
  const { pause: pausePlayback } = playback;
  useEffect(() => {
    const onVisibility = () => {
      setTabHidden(document.hidden);
      if (document.hidden) pausePlayback();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      pausePlayback();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pausePlayback]);

  // Refit when the node set (including the controller) changes.
  useEffect(() => {
    if (!rfInstance || !state.nodes.length) return undefined;
    const timer = setTimeout(
      () => rfInstance.fitView?.({ padding: 0.22, duration: reducedMotion ? 0 : 400 }),
      60
    );
    return () => clearTimeout(timer);
  }, [rfInstance, state.nodes.length, state.controllerPlaced, reducedMotion]);

  const positions = useMemo(() => {
    const fromLayout = {};
    for (const node of layoutNodes ?? []) fromLayout[node.id] = node.position;
    return Object.keys(fromLayout).length > 0 ? fromLayout : fallbackPositions(state.nodes);
  }, [layoutNodes, state.nodes]);

  const handleSelectNode = useCallback((payload) => setSelection(payload), []);
  const handleSelectEdge = useCallback((_, edge) => setSelection({ kind: 'link', id: edge.id }), []);
  const handleNodeClick = useCallback((_, node) => setSelection({ kind: 'device', id: node.id }), []);
  const handleSelectPacket = useCallback(
    () => setSelection({ kind: 'packet', id: activeRun?.packet?.id }),
    [activeRun]
  );

  const shownSource = activeRun?.sourceId ?? sourceId;
  const shownTarget = activeRun?.targetId ?? targetId;

  const { flowNodes, flowEdges } = useJourneyFlow({
    state,
    positions,
    graphData,
    run: activeRun,
    playback,
    sourceId: shownSource,
    targetId: shownTarget,
    showLabels,
    onSelectNode: handleSelectNode,
    onSelectEdge: handleSelectEdge,
  });

  const divergence = useMemo(
    () => (run && faultRun ? findFirstDivergence(run.events, faultRun.events) : null),
    [run, faultRun]
  );

  const canRun = !!sourceId && !!targetId && sourceId !== targetId;

  // ── "Why can't I see the animation?" diagnostics ─────────────
  const edgeCount = graphData?.edges?.length ?? 0;
  const missingLinkIds = useMemo(() => {
    const known = new Set((graphData?.edges ?? []).map((e) => e.id));
    const missing = new Set();
    for (const ev of activeRun?.events ?? []) if (ev.linkId && !known.has(ev.linkId)) missing.add(ev.linkId);
    return [...missing];
  }, [activeRun, graphData]);

  const hints = [];
  if (state.nodes.length === 0) hints.push('There are no devices in the topology, so there is nothing to animate.');
  else if (state.endpoints.length < 2) hints.push('Fewer than two endpoint devices exist — a journey cannot be traced.');
  if (state.nodes.length > 0 && edgeCount === 0) hints.push('The topology has no links, so no packet can travel anywhere.');
  if (!activeRun) hints.push('No journey has been run yet — choose Source and Destination, then press "Run journey".');
  if (activeRun && !activeRun.events?.length) hints.push('The engine produced no events for this pair, so there is nothing to play.');
  if (activeRun && activeRun.events?.length && !activeRun.events.some((e) => e.linkId))
    hints.push('This run has no link traversals (the packet stopped at the source), so no packet moves along a link.');
  if (missingLinkIds.length)
    hints.push(`Events reference links that are not drawn (${missingLinkIds.slice(0, 3).join(', ')}) — link ids in the engine and in graphData.edges do not match.`);
  if (osReducedMotion && !forceMotion)
    hints.push('Your OS "reduce motion" setting is on, so playback is shortened/skipped.');
  if (tabHidden) hints.push('The tab is hidden, so playback is paused.');
  if (stale) hints.push('The run is out of date with the network — re-run it.');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && missingLinkIds.length) {
      // eslint-disable-next-line no-console
      console.warn('[journey] event linkIds with no matching edge:', missingLinkIds);
    }
  }, [missingLinkIds]);

  return (
    <div className="sim-journey anim-fade-in">
      <div className="sim-journey-header">
        <div className="sim-journey-title">
          <span className="eyebrow">End-to-end network journey</span>
          <span className="sim-journey-subtitle">
            The packet path, SDN decisions, and NFV service chain your configuration produces.
          </span>
        </div>

        <div className="sim-journey-controls">
          <label className="sim-picker">
            <span>Source</span>
            <select className="field" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {state.endpoints.map((node) => (
                <option key={node.id} value={node.id}>{node.config?.label ?? node.id} ({node.type})</option>
              ))}
            </select>
          </label>
          <span className="sim-picker-arrow" aria-hidden="true">→</span>
          <label className="sim-picker">
            <span>Destination</span>
            <select className="field" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {state.endpoints.map((node) => (
                <option key={node.id} value={node.id}>{node.config?.label ?? node.id} ({node.type})</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => runJourney()} disabled={!canRun}>
            ▶ Run journey
          </button>
          {onExit && (
            <button className="btn btn-ghost" onClick={onExit}>Back to event mode</button>
          )}
        </div>
      </div>

      {stale && (
        <div className="sim-banner is-warning">
          The network changed after this run was generated. Re-run the journey to animate the current configuration.
          <button className="btn btn-accent btn-sm" onClick={() => runJourney()}>Re-run</button>
        </div>
      )}

      {hints.length > 0 && (
        <div className="sim-banner is-warning" role="status">
          <strong>Can't see the animation?</strong>
          <ul>
            {hints.map((hint) => (<li key={hint}>{hint}</li>))}
          </ul>
          {osReducedMotion && !forceMotion && (
            <button className="btn btn-accent btn-sm" onClick={() => setForceMotion(true)}>
              Play animation anyway
            </button>
          )}
        </div>
      )}

      <SimPlaybackToolbar
        playback={playback}
        outcome={activeRun?.outcome}
        stale={stale}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
        showExplanations={showExplanations}
        onToggleExplanations={() => setShowExplanations((v) => !v)}
        onSelectPacket={handleSelectPacket}
      />

      <div className="sim-journey-body">
        {/* .sim-canvas MUST have an explicit height in CSS or ReactFlow renders nothing. */}
        <div className="sim-canvas">
          {state.nodes.length === 0 ? (
            <div className="sim-canvas-empty">No devices in the topology yet.</div>
          ) : (
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={setRfInstance}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleSelectEdge}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              fitView
              fitViewOptions={{ padding: 0.22 }}
            >
              <Background variant={BackgroundVariant.Lines} gap={26} size={1} color="rgba(148,163,184,0.12)" />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => (n.data?.status === 'active' ? '#38bdf8' : '#1e3a5f')}
                maskColor="rgba(6,13,26,0.75)"
              />
            </ReactFlow>
          )}
        </div>

        <aside className="sim-side">
          <SimTimeline
            events={activeRun?.events ?? []}
            activeSeq={playback.currentEvent?.seq ?? null}
            onSelect={playback.jumpTo}
            showExplanations={showExplanations}
          />
        </aside>
      </div>

      <div className="sim-journey-footer">
        <SimInspector
          run={activeRun}
          currentEvent={playback.currentEvent}
          selection={selection}
          graphData={graphData}
          sdnState={sdnState}
          nfvState={nfvState}
          orchestrationState={orchestrationState}
        />
      </div>

      <FaultExperiment
        graphData={graphData}
        canRun={canRun}
        run={run}
        faultRun={faultRun}
        faultError={faultError}
        divergence={divergence}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onRunFault={(fault, linkId) => runJourney({ fault, linkId })}
        onClear={() => {
          setFaultRun(null);
          setViewMode('baseline');
        }}
        onRestore={() => runJourney()}
      />
    </div>
  );
}