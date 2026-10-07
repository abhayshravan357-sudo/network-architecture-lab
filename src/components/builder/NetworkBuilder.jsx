import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { getDeviceDef } from '../../data/devices/deviceCatalog.js';
import { deviceAssets } from '../../assets/assetMap.js';
import DeviceNode from './DeviceNode.jsx';

// ── Palette Component ────────────────────────────────────────────────────────
function BuilderPalette({ resourcePool, nodeCounts }) {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const types = Object.keys(resourcePool).filter(t => resourcePool[t] > 0);

  return (
    <aside className="builder-palette">
      <div className="palette-section-title">Equipment Inventory</div>
      {types.map(type => {
        const def = getDeviceDef(type);
        const max = resourcePool[type] || 0;
        const used = nodeCounts[type] || 0;
        const remaining = max - used;
        const depleted = remaining <= 0;

        return (
          <div 
            key={type}
            className={`palette-item ${depleted ? 'depleted' : ''}`}
            onDragStart={(event) => !depleted && onDragStart(event, type)}
            draggable={!depleted}
            title={depleted ? `All ${def?.name} deployed` : `Drag to deploy ${def?.name}`}
          >
            <div className="palette-item-icon">
              {deviceAssets[type] ? (
                <img src={deviceAssets[type]} alt="" draggable={false} />
              ) : (
                def?.icon
              )}
            </div>
            <div className="palette-item-info">
              <div className="palette-item-name">{def?.name}</div>
            </div>
            <div className={`palette-item-count ${remaining === 0 ? 'low' : ''}`}>
              {remaining}/{max}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

// ── Config Panel Component ───────────────────────────────────────────────────
function ConfigPanel({ selectedNode, updateNodeData }) {
  if (!selectedNode) {
    return (
      <aside className="config-panel">
        <div className="config-panel-empty">
          Select a device on the canvas to view or modify its configuration.
        </div>
      </aside>
    );
  }

  const def = getDeviceDef(selectedNode.data.type);
  const data = selectedNode.data;

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateNodeData(selectedNode.id, { [name]: value });
  };

  const handleVlanAdd = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      const newVlan = parseInt(e.target.value, 10);
      if (!isNaN(newVlan)) {
        const vlans = data.vlans || [];
        if (!vlans.includes(newVlan)) {
          updateNodeData(selectedNode.id, { vlans: [...vlans, newVlan] });
        }
      }
      e.target.value = '';
    }
  };

  const handleVlanRemove = (vlanToRemove) => {
    const vlans = (data.vlans || []).filter(v => v !== vlanToRemove);
    updateNodeData(selectedNode.id, { vlans });
  };

  return (
    <aside className="config-panel">
      <div className="config-section">
        <div className="config-section-title">Identity</div>
        <div className="field">
          <label className="field-label">Device Name</label>
          <input 
            type="text" 
            name="label" 
            value={data.label || ''} 
            onChange={handleChange}
            placeholder={`e.g. Core-${def?.name}`}
          />
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Network</div>
        <div className="field" style={{ marginBottom: '12px' }}>
          <label className="field-label">IP Address (optional)</label>
          <input 
            type="text" 
            name="ip" 
            value={data.ip || ''} 
            onChange={handleChange}
            placeholder="192.168.1.1"
          />
        </div>

        <div className="field">
          <label className="field-label">Assigned VLANs</label>
          <div className="chip-row" style={{ marginBottom: '8px' }}>
            {data.vlans?.map(vlan => (
              <span key={vlan} className="vlan-tag">
                VLAN {vlan}
                <span className="remove" onClick={() => handleVlanRemove(vlan)}>✕</span>
              </span>
            ))}
            {(!data.vlans || data.vlans.length === 0) && (
              <span style={{ fontSize: '0.75rem', color: 'var(--c-text-dim)' }}>None configured</span>
            )}
          </div>
          <input 
            type="number" 
            placeholder="Type VLAN ID and press Enter..." 
            onKeyDown={handleVlanAdd}
            style={{ fontSize: '0.8rem' }}
          />
        </div>
      </div>
    </aside>
  );
}

// ── Main Network Builder Component ───────────────────────────────────────────
export default function NetworkBuilder() {
  const reactFlowWrapper = useRef(null);
  
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const setRFNodes = useGameStore((s) => s.setRFNodes);
  const setRFEdges = useGameStore((s) => s.setRFEdges);
  const setNetworkGraph = useGameStore((s) => s.setNetworkGraph);

  // The zustand store is the single source of truth for the canvas.
  // Every edit (drop, delete, connect, move, relabel) writes straight
  // through to the store, so the builder survives navigation and
  // later stages always see the live architecture.
  const nodes = useGameStore((s) => s.network.rfNodes);
  const edges = useGameStore((s) => s.network.rfEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  // The `fitView` prop cannot be used here: with an empty canvas it
  // fires when the FIRST dropped node is measured and zooms to
  // maxZoom to fit a single device. Instead, fit once on mount only
  // when a saved topology is being restored.
  const hasFittedView = useRef(false);

  useEffect(() => {
    if (!reactFlowInstance || hasFittedView.current) return;
    if (useGameStore.getState().network.rfNodes.length > 0) {
      hasFittedView.current = true;
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [reactFlowInstance]);

  const scenario = getScenario(activeScenarioId);
  if (!scenario) return null;

  const nodeTypes = useMemo(() => ({ deviceNode: DeviceNode }), []);

  // Compute used resources
  const nodeCounts = useMemo(() => {
    const counts = {};
    nodes.forEach(n => {
      counts[n.data.type] = (counts[n.data.type] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Handlers — all derive the next state from the live store so no
  // stale closures can overwrite concurrent edits.
  const onNodesChange = useCallback(
    (changes) =>
      setRFNodes(applyNodeChanges(changes, useGameStore.getState().network.rfNodes)),
    [setRFNodes]
  );
  const onEdgesChange = useCallback(
    (changes) =>
      setRFEdges(applyEdgeChanges(changes, useGameStore.getState().network.rfEdges)),
    [setRFEdges]
  );
  const onConnect = useCallback(
    (params) =>
      setRFEdges(
        addEdge(
          {
            ...params,
            type: 'straight',
            animated: false,
            style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
          },
          useGameStore.getState().network.rfEdges
        )
      ),
    [setRFEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const def = getDeviceDef(type);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNodeId = `${type}-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type: 'deviceNode',
        position,
        data: { 
          type, 
          label: `${def?.name} ${nodeCounts[type] ? nodeCounts[type] + 1 : 1}`,
          vlans: []
        },
      };

      setRFNodes(useGameStore.getState().network.rfNodes.concat(newNode));
    },
    [reactFlowInstance, nodeCounts, setRFNodes]
  );

  const updateNodeData = useCallback((id, newData) => {
    setRFNodes(
      useGameStore
        .getState()
        .network.rfNodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
        )
    );
  }, [setRFNodes]);

  const selectedNode = nodes.find(n => n.selected);

  const handleValidate = () => {
    // Derive the pure graph from the live canvas state for the
    // validation engine and all downstream stages.
    const { rfNodes, rfEdges } = useGameStore.getState().network;
    setNetworkGraph({
      nodes: rfNodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        config: { ...n.data },
      })),
      edges: rfEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        connectionType: 'ethernet',
      })),
    });

    goToStage(STAGES.VALIDATE);
  };

  return (
    <div className="builder-layout anim-fade-in">
      {/* Left: Palette */}
      <BuilderPalette 
        resourcePool={scenario.resourcePool} 
        nodeCounts={nodeCounts} 
      />

      {/* Center: Canvas */}
      <div className="builder-canvas" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: 'straight', animated: false }}
        >
          <Background variant={BackgroundVariant.Lines} gap={24} size={1} color="rgba(148, 163, 184, 0.13)" />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.data.type === 'firewall') return '#f87171';
              if (n.data.type === 'server') return '#34d399';
              return '#3b82f6';
            }}
            maskColor="rgba(6, 13, 26, 0.7)"
          />
        </ReactFlow>
      </div>

      {/* Right: Config Panel */}
      <ConfigPanel 
        selectedNode={selectedNode} 
        updateNodeData={updateNodeData} 
      />

      {/* Bottom Footer Bar */}
      <div className="builder-footer">
        <div className="builder-footer-info">
          <div className="builder-stat">
            Nodes <span className="builder-stat-value">{nodes.length}</span>
          </div>
          <div className="builder-stat">
            Links <span className="builder-stat-value">{edges.length}</span>
          </div>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={handleValidate}
          disabled={nodes.length === 0}
        >
          Validate Architecture →
        </button>
      </div>
    </div>
  );
}
