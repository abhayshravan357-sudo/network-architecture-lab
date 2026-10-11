/**
 * Simulation device node — the real builder device plus simulation state.
 *
 * Reuses the builder's DeviceNode so the simulated topology is the same
 * component the learner built with, and adds:
 *   - a status ring (source / target / active / traversed / dropped),
 *   - a marker when the packet currently rests on the device,
 *   - VNF badges showing which virtual functions run on this host and where
 *     they sit in the configured service chain.
 */

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import DeviceNode from '../builder/DeviceNode.jsx';
import { sdnAssets, vnfAssets } from '../../assets/assetMap.js';

const SimDeviceNode = memo(function SimDeviceNode({ data, selected }) {
  const onSelect = data.onSelect;

  if (data.role === 'controller') {
    return (
      <div
        className={`sim-node sim-controller${selected ? ' is-selected' : ''}${data.isActive ? ' is-active' : ''}`}
        onClick={() => onSelect?.({ kind: 'device', id: data.id })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect?.({ kind: 'device', id: data.id });
        }}
      >
        <img src={sdnAssets.controller} alt="" className="sim-controller-icon" draggable={false} />
        <div className="sim-controller-text">
          <strong>SDN Controller</strong>
          <span>manages {data.managedCount ?? 0} switch(es)</span>
        </div>
        {data.isActive && <span className="sim-active-dot" aria-hidden="true" />}
        <Handle type="source" position={Position.Bottom} className="sim-handle" />
      </div>
    );
  }

  const status = data.status ?? 'idle';

  return (
    <div
      className={`sim-node status-${status}${selected ? ' is-selected' : ''}${data.packetHere ? ' packet-here' : ''}`}
      onClick={() => onSelect?.({ kind: 'device', id: data.id })}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.({ kind: 'device', id: data.id });
      }}
    >
      <span className="sim-status-ring" aria-hidden="true" />

      <DeviceNode
        data={{
          type: data.type,
          label: data.label,
          ip: data.ip,
          interfaces: data.interfaces,
          vlans: data.vlans,
        }}
        selected={false}
      />

      {data.roleLabel && <span className={`sim-role-tag role-${data.roleLabel.toLowerCase()}`}>{data.roleLabel}</span>}

      {data.vnfBadges?.length > 0 && (
        <div className="sim-vnf-badges">
          {data.vnfBadges.map((badge) => (
            <span
              key={`${badge.vnfId}-${badge.chainPosition}`}
              className={`sim-vnf-badge${badge.running ? '' : ' is-down'}`}
              title={`${badge.vnfId} — service chain position ${badge.chainPosition}${badge.running ? '' : ' (no running instance)'}`}
            >
              {vnfAssets[badge.vnfId] ? (
                <img src={vnfAssets[badge.vnfId]} alt="" draggable={false} />
              ) : (
                <span aria-hidden="true">▣</span>
              )}
              <em>{badge.chainPosition}</em>
            </span>
          ))}
        </div>
      )}

      {data.packetHere && (
        <span className="sim-packet-dot" aria-label="packet is here">
          <span className="sim-packet-dot-core" />
        </span>
      )}

      <Handle type="target" position={Position.Top} className="sim-handle" />
      <Handle type="source" position={Position.Bottom} className="sim-handle" />
    </div>
  );
});

export default SimDeviceNode;
