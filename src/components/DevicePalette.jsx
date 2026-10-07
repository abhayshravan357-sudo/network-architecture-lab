import React from 'react';
import { useTopologyStore } from '../store/topologyStore.js';

const ENABLED = [
  { type: 'pc', label: 'PC', hint: 'user endpoint' },
  { type: 'switch', label: 'Switch', hint: 'L2 bridging' },
];

const LOCKED = [
  'Router',
  'Server',
  'Laptop',
  'Access Point',
  'Firewall',
  'L3 Switch',
  'Internet Cloud',
  'SDN Controller',
  'vRouter',
  'vFirewall',
];

export default function DevicePalette() {
  const loadStarterTopology = useTopologyStore((s) => s.loadStarterTopology);
  const resetMission = useTopologyStore((s) => s.resetMission);

  const onDragStart = (event, type) => {
    event.dataTransfer.setData('application/x-device-type', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="device-palette">
      <h4>Devices</h4>
      <p className="palette-hint">Drag a device onto the canvas</p>
      <div className="palette-list">
        {ENABLED.map((item) => (
          <div
            key={item.type}
            className="palette-item"
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
          >
            <span className="palette-item-label">{item.label}</span>
            <span className="palette-item-hint">{item.hint}</span>
          </div>
        ))}
      </div>

      <h4>Later</h4>
      <div className="palette-list locked">
        {LOCKED.map((label) => (
          <div key={label} className="palette-item locked-item">
            <span className="palette-item-label">{label}</span>
            <span className="palette-lock-badge">Later</span>
          </div>
        ))}
      </div>

      <div className="palette-actions">
        <button type="button" className="btn primary" onClick={loadStarterTopology}>
          Load starter topology
        </button>
        <button type="button" className="btn" onClick={resetMission}>
          Clear lab
        </button>
      </div>
    </div>
  );
}
