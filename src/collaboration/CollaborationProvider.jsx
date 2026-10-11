import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useGameStore } from '../state/gameStore.js';
import { NetworkGraph } from '../engine/graph/graphModel.js';

const CollaborationContext = createContext(null);

// Generate a stable project ID from URL or create new one
const getProjectId = () => {
  const params = new URLSearchParams(window.location.search);
  let projectId = params.get('project');
  if (!projectId) {
    projectId = crypto.randomUUID();
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('project', projectId);
    window.history.replaceState({}, '', newUrl);
  }
  return projectId;
};

// Convert ReactFlow nodes/edges to Yjs shared types - incremental sync
const syncToYjs = (ydoc, rfNodes, rfEdges) => {
  const nodesMap = ydoc.getMap('nodes');
  const edgesMap = ydoc.getMap('edges');
  
  // Track current IDs for cleanup
  const currentNodeIds = new Set(rfNodes.map(n => n.id));
  const currentEdgeIds = new Set(rfEdges.map(e => e.id));
  
  // Remove deleted nodes
  nodesMap.forEach((_, key) => {
    if (!currentNodeIds.has(key)) {
      nodesMap.delete(key);
    }
  });
  
  // Remove deleted edges
  edgesMap.forEach((_, key) => {
    if (!currentEdgeIds.has(key)) {
      edgesMap.delete(key);
    }
  });
  
  // Upsert nodes
  rfNodes.forEach(node => {
    const existing = nodesMap.get(node.id);
    const newValue = {
      id: node.id,
      type: node.data.type,
      position: node.position,
      data: { ...node.data }
    };
    if (!existing || JSON.stringify(existing) !== JSON.stringify(newValue)) {
      nodesMap.set(node.id, newValue);
    }
  });
  
  // Upsert edges
  rfEdges.forEach(edge => {
    const existing = edgesMap.get(edge.id);
    const newValue = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'straight',
      animated: edge.animated || false,
      style: edge.style || { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
      ...edge
    };
    if (!existing || JSON.stringify(existing) !== JSON.stringify(newValue)) {
      edgesMap.set(edge.id, newValue);
    }
  });
};

// Convert Yjs shared types back to ReactFlow format
const syncFromYjs = (ydoc) => {
  const nodesMap = ydoc.getMap('nodes');
  const edgesMap = ydoc.getMap('edges');
  
  const nodes = [];
  const edges = [];
  
  nodesMap.forEach((value, key) => {
    nodes.push({
      id: key,
      type: 'deviceNode',
      position: value.position,
      data: value.data
    });
  });
  
  edgesMap.forEach((value, key) => {
    edges.push({
      id: key,
      source: value.source,
      target: value.target,
      type: value.type || 'straight',
      animated: value.animated || false,
      style: value.style || { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
      ...value
    });
  });
  
  return { nodes, edges };
};

export function CollaborationProvider({ children }) {
  const projectId = useRef(getProjectId()).current;
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isSynced, setIsSynced] = useState(false);
  const [peerCount, setPeerCount] = useState(0); // Number of other connected peers
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const persistenceRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const isInitializedRef = useRef(false);
  const syncTimeoutRef = useRef(null);
  
  // Zustand selectors
  const rfNodes = useGameStore((s) => s.network.rfNodes);
  const rfEdges = useGameStore((s) => s.network.rfEdges);
  const setRFNodes = useGameStore((s) => s.setRFNodes);
  const setRFEdges = useGameStore((s) => s.setRFEdges);
  const setNetworkGraph = useGameStore((s) => s.setNetworkGraph);
  
  // Initialize Yjs
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    
    // Set up IndexedDB persistence for offline support
    const persistence = new IndexeddbPersistence(`sdn-project-${projectId}`, ydoc);
    persistenceRef.current = persistence;
    
    persistence.once('synced', () => {
      console.log('IndexedDB persistence synced');
    });
    
    // Set up WebSocket provider
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:1234';
    const provider = new WebsocketProvider(
      wsUrl,
      projectId,
      ydoc,
      { connect: true, maxBackoffTime: 5000 }
    );
    providerRef.current = provider;
    
    // Connection status handling
    provider.on('status', (event) => {
      setConnectionStatus(event.status); // 'connected' | 'disconnected'
    });
    
    // Track peer count via awareness
    const awareness = provider.awareness;
    const updatePeerCount = () => {
      const states = awareness.getStates();
      // Count other peers (exclude self)
      const count = states.size - (states.has(ydoc.clientID) ? 1 : 0);
      setPeerCount(Math.max(0, count));
    };
    
    awareness.on('change', updatePeerCount);
    updatePeerCount(); // Initial count
    
    provider.on('sync', (isSynced) => {
      setIsSynced(isSynced);
      if (isSynced && !isInitializedRef.current) {
        isInitializedRef.current = true;
        // Initial sync complete - if we have local data, push it
        const { rfNodes: localNodes, rfEdges: localEdges } = useGameStore.getState().network;
        if (localNodes.length > 0 || localEdges.length > 0) {
          isRemoteUpdateRef.current = true;
          syncToYjs(ydoc, localNodes, localEdges);
          isRemoteUpdateRef.current = false;
        }
      }
    });
    
    // Observe changes from remote peers
    const nodesMap = ydoc.getMap('nodes');
    const edgesMap = ydoc.getMap('edges');
    
    const handleRemoteChange = () => {
      if (isRemoteUpdateRef.current) return;
      
      isRemoteUpdateRef.current = true;
      try {
        const { nodes, edges } = syncFromYjs(ydoc);
        setRFNodes(nodes);
        setRFEdges(edges);
        
        // Also update the semantic graph for validation/simulation
        const graph = new NetworkGraph({ nodes, edges });
        setNetworkGraph(graph.exportJSON());
      } finally {
        isRemoteUpdateRef.current = false;
      }
    };
    
    nodesMap.observe(handleRemoteChange);
    edgesMap.observe(handleRemoteChange);
    
    // Initial load from persistence if available
    persistence.once('synced', () => {
      if (nodesMap.size === 0 && edgesMap.size === 0) {
        // Empty doc - will be populated from local state on first sync
      } else if (!isInitializedRef.current) {
        // Has persisted data - load it
        handleRemoteChange();
      }
    });
    
    // Sync local changes to Yjs (called from components) - debounced
    const debouncedSync = (nodes, edges) => {
      if (isRemoteUpdateRef.current) return;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        isRemoteUpdateRef.current = true;
        try {
          syncToYjs(ydoc, nodes, edges);
        } finally {
          isRemoteUpdateRef.current = false;
        }
      }, 50); // Debounce rapid changes
    };
    
    window.__syncToYjs = debouncedSync;
    
    // Cleanup
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      window.__syncToYjs = null;
      awareness.off('change', updatePeerCount);
      provider.destroy();
      persistence.destroy();
      ydoc.destroy();
    };
  }, [projectId]);
  
  // Sync local Zustand changes to Yjs - debounced
  useEffect(() => {
    if (!isRemoteUpdateRef.current && isInitializedRef.current) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        isRemoteUpdateRef.current = true;
        try {
          syncToYjs(ydocRef.current, rfNodes, rfEdges);
        } finally {
          isRemoteUpdateRef.current = false;
        }
      }, 50);
    }
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [rfNodes, rfEdges]);
  
  // Expose collaboration status and actions
  const value = useMemo(() => ({
    projectId,
    connectionStatus,
    isSynced,
    isConnected: connectionStatus === 'connected',
    peerCount, // Number of other connected users
  }), [projectId, connectionStatus, isSynced, peerCount]);
  
  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}

// Helper for components to sync local changes
export function useSyncToYjs() {
  return useCallback((nodes, edges) => {
    if (window.__syncToYjs) {
      window.__syncToYjs(nodes, edges);
    }
  }, []);
}