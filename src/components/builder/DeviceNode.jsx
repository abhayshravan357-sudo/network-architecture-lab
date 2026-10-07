import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getDeviceDef } from '../../data/devices/deviceCatalog.js';
import { deviceAssets } from '../../assets/assetMap.js';

const DeviceNode = memo(({ data, selected }) => {
  const def = getDeviceDef(data.type);
  const iconSrc = deviceAssets[data.type];

  return (
    <div className={`device-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ width: '12px', height: '12px', background: 'var(--c-border-lit)', border: '2px solid var(--c-bg-deep)' }} 
      />
      
      <div className="device-node-type-badge">{def?.name || data.type}</div>
      {iconSrc ? (
        <img src={iconSrc} alt="" className="device-node-icon" draggable={false} />
      ) : (
        <div className="device-node-emoji">{def?.icon || '📦'}</div>
      )}
      
      {data.label && <div className="device-node-name">{data.label}</div>}
      {data.ip && <div className="device-node-ip">{data.ip}</div>}
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ width: '12px', height: '12px', background: 'var(--c-accent)', border: '2px solid var(--c-bg-deep)' }} 
      />
    </div>
  );
});

export default DeviceNode;
