/**
 * Journey Events — turns the network engine's real decisions into the
 * ordered event list the animated simulation plays back.
 *
 * Responsibilities (kept deliberately narrow):
 *   1. evaluate the current network configuration,
 *   2. generate the simulation events the engine actually produced,
 *   3. attach the evidence and accuracy of each event.
 *
 * It never runs the engine per animation frame: buildJourneyRun() is called
 * once per configuration, and the result is a plain, ordered array that
 * playback consumes.
 *
 * What the engine does and does not model is stated explicitly in
 * `limitations` so the UI cannot present approximations as real behaviour.
 */

import { NetworkGraph } from '../graph/graphModel.js';
import { tracePacket } from './simulationEngine.js';
import { generateFlowRules } from '../sdn/sdnEngine.js';
import { buildServiceChain } from '../nfv/nfvEngine.js';
import { VNF_MAP } from '../../data/vnfs/vnfCatalog.js';
import { JOURNEY_EVENT_TYPES, JOURNEY_LAYERS, JOURNEY_ACCURACY } from './journeyEventTypes.js';
import { explainJourneyEvent } from './journeyExplanations.js';

let runSeq = 0;
let packetSeq = 0;

const SWITCH_TYPES = new Set(['l2Switch', 'l3Switch']);
const L3_TYPES = new Set(['router', 'l3Switch', 'firewall']);
const CONTROLLER_ID = 'sdn-controller';

/**
 * Compact fingerprint of everything that can change a journey's outcome.
 * Used to detect a stale run when the learner edits the network.
 */
export function journeySignature({ graphData, sdnState, nfvState, orchestrationState } = {}) {
  const nodes = (graphData?.nodes ?? []).map((n) => `${n.id}:${n.type}:${JSON.stringify(n.config ?? {})}`);
  const edges = (graphData?.edges ?? []).map((e) => `${e.source}>${e.target}`);
  const rules = (sdnState?.flowRules ?? []).map((r) => r.id).sort();
  const policyFlows = (sdnState?.policyFlows ?? []).map((r) => `${r.id}:${r.priority}:${r.action?.type}`).sort();
  const policies = (sdnState?.policies ?? []).map((p) => `${p.id}:${p.action}`).sort();
  const deployments = (nfvState?.deployments ?? []).map((d) => d.id).sort();
  const chain = (nfvState?.serviceChain ?? []).map((c) => c.id);
  const instances = (orchestrationState?.instances ?? [])
    .map((i) => `${i.id}:${i.vnfId}:${i.hostNodeId}:${i.state}`)
    .sort();

  return [
    'journey-v1',
    `controller=${sdnState?.controllerPlaced ? 1 : 0}`,
    `nodes=${nodes.sort().join('|')}`,
    `edges=${edges.sort().join('|')}`,
    `rules=${rules.join('|')}`,
    `policyFlows=${policyFlows.join('|')}`,
    `policies=${policies.join('|')}`,
    `deployments=${deployments.join('|')}`,
    `chain=${chain.join('|')}`,
    `instances=${instances.join('|')}`,
  ].join('#');
}

/**
 * Collect the state the journey needs from the three later stages.
 */
function readContext({ graphData, sdnState, nfvState, orchestrationState }) {
  const graph = NetworkGraph.fromJSON(graphData);
  const deployments = nfvState?.deployments ?? [];
  const serviceChain = nfvState?.serviceChain ?? [];
  const instances = (orchestrationState?.instances ?? []).filter((i) => i.state !== 'removed');

  // Chain position → the deployment that fills it, and its running instance.
  const chainEntries = serviceChain.map((entry, index) => {
    const deployment = deployments.find((d) => d.id === entry.id) ?? entry;
    const instance =
      instances.find((i) => i.vnfId === deployment.vnfId && i.hostNodeId === deployment.hostNodeId) ?? null;
    return {
      index,
      deploymentId: deployment.id,
      vnfId: deployment.vnfId,
      hostNodeId: deployment.hostNodeId ?? null,
      instance,
    };
  });

  const chainByHost = new Map();
  for (const entry of chainEntries) {
    if (!entry.hostNodeId) continue;
    if (!chainByHost.has(entry.hostNodeId)) chainByHost.set(entry.hostNodeId, []);
    chainByHost.get(entry.hostNodeId).push(entry);
  }

  return {
    graph,
    graphData,
    controllerPlaced: sdnState?.controllerPlaced === true,
    flowRules: sdnState?.flowRules ?? [],
    policyFlows: sdnState?.policyFlows ?? [],
    policies: sdnState?.policies ?? [],
    deployments,
    serviceChain,
    instances,
    chainEntries,
    chainByHost,
    managedSwitches: graph
      .getNodes()
      .filter((n) => SWITCH_TYPES.has(n.type))
      .map((n) => n.id),
  };
}

/** Id of the link that directly connects two nodes. */
function findLinkId(graph, aId, bId) {
  if (!aId || !bId) return null;
  const edge = graph.getEdgesOf(aId).find(
    (e) => (e.source === aId && e.target === bId) || (e.source === bId && e.target === aId)
  );
  return edge?.id ?? null;
}

/**
 * The rules the engine's own generator would install for one endpoint on one
 * switch — used for the controller-interaction events so the "installed"
 * rule is really the engine's rule, not an invented one.
 */
function generatedRuleFor(ctx, switchId, sourceId) {
  try {
    return (
      generateFlowRules(ctx.graphData).find(
        (r) => r.switchId === switchId && r.match?.source === sourceId
      ) ?? null
    );
  } catch {
    return null;
  }
}

function installedRulesFor(ctx, switchId, sourceId) {
  return ctx.flowRules.filter((r) => r.switchId === switchId && r.match?.source === sourceId);
}

/** Describe a host's VNF allocation from the NFV configuration. */
function hostAllocation(ctx, hostNodeId, vnfId) {
  const vnf = VNF_MAP[vnfId];
  const hosted = ctx.deployments.filter((d) => d.hostNodeId === hostNodeId && d.vnfId === vnfId);
  const hostNode = ctx.graph.getNode(hostNodeId);
  const caps = hostNode?.config?.resources ?? null;
  return {
    vnfId,
    vnfName: vnf?.name ?? vnfId,
    category: vnf?.category ?? null,
    vnfCpu: vnf?.cpu ?? null,
    vnfMemory: vnf?.memory ?? null,
    vnfThroughput: vnf?.throughput ?? null,
    deploymentId: hosted[0]?.id ?? null,
    hostCpu: caps?.cpu ?? null,
    hostMemory: caps?.memory ?? null,
    allocatedCpu: (vnf?.cpu ?? 0) * hosted.length,
    allocatedMemory: (vnf?.memory ?? 0) * hosted.length,
  };
}

/**
 * Build the ordered event list for one source → destination journey.
 *
 * @param {Object} input
 * @param {{ nodes: Array, edges: Array }} input.graphData
 * @param {Object} [input.sdnState]
 * @param {Object} [input.nfvState]
 * @param {Object} [input.orchestrationState]
 * @param {string} input.sourceId
 * @param {string} input.targetId
 * @returns {Object} run — see the returned shape below
 */
export function buildJourneyRun({ graphData, sdnState, nfvState, orchestrationState, sourceId, targetId }) {
  const ctx = readContext({ graphData, sdnState, nfvState, orchestrationState });
  const events = [];
  const findings = [];

  runSeq += 1;
  packetSeq += 1;
  const packetId = `pkt-${packetSeq}`;

  const push = (event) => {
    const withExplanation = {
      id: `ev-${events.length + 1}`,
      seq: events.length + 1,
      packetId,
      layer: JOURNEY_LAYERS.DATA,
      accuracy: JOURNEY_ACCURACY.MODELED,
      outcome: 'info',
      terminal: false,
      ...event,
    };
    withExplanation.explanation = explainJourneyEvent(withExplanation);
    events.push(withExplanation);
    return withExplanation;
  };

  const packet = {
    id: packetId,
    sourceId,
    targetId,
    sourceAddresses: ctx.graph.getNodeAddresses(sourceId),
    targetAddresses: ctx.graph.getNodeAddresses(targetId),
    sourceMac: ctx.graph.getNodeMac(sourceId),
    targetMac: ctx.graph.getNodeMac(targetId),
    vlan: ctx.graph.getNode(sourceId)?.config?.vlan ?? null,
    representation: JOURNEY_ACCURACY.SIMPLIFIED,
  };

  // ── 1. Packet creation ───────────────────────────────────────
  push({
    type: JOURNEY_EVENT_TYPES.PACKET_CREATED,
    deviceId: sourceId,
    decision: `Packet created on ${sourceId}`,
    detail: {
      sourceAddresses: packet.sourceAddresses,
      targetAddresses: packet.targetAddresses,
      vlan: packet.vlan,
    },
    evidence: packet.sourceAddresses.length || packet.targetAddresses.length
      ? `source ${packet.sourceAddresses.join(', ') || 'unset'} → destination ${packet.targetAddresses.join(', ') || 'unset'}`
      : 'no addresses configured on the selected endpoints',
    accuracy: JOURNEY_ACCURACY.MODELED,
  });

  // ── 2. Engine decision path ──────────────────────────────────
  const trace = tracePacket(graphData, sourceId, targetId, sdnState);

  /** SDN control-plane events for a switch hop, in order. */
  const sdnEventsForHop = (step) => {
    const out = [];
    const deviceId = step.device;
    const node = ctx.graph.getNode(deviceId);
    if (!node || !SWITCH_TYPES.has(node.type)) return out;

    if (!ctx.controllerPlaced) {
      out.push({
        type: JOURNEY_EVENT_TYPES.FLOW_TABLE_LOOKUP,
        layer: JOURNEY_LAYERS.DATA,
        deviceId,
        fromId: step.device,
        toId: step.toId,
        linkId: step.linkId,
        outcome: 'no-sdn',
        decision: `${deviceId} forwards using its Layer-2 table`,
        detail: { switchId: deviceId, searchedRules: 0 },
        evidence: 'no SDN controller is placed in this design',
        accuracy: JOURNEY_ACCURACY.MODELED,
      });
      return out;
    }

    const matching = installedRulesFor(ctx, deviceId, sourceId);
    if (matching.length > 0) {
      const rule = matching[0];
      out.push({
        type: JOURNEY_EVENT_TYPES.FLOW_TABLE_LOOKUP,
        layer: JOURNEY_LAYERS.DATA,
        deviceId,
        outcome: 'hit',
        decision: `Flow rule ${rule.id} matched on ${deviceId}`,
        detail: {
          switchId: deviceId,
          ruleId: rule.id,
          priority: rule.priority,
          action: rule.action?.type,
          actionTarget: rule.action?.toward ?? null,
          matchSource: rule.match?.source ?? null,
          matchVlan: rule.match?.vlan ?? null,
        },
        evidence: `rule ${rule.id}: priority ${rule.priority}, match source=${rule.match?.source}, action ${rule.action?.type}${rule.action?.toward ? ` toward ${rule.action.toward}` : ''}`,
      });
      return out;
    }

    // Table miss: the switch asks the controller, the controller installs the
    // rule its own generator produces, and the switch looks up again.
    const rule = generatedRuleFor(ctx, deviceId, sourceId);
    out.push({
      type: JOURNEY_EVENT_TYPES.TABLE_MISS,
      layer: JOURNEY_LAYERS.DATA,
      deviceId,
      outcome: 'miss',
      decision: `No flow rule on ${deviceId} matches this packet`,
      detail: { switchId: deviceId, searchedRules: ctx.flowRules.length, sourceId },
      evidence: `searched ${ctx.flowRules.length} installed rule(s) for source ${sourceId}`,
    });
    out.push({
      type: JOURNEY_EVENT_TYPES.CONTROLLER_REQUEST,
      layer: JOURNEY_LAYERS.CONTROL,
      deviceId,
      outcome: 'packet-in',
      decision: `${deviceId} asks the controller what to do`,
      detail: { switchId: deviceId, sourceId, managedSwitches: ctx.managedSwitches.length },
      evidence: `controller manages ${ctx.managedSwitches.length} switch(es); request for source ${sourceId}`,
    });
    out.push({
      type: JOURNEY_EVENT_TYPES.FLOW_RULE_INSTALLED,
      layer: JOURNEY_LAYERS.CONTROL,
      deviceId,
      outcome: rule ? 'installed' : 'no-rule',
      decision: rule
        ? `Controller installs rule ${rule.id} on ${deviceId}`
        : `Controller found no rule to install on ${deviceId}`,
      detail: rule
        ? {
            switchId: deviceId,
            ruleId: rule.id,
            priority: rule.priority,
            action: rule.action?.type,
            actionTarget: rule.action?.toward ?? null,
            matchSource: rule.match?.source ?? null,
          }
        : { switchId: deviceId, sourceId },
      evidence: rule
        ? `sdnEngine.generateFlowRules produced ${rule.id} (priority ${rule.priority}, ${rule.action?.type}${rule.action?.toward ? ` toward ${rule.action.toward}` : ''})`
        : 'the rule generator produced nothing for this switch and endpoint',
    });
    return out;
  };

  /** NFV service-chain events for a hop that enters a VNF host. */
  const nfvEventsForHop = (step) => {
    const out = [];
    const hostNodeId = step.toId;
    if (!hostNodeId || !ctx.chainByHost.has(hostNodeId)) return out;

    for (const entry of ctx.chainByHost.get(hostNodeId)) {
      const alloc = hostAllocation(ctx, hostNodeId, entry.vnfId);
      const instance = entry.instance;
      if (!instance) {
        out.push({
          type: JOURNEY_EVENT_TYPES.VNF_UNAVAILABLE,
          layer: JOURNEY_LAYERS.SERVICE,
          deviceId: hostNodeId,
          outcome: 'missing-instance',
          decision: `${entry.vnfId} has no running instance on ${hostNodeId}`,
          detail: { ...alloc, chainPosition: entry.index + 1, deploymentId: entry.deploymentId },
          evidence: `deployment ${entry.deploymentId} exists but no running instance was found for ${entry.vnfId} on ${hostNodeId}`,
          accuracy: JOURNEY_ACCURACY.MODELED,
        });
        findings.push({
          id: `chain-gap-${entry.deploymentId}`,
          severity: 'warning',
          message: `${entry.vnfId} sits in the service chain but is not instantiated on ${hostNodeId}.`,
          evidence: `Chain position ${entry.index + 1}; deployments ${ctx.deployments.length}; running instances ${ctx.instances.length}.`,
        });
        continue;
      }

      out.push({
        type: JOURNEY_EVENT_TYPES.VNF_PROCESSING_STARTED,
        layer: JOURNEY_LAYERS.SERVICE,
        deviceId: hostNodeId,
        outcome: 'entered',
        decision: `${alloc.vnfName} receives the traffic`,
        detail: {
          ...alloc,
          chainPosition: entry.index + 1,
          instanceStatus: instance.status ?? null,
          instanceUtilization: instance.utilization ?? null,
          instanceLoad: instance.load ?? null,
          instanceThroughput: instance.throughput ?? null,
          instanceState: instance.state ?? null,
        },
        evidence: `chain position ${entry.index + 1} on ${hostNodeId}; host ${alloc.allocatedCpu}/${alloc.hostCpu ?? '?'} CPU; instance ${instance.id} status ${instance.status ?? 'unknown'} (load ${instance.load ?? 0}/${instance.throughput ?? '?'})`,
      });
      out.push({
        type: JOURNEY_EVENT_TYPES.VNF_PROCESSING_COMPLETED,
        layer: JOURNEY_LAYERS.SERVICE,
        deviceId: hostNodeId,
        outcome: 'forwarded',
        decision: `${alloc.vnfName} returns the traffic to the chain`,
        detail: { ...alloc, chainPosition: entry.index + 1, packetModified: false },
        evidence: 'placement, chain order and resources are modelled; packet rewriting is not, so the packet is unchanged',
      });
      if (instance.status === 'overloaded') {
        findings.push({
          id: `instance-overloaded-${instance.id}`,
          severity: 'warning',
          message: `${alloc.vnfName} on ${hostNodeId} is overloaded (${Math.round((instance.utilization ?? 0) * 100)}% of capacity).`,
          evidence: `Offered load ${instance.load} against throughput ${instance.throughput}. The engine models utilization, not packet loss, so the journey continues.`,
        });
      }
    }
    return out;
  };

  const traversal = [];

  for (const step of trace.steps ?? []) {
    // ── terminal failures ──
    if (step.type === 'failure' || step.type === 'error') {
      push({
        type: JOURNEY_EVENT_TYPES.PACKET_DROPPED,
        deviceId: step.device,
        outcome: 'dropped',
        terminal: true,
        decision: step.decision,
        detail: {
          failurePoint: trace.failurePoint ?? null,
          ...(step.detail ?? {}),
        },
        evidence: step.evidence,
      });
      break;
    }

    if (step.type === 'policy-deny') {
      push({
        type: JOURNEY_EVENT_TYPES.POLICY_DECISION,
        layer: JOURNEY_LAYERS.CONTROL,
        deviceId: step.device,
        outcome: 'deny',
        decision: step.decision,
        detail: { ...(step.detail ?? {}) },
        evidence: step.evidence,
      });
      push({
        type: JOURNEY_EVENT_TYPES.PACKET_DROPPED,
        deviceId: step.device,
        outcome: 'dropped',
        terminal: true,
        decision: 'Packet dropped by policy',
        detail: { failurePoint: trace.failurePoint, ruleId: step.detail?.ruleId ?? null },
        evidence: step.evidence,
      });
      break;
    }

    // ── address resolution ──
    if (step.type === 'arp-request' || step.type === 'arp-reply') {
      const isReply = step.type === 'arp-reply';
      const detail = step.detail ?? {};
      // A request for the destination's own address is direct ARP; anything
      // else is the gateway, which is what resolveMac reports for off-subnet
      // destinations.
      const viaGateway = !isReply && !ctx.graph.getNodeAddresses(targetId).includes(detail.targetIp);
      push({
        type: JOURNEY_EVENT_TYPES.ADDRESS_RESOLUTION,
        deviceId: step.device,
        outcome: isReply ? 'reply' : 'request',
        decision: step.decision,
        detail: isReply
          ? { targetIp: detail.targetIp ?? null, resolvedMac: detail.mac ?? null, responder: detail.responder ?? null }
          : {
              targetIp: detail.targetIp ?? null,
              responder: detail.responder ?? null,
              viaGateway,
              networks: ctx.graph.getNodeOwnNetworks(step.device),
            },
        evidence: step.evidence,
      });
      continue;
    }

    // ── switch learning / lookups ──
    if (step.type === 'mac-learning') {
      push({
        type: JOURNEY_EVENT_TYPES.MAC_LEARNED,
        deviceId: step.device,
        fromId: step.toId,
        toId: step.toId,
        // Learning binds the source MAC to the port the frame arrived on, so
        // the highlighted link is the ingress link, not the outgoing hop.
        linkId: findLinkId(ctx.graph, step.device, step.toId),
        outcome: 'learned',
        decision: step.decision,
        detail: { sourceMac: step.decision.match(/Learned (\S+)/)?.[1] ?? null },
        evidence: step.evidence,
      });
      continue;
    }

    if (step.type === 'l2-flood') {
      push({
        type: JOURNEY_EVENT_TYPES.MAC_LOOKUP,
        deviceId: step.device,
        fromId: step.fromId,
        toId: step.toId,
        linkId: step.linkId,
        outcome: 'miss',
        decision: `Destination MAC unknown on ${step.device}`,
        detail: { destinationMac: ctx.graph.getNodeMac(step.toId), hit: false, egressId: step.toId },
        evidence: step.evidence,
      });
      for (const control of sdnEventsForHop(step)) push(control);
      push({
        type: JOURNEY_EVENT_TYPES.PACKET_FLOODED,
        deviceId: step.device,
        fromId: step.device,
        toId: step.toId,
        linkId: step.linkId,
        outcome: 'flooded',
        decision: step.decision,
        detail: { destinationMac: ctx.graph.getNodeMac(step.toId) },
        evidence: step.evidence,
      });
      for (const service of nfvEventsForHop(step)) push(service);
      traversal.push({ from: step.device, to: step.toId, linkId: step.linkId });
      continue;
    }

    // ── a real link traversal (the hop the engine's path contains) ──
    if (step.linkId && ['l2-forward', 'l2-send', 'l3-forward'].includes(step.type)) {
      const node = ctx.graph.getNode(step.device);
      const isSwitch = node && SWITCH_TYPES.has(node.type);

      if (isSwitch) {
        push({
          type: JOURNEY_EVENT_TYPES.SWITCH_RECEIVED_FRAME,
          deviceId: step.device,
          fromId: step.fromId,
          toId: step.device,
          linkId: findLinkId(ctx.graph, step.device, step.fromId),
          outcome: 'received',
          decision: `${step.device} received a frame from ${step.fromId}`,
          detail: { ingressToward: step.fromId },
          evidence: `ingress port toward ${step.fromId}${step.linkId ? ` over link ${step.linkId}` : ''}`,
        });
        push({
          type: JOURNEY_EVENT_TYPES.MAC_LOOKUP,
          deviceId: step.device,
          fromId: step.fromId,
          toId: step.toId,
          linkId: step.linkId,
          outcome: 'hit',
          decision: `Destination MAC known on ${step.device}`,
          detail: { destinationMac: ctx.graph.getNodeMac(step.toId), hit: true, egressId: step.toId },
          evidence: step.evidence,
        });
      }

      for (const control of sdnEventsForHop(step)) push(control);

      push({
        type: JOURNEY_EVENT_TYPES.PACKET_FORWARDED,
        deviceId: step.device,
        fromId: step.device,
        toId: step.toId,
        linkId: step.linkId,
        outcome: 'forwarded',
        decision: step.decision,
        detail: L3_TYPES.has(node?.type) ? { deviceType: node.type } : {},
        evidence: step.evidence,
      });
      for (const service of nfvEventsForHop(step)) push(service);
      traversal.push({ from: step.device, to: step.toId, linkId: step.linkId });
      continue;
    }

    // ── Layer-3 decisions (device-level, no link traversal) ──
    if (step.type === 'l3-same-subnet' || step.type === 'l3-route-needed') {
      push({
        type: JOURNEY_EVENT_TYPES.ROUTE_SELECTED,
        deviceId: step.device,
        outcome: step.type === 'l3-same-subnet' ? 'same-subnet' : 'route-needed',
        decision: step.decision,
        detail: { ...(step.detail ?? {}) },
        evidence: step.evidence,
      });
      continue;
    }

    if (step.type === 'l3-router' || step.type === 'l3-forward') {
      push({
        type: JOURNEY_EVENT_TYPES.ROUTE_SELECTED,
        deviceId: step.device,
        outcome: step.type === 'l3-router' ? 'router-selected' : 'router-forward',
        decision: step.decision,
        detail: { ...(step.detail ?? {}) },
        evidence: step.evidence,
      });
      continue;
    }

    // ── SDN policy decisions ──
    if (step.type === 'policy-allow' || step.type === 'policy-default') {
      const layer = ctx.controllerPlaced ? JOURNEY_LAYERS.CONTROL : JOURNEY_LAYERS.DATA;
      push({
        type: JOURNEY_EVENT_TYPES.POLICY_DECISION,
        layer,
        deviceId: step.device,
        outcome: step.type === 'policy-allow' ? 'allow' : 'default',
        decision: step.decision,
        detail: { ...(step.detail ?? {}) },
        evidence: step.evidence,
      });
      continue;
    }

    if (step.type === 'l2-deliver' || step.type === 'success') {
      if (step.type === 'l2-deliver') continue; // the arrival at the host is the hop itself
      push({
        type: JOURNEY_EVENT_TYPES.PACKET_DELIVERED,
        deviceId: step.device,
        outcome: 'delivered',
        terminal: true,
        decision: step.decision,
        detail: { path: trace.path ?? [] },
        evidence: step.evidence,
      });
      continue;
    }

    // ── anything else the engine emitted, forwarded verbatim ──
    push({
      type: JOURNEY_EVENT_TYPES.PACKET_FORWARDED,
      deviceId: step.device,
      decision: step.decision,
      detail: { engineStepType: step.type },
      evidence: step.evidence,
    });
  }

  // ── 3. Service-chain entries that this packet never reaches ──
  // Exclude the source: the packet originates there and does not "traverse"
  // a VNF on the source host as part of the service chain. The destination
  // IS included because the packet arrives there and any VNF on the destination
  // is the final processing step.
  const chainPathIds = new Set(
    traversal.flatMap((h) => [h.from, h.to]).filter((id) => id !== sourceId)
  );
  for (const entry of ctx.chainEntries) {
    if (!entry.hostNodeId || chainPathIds.has(entry.hostNodeId)) continue;
    const alloc = hostAllocation(ctx, entry.hostNodeId, entry.vnfId);
    push({
      type: JOURNEY_EVENT_TYPES.SERVICE_CHAIN_NOTE,
      layer: JOURNEY_LAYERS.SERVICE,
      deviceId: entry.hostNodeId,
      outcome: 'off-path',
      decision: `${entry.vnfId} is configured on ${entry.hostNodeId}, which is not on this packet's path`,
      detail: { ...alloc, chainPosition: entry.index + 1, onPath: false, path: trace.path ?? [], vnfId: entry.vnfId },
      evidence: `traversed path: ${(trace.path ?? []).join(' → ') || 'none'}; chain position ${entry.index + 1}`,
    });
    findings.push({
      id: `chain-off-path-${entry.deploymentId}`,
      severity: 'info',
      message: `${entry.vnfId} hosts on ${entry.hostNodeId}, which is outside the path between ${sourceId} and ${targetId}.`,
      evidence: 'The data plane does not detour to reach a chain function; the packet never reaches this host.',
    });
  }

  // ── 4. Service-chain ordering problems reported by the NFV engine ──
  if (ctx.serviceChain.length > 0) {
    const validation = buildServiceChain(ctx.deployments, ctx.serviceChain.map((c) => c.id));
    if (!validation.valid) {
      for (const error of validation.errors) {
        findings.push({
          id: `chain-invalid-${error}`,
          severity: 'warning',
          message: `Service chain is not valid: ${error}`,
          evidence: 'nfvEngine.buildServiceChain reported this while the journey was generated.',
        });
      }
    }
  }

  // ── 5. Outcome summary ───────────────────────────────────────
  const delivered = events.some((e) => e.type === JOURNEY_EVENT_TYPES.PACKET_DELIVERED);
  const dropped = events.some((e) => e.type === JOURNEY_EVENT_TYPES.PACKET_DROPPED);
  const offPath = events.some((e) => e.type === JOURNEY_EVENT_TYPES.SERVICE_CHAIN_NOTE);

  let outcome;
  if (delivered) {
    outcome = { kind: 'delivered', label: 'Delivered', reason: trace.reason ?? '' };
  } else if (dropped) {
    outcome = { kind: 'dropped', label: 'Dropped', reason: trace.reason ?? '' };
  } else {
    outcome = { kind: 'incomplete', label: 'Incomplete', reason: 'The engine did not reach a terminal outcome.' };
  }

  push({
    type: JOURNEY_EVENT_TYPES.SIMULATION_COMPLETED,
    deviceId: targetId,
    outcome: outcome.kind,
    decision: `Simulation completed — ${outcome.label.toLowerCase()}`,
    detail: { eventCount: events.length, outcome: outcome.kind, path: trace.path ?? [] },
    evidence: `tracePacket returned ${trace.reachable ? 'reachable' : 'unreachable'}${
      trace.failurePoint ? ` (failurePoint: ${trace.failurePoint})` : ''
    }`,
  });

  return {
    runId: `run-${runSeq}`,
    createdAt: Date.now(),
    signature: journeySignature({ graphData, sdnState, nfvState, orchestrationState }),
    sourceId,
    targetId,
    packet,
    events,
    findings,
    outcome: offPath && outcome.kind === 'delivered'
      ? { ...outcome, label: 'Delivered (service chain not fully traversed)' }
      : outcome,
    path: trace.path ?? [],
    failurePoint: trace.failurePoint ?? null,
    support: {
      sdnController: ctx.controllerPlaced,
      flowRules: ctx.flowRules.length,
      policyFlows: ctx.policyFlows.length,
      serviceChain: ctx.chainEntries.map((e) => ({ vnfId: e.vnfId, hostNodeId: e.hostNodeId, running: !!e.instance })),
      instances: ctx.instances.length,
      switches: ctx.managedSwitches.length,
    },
    limitations: [
      'Encapsulation is simplified: one packet token stands for the whole payload. Separate Ethernet, IP and transport headers are not modelled.',
      ctx.controllerPlaced
        ? 'SDN interaction is logical: flow-table lookups and controller requests are modelled, but OpenFlow message fields are not.'
        : 'No SDN controller is placed, so SDN events are not part of this journey.',
      'VNF processing models deployment, chain order, placement and resources. It does not model packet rewriting, NAT translation tables, load-balancing algorithms or per-rule firewall evaluation.',
      'Orchestration actions are recorded lifecycle events. They are listed separately and never triggered by packet flow.',
    ],
  };
}

export default { buildJourneyRun, journeySignature };
