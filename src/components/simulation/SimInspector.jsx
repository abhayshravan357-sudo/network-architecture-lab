/**
 * Inspector — properties of whatever the learner selected, plus the
 * explanation of the event currently being played.
 *
 * Every value shown here comes from the network model, the SDN/NFV state or
 * the engine's own run record. When a property is not modelled (for example
 * per-packet firewall rule evaluation) it is stated as not modelled instead of
 * being invented.
 */

import React, { useMemo, useState } from 'react';
import { NetworkGraph } from '../../engine/graph/graphModel.js';
import { describeAccuracy } from '../../engine/simulation/journeyExplanations.js';
import { VNF_MAP } from '../../data/vnfs/vnfCatalog.js';
import { getDeviceDef } from '../../data/devices/deviceCatalog.js';

function Row({ label, value, mono }) {
  if (value === null || value === undefined || value === '') {
    return (
      <div className="sim-inspector-row">
        <span className="sim-inspector-label">{label}</span>
        <span className="sim-inspector-value is-muted">not configured</span>
      </div>
    );
  }
  return (
    <div className="sim-inspector-row">
      <span className="sim-inspector-label">{label}</span>
      <span className={`sim-inspector-value${mono ? ' mono' : ''}`}>{value}</span>
    </div>
  );
}

function DeviceDetails({ nodeId, graph, run, sdnState, nfvState, orchestrationState }) {
  const node = graph.getNode(nodeId);
  if (!node) return <p className="sim-inspector-empty">Device is not in the current topology.</p>;

  const def = getDeviceDef(node.type);
  const addresses = graph.getNodeAddresses(nodeId);
  const interfaces = node.config?.interfaces ?? [];
  const neighbors = graph.getNeighbors(nodeId).map((n) => n.id);
  const visited = run.events.filter(
    (e) => e.deviceId === nodeId || e.fromId === nodeId || e.toId === nodeId
  ).length;

  const hosted = (nfvState?.deployments ?? []).filter((d) => d.hostNodeId === nodeId);
  const instances = (orchestrationState?.instances ?? []).filter((i) => i.hostNodeId === nodeId);
  const switchRules = (sdnState?.flowRules ?? []).filter((r) => r.switchId === nodeId);
  const policyRules = (sdnState?.policyFlows ?? []).filter((r) => r.switchId === nodeId);

  return (
    <>
      <div className="sim-inspector-group">
        <div className="sim-inspector-group-title">Device</div>
        <Row label="Type" value={`${def?.name ?? node.type}${def ? ` (${node.type})` : ''}`} />
        <Row label="Label" value={node.config?.label ?? node.id} />
        <Row label="Addresses" value={addresses.length ? addresses.join(', ') : null} mono />
        <Row label="MAC address" value={graph.getNodeMac(nodeId)} mono />
        <Row label="VLANs" value={(node.config?.vlans ?? []).join(', ')} />
        <Row label="Role" value={def?.role ?? null} />
        <Row label="Connected to" value={neighbors.length ? neighbors.join(', ') : null} mono />
        <Row label="Events touching it" value={`${visited} in this run`} />
      </div>

      {interfaces.length > 0 && (
        <div className="sim-inspector-group">
          <div className="sim-inspector-group-title">Interfaces</div>
          {interfaces.map((iface, i) => (
            <Row
              key={`${iface.name ?? i}-${i}`}
              label={iface.name ?? `if${i}`}
              value={`${iface.ip ?? 'unset'}/${iface.mask ?? '?'}`}
              mono
            />
          ))}
        </div>
      )}

      {(hosted.length > 0 || instances.length > 0) && (
        <div className="sim-inspector-group">
          <div className="sim-inspector-group-title">Virtual network functions</div>
          {hosted.map((d) => {
            const vnf = VNF_MAP[d.vnfId];
            const instance = instances.find((i) => i.vnfId === d.vnfId);
            const chainIndex = (nfvState?.serviceChain ?? []).findIndex((c) => c.id === d.id);
            return (
              <div key={d.id} className="sim-inspector-card">
                <div className="sim-inspector-card-title">
                  {vnf?.name ?? d.vnfId}
                  {chainIndex >= 0 && <span className="sim-mini-badge">chain #{chainIndex + 1}</span>}
                </div>
                <Row label="Deployment" value={d.id} mono />
                <Row label="Requires" value={`${vnf?.cpu ?? '?'} CPU / ${vnf?.memory ?? '?'} memory`} mono />
                <Row label="Throughput" value={vnf?.throughput ? `${vnf.throughput} users` : null} mono />
                <Row
                  label="Instance"
                  value={instance ? `${instance.id} — ${instance.status ?? instance.state}` : 'not instantiated'}
                  mono
                />
                {instance && (
                  <Row
                    label="Load"
                    value={`${instance.load ?? 0} / ${instance.throughput ?? '?'} (${Math.round((instance.utilization ?? 0) * 100)}%)`}
                    mono
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {(switchRules.length > 0 || policyRules.length > 0) && (
        <div className="sim-inspector-group">
          <div className="sim-inspector-group-title">Installed rules on this switch</div>
          {switchRules.map((rule) => (
            <div key={rule.id} className="sim-inspector-card">
              <div className="sim-inspector-card-title">
                {rule.id}
                <span className="sim-mini-badge">priority {rule.priority}</span>
              </div>
              <Row
                label="Match"
                value={`source=${rule.match?.source ?? '*'}${rule.match?.vlan != null ? `, vlan=${rule.match.vlan}` : ''}`}
                mono
              />
              <Row
                label="Action"
                value={`${rule.action?.type}${rule.action?.toward ? ` → ${rule.action.toward}` : ''}`}
                mono
              />
            </div>
          ))}
          {policyRules.map((rule) => (
            <div key={rule.id} className="sim-inspector-card">
              <div className="sim-inspector-card-title">
                {rule.id}
                <span className={`sim-mini-badge ${rule.action?.type === 'drop' ? 'is-danger' : 'is-success'}`}>
                  {rule.action?.type}
                </span>
              </div>
              <Row
                label="Match"
                value={`${rule.match?.sourceGroup} → ${rule.match?.destinationGroup} (${rule.match?.source} → ${rule.match?.destination})`}
                mono
              />
              <Row label="Priority" value={rule.priority} mono />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LinkDetails({ linkId, graph, run }) {
  const edge = graph.getEdge(linkId);
  if (!edge) return <p className="sim-inspector-empty">Link is not in the current topology.</p>;
  const hops = run.events.filter((e) => e.linkId === linkId && e.type === 'PACKET_FORWARDED').length;
  return (
    <div className="sim-inspector-group">
      <div className="sim-inspector-group-title">Link</div>
      <Row label="Id" value={edge.id} mono />
      <Row label="Connects" value={`${edge.source} ↔ ${edge.target}`} mono />
      <Row label="Connection" value={edge.connectionType ?? 'ethernet'} />
      <Row label="Traversed" value={`${hops} time(s) in this run`} />
    </div>
  );
}

export default function SimInspector({ run, currentEvent, selection, graphData, sdnState, nfvState, orchestrationState }) {
  const [showLimitations, setShowLimitations] = useState(false);
  const graph = useMemo(() => NetworkGraph.fromJSON(graphData), [graphData]);

  const packetLocation = currentEvent?.linkId
    ? `in transit on link ${currentEvent.linkId} (${currentEvent.fromId} → ${currentEvent.toId})`
    : `at ${currentEvent?.deviceId ?? 'unknown device'}`;

  return (
    <div className="sim-inspector">
      <div className="sim-panel-head">
        <span className="eyebrow">Inspector</span>
        {selection?.kind && (
          <span className="sim-panel-count">
            {selection.kind}: {selection.id}
          </span>
        )}
      </div>

      <div className="sim-inspector-scroll">
        {currentEvent && (
          <div className="sim-inspector-group">
            <div className="sim-inspector-group-title">
              Event {currentEvent.seq} — {currentEvent.type.replace(/_/g, ' ').toLowerCase()}
            </div>
            <p className="sim-inspector-decision">{currentEvent.decision}</p>
            <p className="sim-inspector-accuracy">{describeAccuracy(currentEvent.accuracy)}</p>
            <dl className="sim-explanation">
              <dt>What happened</dt>
              <dd>{currentEvent.explanation?.what}</dd>
              <dt>Who decided</dt>
              <dd>{currentEvent.explanation?.who}</dd>
              <dt>Evidence</dt>
              <dd className="mono">{currentEvent.explanation?.evidence}</dd>
              <dt>Why the next step</dt>
              <dd>{currentEvent.explanation?.whyNext}</dd>
              <dt>Try this</dt>
              <dd>{currentEvent.explanation?.experiment}</dd>
            </dl>
          </div>
        )}

        {selection?.kind === 'device' && (
          <DeviceDetails
            nodeId={selection.id}
            graph={graph}
            run={run}
            sdnState={sdnState}
            nfvState={nfvState}
            orchestrationState={orchestrationState}
          />
        )}

        {selection?.kind === 'link' && <LinkDetails linkId={selection.id} graph={graph} run={run} />}

        {selection?.kind === 'packet' && (
          <div className="sim-inspector-group">
            <div className="sim-inspector-group-title">Packet record</div>
            <Row label="Id" value={run.packet.id} mono />
            <Row label="Source" value={`${run.sourceId} (${run.packet.sourceAddresses.join(', ') || 'no address'})`} mono />
            <Row label="Destination" value={`${run.targetId} (${run.packet.targetAddresses.join(', ') || 'no address'})`} mono />
            <Row label="Source MAC" value={run.packet.sourceMac} mono />
            <Row label="Destination MAC" value={run.packet.targetMac} mono />
            <Row label="VLAN" value={run.packet.vlan ?? null} mono />
            <Row label="Current location" value={packetLocation} />
            <Row label="Engine path" value={(run.path ?? []).join(' → ') || 'none'} mono />
            <Row label="Representation" value="simplified — one token represents the packet" />
          </div>
        )}

        {!selection && (
          <p className="sim-inspector-empty">
            Select a device or link on the canvas, or a timeline event, to inspect it. The packet record is
            always available from the packet button.
          </p>
        )}

        {run?.findings?.length > 0 && (
          <div className="sim-inspector-group">
            <div className="sim-inspector-group-title">Findings from this run</div>
            {run.findings.map((finding) => (
              <div key={finding.id} className={`sim-finding is-${finding.severity}`}>
                <div className="sim-finding-message">{finding.message}</div>
                <div className="sim-finding-evidence mono">{finding.evidence}</div>
              </div>
            ))}
          </div>
        )}

        <div className="sim-inspector-group">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLimitations((v) => !v)}>
            {showLimitations ? 'Hide' : 'Show'} what this model does not simulate
          </button>
          {showLimitations && (
            <ul className="sim-limitations">
              {(run?.limitations ?? []).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
