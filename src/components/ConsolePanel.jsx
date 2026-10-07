import { useEffect } from 'react';
import { useTopologyStore } from '../store/topologyStore.js';
import DeviceConsole from './DeviceConsole.jsx';

export default function ConsolePanel() {
  const consoleDeviceId = useTopologyStore((s) => s.consoleDeviceId);
  const devices = useTopologyStore((s) => s.topology.devices);
  const closeConsole = useTopologyStore((s) => s.closeConsole);
  const device = consoleDeviceId
    ? devices.find((d) => d.id === consoleDeviceId) || null
    : null;

  // Auto-close when the configured device is deleted.
  useEffect(() => {
    if (consoleDeviceId && !device) closeConsole();
  }, [consoleDeviceId, device, closeConsole]);

  if (!consoleDeviceId || !device) return null;

  return (
    <div className="console-panel">
      <div className="console-header">
        <span className="console-title">
          Console — {device.name} <span className="console-type">({device.type})</span>
        </span>
        <button type="button" className="btn" onClick={closeConsole}>
          Close
        </button>
      </div>
      <DeviceConsole key={device.id} deviceId={device.id} />
    </div>
  );
}
