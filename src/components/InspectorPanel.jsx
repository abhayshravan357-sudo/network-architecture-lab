import React from 'react';
import { useTopologyStore } from '../store/topologyStore.js';

export default function InspectorPanel() {
  const devices = useTopologyStore((s) => s.topology.devices);
  const selectedDeviceId = useTopologyStore((s) => s.selectedDeviceId);
  const selectedDevice = selectedDeviceId
    ? devices.find((d) => d.id === selectedDeviceId) || null
    : null;
  const updateSelectedDevice = useTopologyStore((s) => s.updateSelectedDevice);
  const deleteDevice = useTopologyStore((s) => s.deleteDevice);
  const openConsole = useTopologyStore((s) => s.openConsole);

  if (!selectedDevice) {
    return (
      <div className="panel inspector-panel">
        <h4>Inspector</h4>
        <p className="panel-hint">Select a device on the canvas to view and edit its properties.</p>
      </div>
    );
  }

  const isPc = selectedDevice.type === 'pc';

  return (
    <div className="panel inspector-panel">
      <h4>Inspector — {selectedDevice.name}</h4>
      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={selectedDevice.name}
          onChange={(e) => updateSelectedDevice({ name: e.target.value })}
        />
      </label>
      <label className="field">
        <span>IP Address</span>
        <input
          type="text"
          value={selectedDevice.ip}
          disabled={!isPc}
          placeholder={isPc ? '192.168.1.10' : 'Layer-2 device (no IP)'}
          onChange={(e) => updateSelectedDevice({ ip: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Subnet Mask</span>
        <input
          type="text"
          value={selectedDevice.mask}
          disabled={!isPc}
          placeholder="255.255.255.0"
          onChange={(e) => updateSelectedDevice({ mask: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Gateway</span>
        <input
          type="text"
          value={selectedDevice.gateway}
          disabled={!isPc}
          placeholder="Not used in this mission"
          onChange={(e) => updateSelectedDevice({ gateway: e.target.value })}
        />
      </label>
      <div className="palette-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => openConsole(selectedDevice.id)}
        >
          Open Console
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={() => deleteDevice(selectedDevice.id)}
        >
          Delete device
        </button>
      </div>
    </div>
  );
}
