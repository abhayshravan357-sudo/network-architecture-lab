/**
 * Journey Explanations — the educational layer for animated simulation events.
 *
 * Pure functions: they turn an event produced by journeyEvents.js into the
 * five-part explanation the learner reads (what happened, who decided, what
 * evidence supports it, why the next step was chosen, and what a
 * configuration change would do).
 *
 * Nothing here invents network behaviour — every string is built from values
 * the engine actually produced.
 */

import { JOURNEY_EVENT_TYPES, JOURNEY_ACCURACY } from './journeyEventTypes.js';

/** Short human label for a device id that is not a topology node. */
function describeDevice(event) {
  if (event.deviceId === 'sdn-controller') return 'SDN controller (simulated control plane)';
  if (event.deviceId === 'routing') return 'routing layer of the simulation engine';
  return event.deviceId;
}

/**
 * @param {Object} event A journey event
 * @returns {{ what: string, who: string, evidence: string, whyNext: string, experiment: string }}
 */
export function explainJourneyEvent(event) {
  const d = event.detail ?? {};
  const device = describeDevice(event);

  switch (event.type) {
    case JOURNEY_EVENT_TYPES.PACKET_CREATED:
      return {
        what: `A packet is created on ${event.deviceId} and addressed to ${event.targetId ?? 'its destination'}.`,
        who: `Host ${event.deviceId} — it chose the source and destination addresses.`,
        evidence: d.sourceAddresses || d.targetAddresses
          ? `Engine packet record: source ${(d.sourceAddresses ?? []).join(', ') || 'unset'} → destination ${(d.targetAddresses ?? []).join(', ') || 'unset'}${d.vlan != null ? `; VLAN ${d.vlan}` : ''}.`
          : 'Engine packet record: no addresses configured on these endpoints.',
        whyNext:
          'The host must resolve the next hop before any frame can be sent, so address resolution runs first.',
        experiment:
          'Add or change the IP address on either endpoint in the builder and run the journey again — the addresses shown here change with the configuration.',
      };

    case JOURNEY_EVENT_TYPES.ADDRESS_RESOLUTION:
      if (event.outcome === 'reply') {
        return {
          what: `${event.deviceId} answered the address request, so the sender now knows which MAC to use.`,
          who: `The engine's simulated ARP resolution (NetworkGraph.resolveMac).`,
          evidence: `Reply reports ${d.targetIp} is at ${d.resolvedMac}.`,
          whyNext:
            'With the next-hop MAC known, the host can encapsulate the packet in a frame and send it.',
          experiment:
            'Remove the target or gateway address from the topology and re-run — resolution fails earlier with "no node with IP".',
        };
      }
      return {
        what: `${event.deviceId} asks who owns ${d.targetIp} before it can build a frame.`,
        who: `Host ${event.deviceId}`,
        evidence: d.viaGateway
          ? `Destination is off-subnet, so the engine resolves the gateway ${d.targetIp} instead (resolveMac returned viaGateway=true).`
          : `Destination is on the local subnet (${(d.networks ?? []).join(', ') || 'same network'}), so it is resolved directly.`,
        whyNext: 'Frame construction needs a MAC address, not an IP address.',
        experiment:
          'Change the subnet mask or move one endpoint to another subnet in the builder, then re-run to see the gateway path change.',
      };

    case JOURNEY_EVENT_TYPES.MAC_LEARNED:
      return {
        what: `Switch ${event.deviceId} recorded the source MAC on the port it arrived from.`,
        who: `Switch ${event.deviceId} (data plane).`,
        evidence: `MAC table updated: ${d.sourceMac} ← port toward ${event.toId}.`,
        whyNext:
          'Learned entries let later frames be forwarded instead of flooded, so this is recorded before the forwarding decision.',
        experiment:
          'Re-run the journey after the table is warm — the same hop then shows a MAC lookup hit instead of a flood.',
      };

    case JOURNEY_EVENT_TYPES.MAC_LOOKUP:
      return {
        what: `Switch ${event.deviceId} looked up the destination MAC in its table.`,
        who: `Switch ${event.deviceId} (data plane).`,
        evidence: `Lookup for ${d.destinationMac} returned port toward ${d.egressId}${d.hit === false ? ' — but the entry was missing, so the frame is flooded' : ''}.`,
        whyNext: d.hit === false
          ? 'An unknown unicast is flooded to every port except the ingress port.'
          : 'A known destination is forwarded only out the matching port.',
        experiment:
          'Break the link the frame would be forwarded through and re-run: the next run reaches a different device or fails.',
      };

    case JOURNEY_EVENT_TYPES.SWITCH_RECEIVED_FRAME:
      return {
        what: `Switch ${event.deviceId} received a frame on the port toward ${event.fromId}.`,
        who: `Switch ${event.deviceId} (data plane).`,
        evidence: `Ingress port toward ${event.fromId}${event.linkId ? ` over link ${event.linkId}` : ''}.`,
        whyNext: 'Every arriving frame is processed by the switch forwarding pipeline.',
        experiment: 'Select the switch to inspect its learned MAC table and the links it owns.',
      };

    case JOURNEY_EVENT_TYPES.FLOW_TABLE_LOOKUP:
      if (event.outcome === 'hit') {
        return {
          what: `Switch ${event.deviceId} matched the packet against an installed flow rule.`,
          who: `Switch ${event.deviceId}, using a rule installed by the SDN controller.`,
          evidence: `Rule ${d.ruleId}: match source=${d.matchSource} priority ${d.priority} → action ${d.action}${d.actionTarget ? ` toward ${d.actionTarget}` : ''}.`,
          whyNext: 'A matching rule means the switch forwards locally without asking the controller again.',
          experiment:
            'Change or remove the matching policy in the SDN stage and re-run — the lookup result and action change.',
        };
      }
      if (event.outcome === 'no-sdn') {
        return {
          what: `Switch ${event.deviceId} forwarded the frame using its Layer-2 table.`,
          who: `Switch ${event.deviceId} (data plane) — no controller is placed in this design.`,
          evidence: 'sdnState.controllerPlaced is false, so no flow table exists to consult.',
          whyNext:
            'Without a control plane the data plane falls back to MAC learning and forwarding.',
          experiment:
            'Place the controller in the SDN stage and re-run — flow-table lookups and controller events appear.',
        };
      }
      return {
        what: `Switch ${event.deviceId} consulted its flow table.`,
        who: `Switch ${event.deviceId} (data plane).`,
        evidence: d.ruleId
          ? `Rule ${d.ruleId}, priority ${d.priority}, action ${d.action}.`
          : 'No rule recorded for this switch.',
        whyNext: 'The result of the lookup decides whether the controller is asked for help.',
        experiment: 'Inspect the switch flow rules in the inspector panel.',
      };

    case JOURNEY_EVENT_TYPES.TABLE_MISS:
      return {
        what: `No flow rule on ${event.deviceId} matches this packet.`,
        who: `Switch ${event.deviceId} (data plane) reporting to the control plane.`,
        evidence: `Searched ${d.searchedRules ?? 0} installed rule(s) on this switch for source ${d.sourceId}.`,
        whyNext: 'A table miss is the condition that makes a switch ask the controller.',
        experiment:
          'Install a matching rule (place the controller in the SDN stage) and re-run — the miss becomes a hit.',
      };

    case JOURNEY_EVENT_TYPES.CONTROLLER_REQUEST:
      return {
        what: `Switch ${event.deviceId} sends a packet-in to the SDN controller.`,
        who: `Switch ${event.deviceId} → sdn-controller (control plane).`,
        evidence: `Controller is placed and manages ${d.managedSwitches ?? 0} switch(es); request raised for source ${d.sourceId}.`,
        whyNext: 'The controller owns the network-wide view, so it decides what the switch should do.',
        experiment:
          'OpenFlow message contents are not modeled — the controller interaction shown here is a logical abstraction of that exchange.',
      };

    case JOURNEY_EVENT_TYPES.FLOW_RULE_INSTALLED:
      return {
        what: `The controller installs a forwarding rule on ${event.deviceId}.`,
        who: `sdn-controller (control plane) programming the data plane.`,
        evidence: d.ruleId
          ? `Rule ${d.ruleId} generated by sdnEngine.generateFlowRules: match source=${d.matchSource}, priority ${d.priority}, action ${d.action}${d.actionTarget ? ` toward ${d.actionTarget}` : ''}.`
          : 'The rule generator produced no rule for this switch and source.',
        whyNext: 'After installation the switch can forward the packet itself.',
        experiment:
          'Re-run the journey: with the rule in place the same hop reports a flow-table hit instead of a miss.',
      };

    case JOURNEY_EVENT_TYPES.ROUTE_SELECTED:
      if (event.outcome === 'same-subnet') {
        return {
          what: `Source and destination share subnet ${d.network}, so no router is involved.`,
          who: `Host ${event.deviceId} evaluating its own addressing.`,
          evidence: `Source owns ${(d.sourceNetworks ?? []).join(', ') || 'unset'}; destination owns ${(d.destinationNetworks ?? []).join(', ') || 'unset'}; common: ${d.network}.`,
          whyNext: 'Same-subnet delivery is pure Layer 2, so the packet continues on the local segment.',
          experiment:
            'Move one endpoint into another subnet in the builder and re-run — the journey then needs a router.',
        };
      }
      if (event.outcome === 'route-needed') {
        return {
          what: `Source and destination are in different subnets, so the packet must be routed.`,
          who: `Host ${event.deviceId} — it hands the packet to its gateway.`,
          evidence: `Source owns ${(d.sourceNetworks ?? []).join(', ') || 'unset'}; destination owns ${(d.destinationNetworks ?? []).join(', ') || 'unset'}; no common subnet.`,
          whyNext: 'A router with interfaces in both subnets must forward the packet.',
          experiment:
          'Remove the destination subnet from every router in the builder and re-run — routing then fails with "no suitable router".',
        };
      }
      return {
        what: `Router ${event.deviceId} forwards the packet toward the destination subnet.`,
        who: `Router ${event.deviceId} (data plane).`,
        evidence: d.ingressInterface
          ? `Ingress ${d.ingressInterface.ip}/${d.ingressInterface.mask} (${d.ingressNetwork}) → egress ${d.egressInterface?.ip}/${d.egressInterface?.mask} (${d.egressNetwork}); destination subnets ${(d.destinationNetworks ?? []).join(', ')}.`
          : `Destination subnets: ${(d.destinationNetworks ?? []).join(', ')}.`,
        whyNext: 'Routing is a per-router decision; the next hop continues from the egress interface.',
        experiment:
          'Delete the router interface that faces the destination subnet and re-run — the journey stops at the routing decision.',
      };

    case JOURNEY_EVENT_TYPES.POLICY_DECISION:
      if (event.outcome === 'deny') {
        return {
          what: `Traffic from ${d.source} to ${d.destination} is denied.`,
          who: `SDN policy enforced on the data path (sdn-controller in the simulation).`,
          evidence: `Rule ${d.ruleId} matched with priority ${d.priority} and action ${d.action} (policy ${d.policyId ?? 'unlinked'}).`,
          whyNext: 'A drop decision is terminal — the packet does not continue through the service chain.',
          experiment:
            'Change the policy action or its match groups in the SDN stage and re-run to see the packet continue.',
        };
      }
      if (event.outcome === 'default') {
        return {
          what: `No policy matches ${d.source} → ${d.destination}, so the default action applies.`,
          who: `The simulation engine's policy step (sdnEngine-style default-forward).`,
          evidence: `${d.searchedRules ?? 0} policy flow rule(s) checked; none matched this source/destination pair.`,
          whyNext: 'Default-forward lets the packet continue toward the service chain.',
          experiment:
            'Add a DENY policy for this pair in the SDN stage and re-run — the journey then stops here.',
        };
      }
      return {
        what: `Traffic from ${d.source} to ${d.destination} is allowed.`,
        who: `SDN policy enforced on the data path.`,
        evidence: `Rule ${d.ruleId} matched with priority ${d.priority} and action ${d.action}.`,
        whyNext: 'An allow decision hands the packet to the next hop in the path.',
        experiment:
          'Switch this policy to DENY in the SDN stage and re-run to compare the two journeys.',
      };

    case JOURNEY_EVENT_TYPES.VNF_PROCESSING_STARTED:
      return {
        what: `Traffic enters ${d.vnfName ?? d.vnfId} on host ${event.deviceId}.`,
        who: `${d.vnfName ?? d.vnfId} — a virtual network function in position ${d.chainPosition} of the service chain.`,
        evidence: `Deployment ${d.deploymentId}; host resources ${d.allocatedCpu ?? '?'} CPU / ${d.allocatedMemory ?? '?'} memory of ${d.hostCpu ?? '?'} / ${d.hostMemory ?? '?'}${d.instanceStatus ? `; instance status ${d.instanceStatus}` : '; no running instance'}.`,
        whyNext:
          'The function is part of the configured chain, so the next event is its processing result.',
        experiment:
          'Reorder the chain in the NFV stage or move the VNF to another host, then re-run to see the order change.',
      };

    case JOURNEY_EVENT_TYPES.VNF_PROCESSING_COMPLETED:
      return {
        what: `${d.vnfName ?? d.vnfId} finished processing and returned the traffic to the chain.`,
        who: `${d.vnfName ?? d.vnfId} (service layer).`,
        evidence: d.packetModified
          ? 'The engine recorded a packet change.'
          : 'The engine models placement, ordering and resources only — it does not model packet rewriting for this function, so the packet is unchanged.',
        whyNext: 'The chain continues with the next configured function, or with delivery if this was the last one.',
        experiment:
          'Add another VNF to the chain in the NFV stage and re-run — an extra processing pair appears here.',
      };

    case JOURNEY_EVENT_TYPES.VNF_UNAVAILABLE:
      return {
        what: `${d.vnfId} is configured in the chain but has no running instance on ${event.deviceId}.`,
        who: `The orchestrator's instance state (orchestratorEngine).`,
        evidence: `Deployment ${d.deploymentId} exists, but no instantiated instance is running for it.`,
        whyNext:
          'The data plane still forwards the packet; only the service function is absent, so the journey continues and records the gap.',
        experiment:
          'Instantiate the VNF in the Orchestration stage and re-run — the processing pair replaces this note.',
      };

    case JOURNEY_EVENT_TYPES.PACKET_FORWARDED:
      return {
        what: `The packet moves from ${event.fromId} to ${event.toId}.`,
        who: `${event.fromId} forwarding the frame${event.linkId ? ` over link ${event.linkId}` : ''}.`,
        evidence: event.linkId
          ? `Link ${event.linkId} connects ${event.fromId} and ${event.toId} in the current topology.`
          : `Hop toward ${event.toId} in the engine path.`,
        whyNext: 'Each hop brings the packet closer to the destination.',
        experiment:
          'Remove this link in the builder and re-run — the journey fails at L2 connectivity instead.',
      };

    case JOURNEY_EVENT_TYPES.PACKET_FLOODED:
      return {
        what: `Switch ${event.deviceId} floods the frame because the destination MAC is unknown.`,
        who: `Switch ${event.deviceId} (data plane).`,
        evidence: `No MAC entry for ${d.destinationMac} on the port table; flood covers every port except the one toward ${event.fromId}.`,
        whyNext: 'A flood is how a switch reaches an unknown destination before learning it.',
        experiment:
          'Send the packet a second time in the same run conditions — learning turns later hops into unicast forwards.',
      };

    case JOURNEY_EVENT_TYPES.PACKET_DROPPED:
      return {
        what: `The packet is dropped and the journey stops here.`,
        who: `${device} — the first component whose decision rejects the packet.`,
        evidence: event.evidence ?? 'Engine reported this as the decisive failure.',
        whyNext:
          'There is no next step: a terminal failure means the remaining hops were never executed.',
        experiment:
          'Fix the reported cause in the builder or the SDN stage, then re-run and compare both journeys.',
      };

    case JOURNEY_EVENT_TYPES.PACKET_DELIVERED:
      return {
        what: `The packet reached ${event.deviceId}.`,
        who: `Host ${event.deviceId}`,
        evidence: event.evidence ?? 'Engine reported a successful end-to-end path.',
        whyNext: 'Delivery is the terminal success state of the journey.',
        experiment:
          'Introduce a fault (remove a link, a router interface, or add a DENY policy) and compare the new journey.',
      };

    case JOURNEY_EVENT_TYPES.SERVICE_CHAIN_NOTE:
      return {
        what: d.onPath
          ? `${d.vnfId} is processed at this point of the configured chain.`
          : `${d.vnfId} is configured in the service chain but its host (${event.deviceId}) is not on this packet's path.`,
        who: `NFV configuration (nfvState.serviceChain) compared against the engine path.`,
        evidence: d.onPath
          ? `Host ${event.deviceId} appears in the traversed path.`
          : `Traversed path: ${(d.path ?? []).join(' → ') || 'none'}.`,
        whyNext:
          'A chain entry that is not on the path cannot process this packet — the data plane does not detour to reach it.',
        experiment:
          'Place the VNF host on the path between the endpoints in the builder, or choose different endpoints.',
      };

    case JOURNEY_EVENT_TYPES.SIMULATION_COMPLETED:
      return {
        what: 'The engine run is finished.',
        who: 'simulationEngine.tracePacket (final result).',
        evidence: `${d.eventCount ?? 0} event(s); outcome: ${d.outcome ?? 'unknown'}.`,
        whyNext: 'Playback can be replayed, stepped, or restarted from here.',
        experiment:
          'Change any configuration and run again — a changed configuration always produces a new run.',
      };

    default:
      return {
        what: event.decision ?? 'Simulation event.',
        who: device,
        evidence: event.evidence ?? 'See the engine record for this event.',
        whyNext: 'See the following event in the timeline.',
        experiment: 'Change a configuration value and run the journey again.',
      };
  }
}

/**
 * Accuracy disclaimer shown next to an event so approximated behaviour is
 * never presented as fully modelled.
 */
export function describeAccuracy(accuracy) {
  if (accuracy === JOURNEY_ACCURACY.SIMPLIFIED) {
    return 'Approximated — this step is a teaching simplification, not a full protocol model.';
  }
  if (accuracy === JOURNEY_ACCURACY.UNSUPPORTED) {
    return 'Not modelled by the engine — shown for context only.';
  }
  return 'Modelled — produced by the network engine from the current configuration.';
}

export default { explainJourneyEvent, describeAccuracy };
