import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { getDeviceDef } from '../../data/devices/deviceCatalog.js';
import { deviceAssets } from '../../assets/assetMap.js';
import { useCollaboration, useSyncToYjs } from '../../collaboration/CollaborationProvider.jsx';
import { loadSolution, solutionExistsOnCanvas } from '../../data/scenarios/solutionAdapter.js';
import { smallOfficeSolution } from '../../data/scenarios/smallOfficeSolution.js';
import { collegeCampusSolution } from '../../data/scenarios/collegeCampusSolution.js';
import { hospitalSolution } from '../../data/scenarios/hospitalSolution.js';
import { hotelSolution } from '../../data/scenarios/hotelSolution.js';
import { multiBranchSolution } from '../../data/scenarios/multiBranchSolution.js';
import DeviceNode from './DeviceNode.jsx';
import DeviceConsole from './DeviceConsole.jsx';

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

  // Router interface handlers
  const isRouter = data.type === 'router';
  const interfaces = data.interfaces || [];

  const handleInterfaceAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const parts = e.target.value.trim().split('/');
      const ip = parts[0].trim();
      const mask = parts[1] ? parseInt(parts[1], 10) : 24;
      if (isValidIp(ip) && !isNaN(mask) && mask >= 8 && mask <= 30) {
        updateNodeData(selectedNode.id, {
          interfaces: [...interfaces, { ip, mask, name: `G${interfaces.length}` }],
        });
      }
      e.target.value = '';
    }
  };

  const handleInterfaceRemove = (idx) => {
    updateNodeData(selectedNode.id, {
      interfaces: interfaces.filter((_, i) => i !== idx),
    });
  };

  const isValidIp = (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every(o => o <= 255);

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

      {isRouter && (
        <div className="config-section">
          <div className="config-section-title">Router Interfaces</div>
          <div className="field" style={{ marginBottom: '12px' }}>
            <label className="field-label">Interface (IP/mask)</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.1/24 or 10.0.0.1/24"
              onKeyDown={handleInterfaceAdd}
              style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>
          <div className="chip-row" style={{ marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            {interfaces.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--c-text-dim)' }}>No interfaces configured</span>
            )}
            {interfaces.map((iface, idx) => (
              <span key={idx} className="vlan-tag" style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.4)' }}>
                {iface.name}: {iface.ip}/{iface.mask}
                <span className="remove" onClick={() => handleInterfaceRemove(idx)}>✕</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Main Network Builder Component ───────────────────────────────────────────

// Solution Explanation Panel Component
function SolutionExplanationPanel({ explanation, onClose }) {
  return (
    <div className="config-panel" style={{ maxHeight: '100%', overflow: 'auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--c-border)'
      }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Architecture Explanation</h3>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={onClose}
          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
        >
          Close
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Overview */}
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--c-text-dim)' }}>Overview</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--c-text)' }}>{explanation.overview}</p>
        </div>
        
        {/* Traffic Flow */}
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--c-text-dim)' }}>Traffic Flow</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--c-text)', fontFamily: 'monospace' }}>{explanation.trafficFlow}</p>
        </div>
        
        {/* Device Roles */}
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--c-text-dim)' }}>Device Roles</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(explanation.deviceRoles || {}).map(([id, role]) => (
              <div key={id} style={{ 
                padding: '8px 10px', 
                background: 'var(--c-bg-glass)', 
                border: '1px solid var(--c-border)', 
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                lineHeight: 1.4
              }}>
                <strong style={{ color: 'var(--c-accent)' }}>{id}:</strong> {role}
              </div>
            ))}
          </div>
        </div>
        
        {/* Key Insights */}
        {explanation.keyInsights && explanation.keyInsights.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--c-text-dim)' }}>Key Insights</h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--c-text)' }}>
              {explanation.keyInsights.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Validation Notes */}
        {explanation.validationNotes && explanation.validationNotes.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--c-success)' }}>Validation Results</h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--c-success)' }}>
              {explanation.validationNotes.map((note, idx) => (
                <li key={idx}>✓ {note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NetworkBuilder() {
  const reactFlowWrapper = useRef(null);
  const syncToYjs = useSyncToYjs();
  const { projectId } = useCollaboration();

  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const setRFNodes = useGameStore((s) => s.setRFNodes);
  const setRFEdges = useGameStore((s) => s.setRFEdges);
  const setNetworkGraph = useGameStore((s) => s.setNetworkGraph);
  const deleteNode = useGameStore((s) => s.deleteNode);
  const deleteEdge = useGameStore((s) => s.deleteEdge);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const save = useGameStore((s) => s.save);
  const duplicateNode = useGameStore((s) => s.duplicateNode);
  const loadSolution = useGameStore((s) => s.loadSolution);
  const unsavedChanges = useGameStore((s) => s.unsavedChanges);
  const { past, future } = useGameStore((s) => s.network.history);

  const nodes = useGameStore((s) => s.network.rfNodes);
  const edges = useGameStore((s) => s.network.rfEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [activeRightTab, setActiveRightTab] = useState('config');
  const [consoleNodeId, setConsoleNodeId] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([]);
  const [solutionExplanation, setSolutionExplanation] = useState(null);
  const hasFittedView = useRef(false);

  // Sync to Yjs when nodes/edges change
  useEffect(() => {
    syncToYjs(nodes, edges);
  }, [nodes, edges, syncToYjs]);

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

  // Determine if we're in collaboration mode (projectId but no scenario)
  const isCollabMode = projectId && !activeScenarioId;
  const scenario = getScenario(activeScenarioId);
  
  // In collab mode without scenario, provide a default resource pool (unlimited devices)
  const resourcePool = isCollabMode 
    ? { router: 99, l2Switch: 99, l3Switch: 99, firewall: 99, server: 99, accessPoint: 99, pc: 99, laptop: 99, cloud: 99, wirelessController: 99 }
    : (scenario?.resourcePool ?? {});

  // Show empty state message when network is empty
  const isEmpty = nodes.length === 0 && edges.length === 0;

  const nodeTypes = useMemo(() => ({ deviceNode: DeviceNode }), []);

  const nodeCounts = useMemo(() => {
    const counts = {};
    nodes.forEach(n => {
      counts[n.data.type] = (counts[n.data.type] || 0) + 1;
    });
    return counts;
  }, [nodes]);

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

  const onNodeClick = useCallback((_, node) => {
    setActiveRightTab('config');
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    setSelectedNodeIds(selectedNodes.map((n) => n.id));
    setSelectedEdgeIds(selectedEdges.map((e) => e.id));
  }, []);

  // Canvas control functions (defined before handleKeyDown to avoid temporal dead zone)
  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const handleResetViewport = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
    }
  }, [reactFlowInstance]);

  const handleClearCanvas = useCallback(() => {
    if (window.confirm('Clear the entire canvas? This will remove all devices and connections.')) {
      setRFNodes([]);
      setRFEdges([]);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
    }
  }, [setRFNodes, setRFEdges]);

  const handleLoadSolution = useCallback(() => {
    if (!activeScenarioId) return;
    
    let solution = null;
    switch (activeScenarioId) {
      case 'small-office':
        solution = smallOfficeSolution;
        break;
      case 'college-campus':
        solution = collegeCampusSolution;
        break;
      case 'hospital':
        solution = hospitalSolution;
        break;
      case 'hotel':
        solution = hotelSolution;
        break;
      case 'multi-branch':
        solution = multiBranchSolution;
        break;
    }
    
    if (!solution) {
      alert('Solution not yet available for this scenario.');
      return;
    }
    
    // Check if solution already exists on canvas
    if (solutionExistsOnCanvas(solution, nodes, edges)) {
      alert('Solution already loaded.');
      return;
    }
    
    // Confirm if unsaved changes
    if (unsavedChanges && !window.confirm('Load solution? This will replace your current topology and all stage configurations.')) {
      return;
    }
    
    // Load solution via store action (clears history + populates all stages)
    loadSolution(solution.nodes, solution.edges, solution.stageStates);
    
    // Show explanation panel
    setSolutionExplanation(solution.explanation);
  }, [activeScenarioId, nodes, edges, unsavedChanges, loadSolution]);

  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target;
    const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
    if (isInput) return;

    // Save: Ctrl+S
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      save();
      return;
    }

    // Undo: Ctrl+Z
    if (event.key === 'z' && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
      event.preventDefault();
      undo();
      return;
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if (
      (event.key === 'z' && (event.ctrlKey || event.metaKey) && event.shiftKey) ||
      (event.key === 'y' && (event.ctrlKey || event.metaKey))
    ) {
      event.preventDefault();
      redo();
      return;
    }

    // Duplicate: Ctrl+D
    if (event.key === 'd' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (selectedNodeIds.length === 1) {
        duplicateNode(selectedNodeIds[0]);
      }
      return;
    }

    // Fit View: F key
    if (event.key === 'f' && !(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) {
      event.preventDefault();
      handleFitView();
      return;
    }

    // Reset Viewport: R key
    if (event.key === 'r' && !(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) {
      event.preventDefault();
      handleResetViewport();
      return;
    }

    // Delete selected: Delete or Backspace
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      selectedNodeIds.forEach((id) => deleteNode(id));
      selectedEdgeIds.forEach((id) => deleteEdge(id));
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
    }

    // Escape: Clear selection
    if (event.key === 'Escape') {
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
    }
  }, [selectedNodeIds, selectedEdgeIds, deleteNode, deleteEdge, undo, redo, save, duplicateNode, handleFitView, handleResetViewport]);

  // Global keyboard handler for Delete key
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
  const selectedNodeCount = selectedNodeIds.length;
  const selectedEdgeCount = selectedEdgeIds.length;
  const consoleNode = consoleNodeId ? nodes.find(n => n.id === consoleNodeId) : null;

  const openConsole = (nodeId) => {
    setConsoleNodeId(nodeId);
    setActiveRightTab('console');
  };

  const closeConsole = () => {
    setConsoleNodeId(null);
    setActiveRightTab('config');
  };

  const handleValidate = () => {
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
      <BuilderPalette
        resourcePool={resourcePool}
        nodeCounts={nodeCounts}
      />

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
          onSelectionChange={onSelectionChange}
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
          {isEmpty && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              color: 'var(--c-text-dim)',
              maxWidth: 300,
              padding: '24px',
              background: 'var(--c-bg-elevated)',
              border: '1px solid var(--c-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--c-text)' }}>
                Your network is empty
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '16px' }}>
                Drag devices from the palette on the left to start building your network.
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--c-text-dim)', fontFamily: 'monospace' }}>
                Collaboration mode: {projectId?.slice(0, 8)}...
              </div>
            </div>
          )}
        </ReactFlow>
      </div>

      {/* Right: Tabbed Panel */}
      <aside className="config-panel">
        <div className="config-panel-tabs">
          <button
            className={`config-panel-tab ${activeRightTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('config')}
          >
            Config
          </button>
          <button
            className={`config-panel-tab ${activeRightTab === 'console' ? 'active' : ''}`}
            onClick={() => {
              if (selectedNode) {
                setConsoleNodeId(selectedNode.id);
                setActiveRightTab('console');
              }
            }}
            disabled={!selectedNode}
          >
            Console
          </button>
          {solutionExplanation && (
            <button
              className={`config-panel-tab ${activeRightTab === 'solution' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('solution')}
            >
              Solution
            </button>
          )}
        </div>

        <div className="config-panel-content">
          {activeRightTab === 'config' && (
            <ConfigPanel selectedNode={selectedNode} updateNodeData={updateNodeData} />
          )}
          {activeRightTab === 'console' && consoleNode && (
            <DeviceConsole
              node={consoleNode}
              onClose={closeConsole}
              updateNodeData={updateNodeData}
            />
          )}
          {activeRightTab === 'console' && !consoleNode && (
            <div className="config-panel-empty">
              Select a device on the canvas to open its console.
            </div>
          )}
          {activeRightTab === 'solution' && solutionExplanation && (
            <SolutionExplanationPanel 
              explanation={solutionExplanation} 
              onClose={() => setActiveRightTab('config')} 
            />
          )}
        </div>
      </aside>

      {/* Bottom Footer Bar */}
      <div className="builder-footer">
        <div className="builder-footer-info">
          <div className="builder-stat">
            Nodes <span className="builder-stat-value">{nodes.length}</span>
          </div>
          <div className="builder-stat">
            Links <span className="builder-stat-value">{edges.length}</span>
          </div>
          {(selectedNodeCount > 0 || selectedEdgeCount > 0) && (
            <div className="builder-stat" style={{ color: 'var(--c-warning)' }}>
              Selected: {selectedNodeCount > 0 && <span>{selectedNodeCount} node(s)</span>}
              {selectedNodeCount > 0 && selectedEdgeCount > 0 && <span>, </span>}
              {selectedEdgeCount > 0 && <span>{selectedEdgeCount} link(s)</span>}
            </div>
          )}
          {selectedNode && selectedNodeCount <= 1 && (
            <div className="builder-stat" style={{ color: 'var(--c-accent-soft)' }}>
              Selected: <span className="builder-stat-value">{selectedNode.data.label || selectedNode.data.type}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {selectedNode?.data.type === 'router' && (selectedNode.data.interfaces?.length ?? 0) === 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--c-warning)' }}>
              Router has no interfaces — use Config or Console to add IPs.
            </span>
          )}
          {nodes.length > 0 && edges.length === 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--c-text-dim)' }}>
              Connect devices to build paths.
            </span>
          )}
          {unsavedChanges && (
            <button
              className="btn btn-success btn-sm"
              onClick={save}
              title="Save (Ctrl+S)"
            >
              Save
            </button>
          )}
          {activeScenarioId && (
            <button
              className="btn btn-accent btn-sm"
              onClick={handleLoadSolution}
              title="Show Correct Architecture"
            >
              Show Correct Architecture
            </button>
          )}
          {(nodes.length > 0 || edges.length > 0) && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleFitView}
                title="Fit View (F)"
              >
                Fit View
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleResetViewport}
                title="Reset Viewport (R)"
              >
                Reset View
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClearCanvas}
                title="Clear Canvas"
              >
                Clear Canvas
              </button>
            </>
          )}
          {(selectedNodeCount > 0 || selectedEdgeCount > 0) && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                selectedNodeIds.forEach((id) => deleteNode(id));
                selectedEdgeIds.forEach((id) => deleteEdge(id));
                setSelectedNodeIds([]);
                setSelectedEdgeIds([]);
              }}
              title="Delete selected (Del)"
            >
              Delete
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={undo}
            disabled={past.length === 0}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={redo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </button>
          <button
            className="btn btn-primary"
            onClick={handleValidate}
            disabled={nodes.length === 0}
          >
            Validate Architecture →
          </button>
        </div>
      </div>
    </div>
  );
}
