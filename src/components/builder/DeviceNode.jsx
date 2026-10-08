import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getDeviceDef } from '../../data/devices/deviceCatalog.js';
import { deviceAssets } from '../../assets/assetMap.js';

const DeviceNode = memo(({ data, selected }) => {
  const def = getDeviceDef(data.type);
  const iconSrc = deviceAssets[data.type];
  const interfaces = data.interfaces ?? [];
  const primaryIface = interfaces[0];
  const primaryIp = primaryIface?.ip;

  return (
    <div className={`device-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="device-handle" />

      <div className="device-node-type-badge">{def?.name || data.type}</div>
      {iconSrc ? (
        <img src={iconSrc} alt="" className="device-node-icon" draggable={false} />
      ) : (
        <div className="device-node-emoji">
          <img src={deviceAssets.box} alt="" style={{ width: '1.4rem', height: '1.4rem' }} />
        </div>
      )}

      {data.label && <div className="device-node-name">{data.label}</div>}
      {primaryIp && <div className="device-node-ip">{primaryIp}{primaryIface?.mask ? `/${primaryIface.mask}` : ''}</div>}

      {interfaces.length > 0 && (
        <div className="device-node-interfaces">
          {interfaces.slice(0, 2).map((iface, idx) => (
            <div key={idx} className="device-node-iface">
              <span className="device-node-iface-name">{iface.name}</span>
              <span className="device-node-iface-status">{iface.status !== 'down' ? 'up' : 'down'}</span>
            </div>
          ))}
          {interfaces.length > 2 && (
            <div className="device-node-iface-more">+{interfaces.length - 2} more</div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="device-handle" />
    </div>
  );
});

export default DeviceNode;
