/**
 * Animated Network Simulation — the end-to-end packet journey.
 *
 * This is a visualisation layer over the network engine, not a replacement
 * for it:
 *   - the topology shown is the learner's real project (their ReactFlow layout
 *     when available, otherwise a role-based fallback layout),
 *   - every packet movement follows a link the engine actually selected,
 *   - every decision, explanation and failure comes from the engine's run,
 *   - events are generated once per configuration and only played back here.
 *
 * Responsibilities are split: journeyEvents.js evaluates the network and
 * builds the event list, useJourneyPlayback.js owns playback state, and this
 * file renders it.
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

/** Honour the OS reduced-motion preference for playback pacing. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
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

export default function AnimatedNetworkSimulation({
  graphData,
  layoutNodes,
  layoutEdges,
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
  const [selection, setSelection] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [faultType, setFaultType] = useState('link-down');
  const [faultLinkId, setFaultLinkId] = useState('');
  const [faultError, setFaultError] = useState(null);
  const [faultRun, setFaultRun] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);

  const reducedMotion = usePrefersReducedMotion();
  const signature = useMemo(
    () => journeySignature({ graphData, sdnState, nfvState, orchestrationState }),
    [graphData, sdnState, nfvState, orchestrationState]
  );
  const stale = !!run && run.signature !== signature;

  const playback = useJourneyPlayback(run?.events ?? [], { reducedMotion });

  const runJourney = useCallback(
    (options = {}) => {
      const from = options.sourceId ?? sourceId;
      const to = options.targetId ?? targetId;
      if (!from || !to || from === to) return null;

      const config = options.fault
        ? applyFault({ graphData, sdnState, sourceId: from, targetId: to }, options.fault, {
            linkId: options.linkId,
          })
        : { ok: true, graphData, sdnState, layer: JOURNEY_LAYERS.DATA };

      if (!config.ok) {
        setFaultError(config.reason);
        return null;
      }

      const nextRun = buildJourneyRun({
        graphData: config.graphData,
        sdnState: config.sdnState,
        nfvState,
        orchestrationState,
        sourceId: from,
        targetId: to,
      });
      nextRun.appliedFault = options.fault
        ? { type: options.fault, description: config.description, evidence: config.evidence }
        : null;

      if (options.fault) {
        setFaultRun(nextRun);
      } else {
        setRun(nextRun);
        setFaultRun(null);
      }
      setFaultError(null);
      setSelection(null);
      return nextRun;
    },
    [graphData, sdnState, nfvState, orchestrationState, sourceId, targetId]
  );

  // Start from the caller's selection when one was provided.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    if (initialSourceId && initialTargetId && initialSourceId !== initialTargetId) {
      autoRan.current = true;
      runJourney({ sourceId: initialSourceId, targetId: initialTargetId });
    }
  }, [initialSourceId, initialTargetId, runJourney]);

  // Never keep playing when the view goes away or the tab is hidden.
  const { pause: pausePlayback } = playback;
  useEffect(() => {
    const stop = () => pausePlayback();
    document.addEventListener('visibilitychange', stop);
    return () => {
      pausePlayback();
      document.removeEventListener('visibilitychange', stop);
    };
  }, [pausePlayback]);

  useEffect(() => {
    if (!rfInstance || !state.nodes.length) return undefined;
    const timer = setTimeout(() => rfInstance.fitView?.({ padding: 0.22, duration: reducedMotion ? 0 : 400 }), 60);
    return () => clearTimeout(timer);
  }, [rfInstance, state.nodes.length, reducedMotion]);

  const handleSelectNode = useCallback((payload) => setSelection(payload), []);
  const handleSelectEdge = useCallback((_, edge) => setSelection({ kind: 'link', id: edge.id }), []);
  const handleNodeClick = useCallback((_, node) => setSelection({ kind: 'device', id: node.id }), []);
  const handleSelectPacket = useCallback(() => setSelection({ kind: 'packet', id: run?.packet?.id }), [run]);

  // ── topology → ReactFlow nodes and edges ────────────────────
  const { flowNodes, flowEdges } = useMemo(() => {
    const positions = React.useMemo(() => {
      const fromLayout = {};
      for (const node of layoutNodes ?? []) fromLayout[node.id] = node.position;
      return Object.keys(fromLayout).length > 0 ? fromLayout : fallbackPositions(state.nodes);
    }, [layoutNodes, state.nodes]);

    // Everything that happened up to the current playback position.
    const traversedNodes = new Set();
    const traversedLinks = new Set();
    let droppedNodeId = null;
    const events = run?.events ?? [];
    const upto = playback.index;
    for (let i = 0; i <= upto && i < events.length; i += 1) {
      const event = events[i];
      if (event.fromId) traversedNodes.add(event.fromId);
      if (event.toId) traversedNodes.add(event.toId);
      if (event.deviceId) traversedNodes.add(event.deviceId);
      if (event.linkId) traversedLinks.add(event.linkId);
      if (event.type === 'PACKET_DROPPED') droppedNodeId = event.deviceId;
    }

    const current = playback.currentEvent;
    const activeLinkId = current?.linkId ?? null;
    const activeNodeId = current ? (current.linkId ? current.toId : current.deviceId) : null;
    const packetRestNodeId = current && !current.linkId && current.deviceId !== CONTROLLER_ID ? current.deviceId : null;

    const nodes = [];

    for (const node of state.nodes) {
      const position = positions[node.id] ?? fallbackPositions([node])[node.id];
      let status = 'idle';
      if (node.id === droppedNodeId) status = 'drop';
      else if (node.id === activeNodeId) status = 'active';
      else if (traversedNodes.has(node.id)) status = 'traversed';

      let roleLabel = null;
      if (node.id === sourceId) roleLabel = 'SOURCE';
      else if (node.id === targetId) roleLabel = 'DESTINATION';

      nodes.push({
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
          onSelect: handleSelectNode,
        },
        selectable: true,
      });
    }

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
          onSelect: handleSelectNode,
        },
        selectable: true,
      });
    }

    const edges = [];
    for (const edge of graphData?.edges ?? []) {
      const status = edge.id === activeLinkId
        ? 'active'
        : droppedNodeId && traversedLinks.has(edge.id)
          ? 'drop'
          : traversedLinks.has(edge.id)
            ? 'traversed'
            : 'idle';
      const isActive = edge.id === activeLinkId;
      edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'simLink',
        data: {
          variant: 'link',
          status,
          active: isActive,
          clock: playback.clock,
          direction: current && isActive ? (edge.source === current.fromId ? 1 : -1) : 1,
          label: showLabels && isActive ? 'packet' : null,
          onSelect: handleSelectEdge,
        },
      });
    }

    // Control-plane connections from the controller to every managed switch.
    if (state.controllerPlaced) {
      for (const switchId of state.switches) {
        if (!state.nodes.some((n) => n.id === switchId)) continue;
        const controlActive =
          current?.layer === JOURNEY_LAYERS.CONTROL && current?.deviceId === switchId;
        edges.push({
          id: `control-${switchId}`,
          source: CONTROLLER_ID,
          target: switchId,
          type: 'simLink',
          data: { variant: 'control', status: controlActive ? 'active' : 'idle', label: null },
        });
      }
    }

    // Service-chain order between the hosts that run the configured VNFs.
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

    return { flowNodes: nodes, flowEdges: edges };
  }, [
    state,
    layoutNodes,
    graphData,
    run,
    playback.index,
    playback.currentEvent,
    playback.clock,
    showLabels,
    handleSelectNode,
    handleSelectEdge,
    sourceId,
    targetId,
  ]);

  const nodeTypes = useMemo(() => ({ simDevice: SimDeviceNode }), []);
  const edgeTypes = useMemo(() => ({ simLink: SimLinkEdge }), []);
  const divergence = useMemo(
    () => (run && faultRun ? findFirstDivergence(run.events, faultRun.events) : null),
    [run, faultRun]
  );

  const canRun = !!sourceId && !!targetId && sourceId !== targetId;

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
                <option key={node.id} value={node.id}>
                  {node.config?.label ?? node.id} ({node.type})
                </option>
              ))}
            </select>
          </label>
          <span className="sim-picker-arrow" aria-hidden="true">
            →
          </span>
          <label className="sim-picker">
            <span>Destination</span>
            <select className="field" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {state.endpoints.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.config?.label ?? node.id} ({node.type})
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => runJourney()} disabled={!canRun}>
            ▶ Run journey
          </button>
          {onExit && (
            <button className="btn btn-ghost" onClick={onExit}>
              Back to event mode
            </button>
          )}
        </div>
      </div>

      {state.endpoints.length < 2 && (
        <div className="sim-banner is-warning">
          This topology needs at least two endpoint devices (PC, laptop, server or access point) before a
          journey can be traced.
        </div>
      )}

      {stale && (
        <div className="sim-banner is-warning">
          The network changed after this run was generated. Re-run the journey to animate the current
          configuration.
          <button className="btn btn-accent btn-sm" onClick={() => runJourney()}>
            Re-run
          </button>
        </div>
      )}

      <SimPlaybackToolbar
        playback={playback}
        outcome={run?.outcome}
        stale={stale}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
        showExplanations={showExplanations}
        onToggleExplanations={() => setShowExplanations((v) => !v)}
        onSelectPacket={handleSelectPacket}
      />

      <div className="sim-journey-body">
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
              defaultEdgeOptions={{ type: 'straight' }}
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
            events={run?.events ?? []}
            activeSeq={playback.currentEvent?.seq ?? null}
            onSelect={playback.jumpTo}
            showExplanations={showExplanations}
          />
        </aside>
      </div>

      <div className="sim-journey-footer">
        <SimInspector
          run={run}
          currentEvent={playback.currentEvent}
          selection={selection}
          graphData={graphData}
          sdnState={sdnState}
          nfvState={nfvState}
          orchestrationState={orchestrationState}
        />
      </div>

      <details className="sim-faults">
        <summary>Fault experiment — break one thing and compare</summary>
        <div className="sim-faults-body">
          <p className="sim-faults-hint">
            A fault edits a real configuration value and re-computes the journey. The comparison below shows
            the first point where the two runs tell a different story.
          </p>
          <div className="sim-faults-row">
            <select className="field" value={faultType} onChange={(e) => setFaultType(e.target.value)}>
              {FAULT_TYPES.map((fault) => (
                <option key={fault.id} value={fault.id}>
                  {fault.label}
                </option>
              ))}
            </select>
            {faultType === 'link-down' && (
              <select className="field" value={faultLinkId} onChange={(e) => setFaultLinkId(e.target.value)}>
                <option value="">First available link</option>
                {linkOptions(graphData).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            <button
              className="btn btn-warning"
              onClick={() => runJourney({ fault: faultType, linkId: faultLinkId || undefined })}
              disabled={!canRun}
            >
              Run faulty journey
            </button>
            {faultRun && (
              <button className="btn btn-ghost" onClick={() => setFaultRun(null)}>
                Clear comparison
              </button>
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
                    Baseline: {divergence.baseline ? `${divergence.baseline.type} @ ${divergence.baseline.deviceId} — ${divergence.baseline.decision}` : 'run ended here'}
                  </div>
                  <div className="sim-faults-line">
                    Faulty: {divergence.faulty ? `${divergence.faulty.type} @ ${divergence.faulty.deviceId} — ${divergence.faulty.decision}` : 'run ended here'}
                  </div>
                </div>
              ) : (
                <div className="sim-faults-evidence">
                  The two runs produced identical event sequences — this fault does not change this journey.
                </div>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setFaultRun(null);
                  runJourney();
                }}
              >
                Restore configuration and re-run baseline
              </button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
