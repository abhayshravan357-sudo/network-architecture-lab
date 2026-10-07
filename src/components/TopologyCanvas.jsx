import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTopologyStore } from '../store/topologyStore.js';
import { usePacketAnimation } from './PacketAnimation.jsx';

const DEVICE_ICONS = {
  pc: '/icons/pc.svg',
  switch: '/icons/switch.svg',
  router: '/icons/router.svg',
  server: '/icons/server.svg',
  firewall: '/icons/firewall.svg',
  'l3-switch': '/icons/l3-switch.svg',
  controller: '/icons/controller.svg',
};

function DeviceNode({ data }) {
  const isSelected = useTopologyStore((s) => s.selectedDeviceId === data.id);
  return (
    <div className={`device-node ${isSelected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <img src={DEVICE_ICONS[data.type] || '/icons/pc.svg'} alt="" className="device-node-icon" />
      <div className="device-node-name">{data.name}</div>
      {data.ip ? <div className="device-node-ip">{data.ip}</div> : null}
    </div>
  );
}

function SwitchNode({ data }) {
  return <DeviceNode data={data} />;
}

function PacketNode() {
  return <div className="packet-marker" />;
}

const nodeTypes = {
  deviceNode: DeviceNode,
  switchNode: SwitchNode,
  packetNode: PacketNode,
};

function TopologyCanvasInner() {
  const topology = useTopologyStore((s) => s.topology);
  const pingResult = useTopologyStore((s) => s.pingResult);
  const animationTick = useTopologyStore((s) => s.animationTick);
  const { screenToFlowPosition } = useReactFlow();

  const addDevice = useTopologyStore((s) => s.addDevice);
  const connectDevices = useTopologyStore((s) => s.connectDevices);
  const selectDevice = useTopologyStore((s) => s.selectDevice);
  const moveDevice = useTopologyStore((s) => s.moveDevice);
  const deleteDevice = useTopologyStore((s) => s.deleteDevice);
  const disconnectLink = useTopologyStore((s) => s.disconnectLink);
  const openConsole = useTopologyStore((s) => s.openConsole);

  const nodes = useMemo(
    () =>
      topology.devices.map((d) => ({
        id: d.id,
        type: d.type === 'switch' ? 'switchNode' : 'deviceNode',
        position: { x: d.x, y: d.y },
        data: { ...d },
      })),
    [topology.devices],
  );

  const edges = useMemo(
    () =>
      topology.links.map((l) => ({
        id: l.id,
        source: l.source.deviceId,
        target: l.target.deviceId,
        animated: true,
        style: { stroke: '#7dd3fc', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#7dd3fc' },
      })),
    [topology.links],
  );

  const animation = usePacketAnimation({
    steps: pingResult?.steps || [],
    devices: topology.devices,
    tick: animationTick,
    hopMs: 400,
  });

  const packetNodes =
    animation.active && animation.position
      ? [
          {
            id: 'packet-marker',
            type: 'packetNode',
            position: animation.position,
            data: {},
            draggable: false,
          },
        ]
      : [];

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/x-device-type');
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addDevice(type, position);
    },
    [screenToFlowPosition, addDevice],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onConnect = useCallback(
    (params) => {
      if (params.source && params.target) connectDevices(params.source, params.target);
    },
    [connectDevices],
  );

  const onNodeClick = useCallback(
    (_, node) => selectDevice(node.id),
    [selectDevice],
  );

  const onNodeDoubleClick = useCallback(
    (_, node) => openConsole(node.id),
    [openConsole],
  );

  const onNodeDragStop = useCallback(
    (_, node) => moveDevice(node.id, node.position.x, node.position.y),
    [moveDevice],
  );

  const onNodesDelete = useCallback(
    (deleted) => deleted.forEach((n) => deleteDevice(n.id)),
    [deleteDevice],
  );

  const onEdgesDelete = useCallback(
    (deleted) => deleted.forEach((e) => disconnectLink(e.id)),
    [disconnectLink],
  );

  return (
    <div className="lab-canvas" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={[...nodes, ...packetNodes]}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#1e3a5f" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function TopologyCanvas() {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner />
    </ReactFlowProvider>
  );
}
