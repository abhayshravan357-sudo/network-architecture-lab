/**
 * NetworkGraph — pure data graph model (no React dependency).
 *
 * This is the authoritative representation of the student's network
 * that the validation engine reasons about. It is kept in sync with
 * the ReactFlow visual layer but contains additional semantic data
 * (device types, VLAN memberships, configurations) that ReactFlow
 * nodes do not need to know about.
 */
export class NetworkGraph {
  /**
   * @param {{ nodes: Array, edges: Array }} data
   */
  constructor(data = { nodes: [], edges: [] }) {
    /** @type {Map<string, GraphNode>} */
    this._nodes = new Map(data.nodes.map((n) => [n.id, { ...n }]));
    /** @type {Map<string, GraphEdge>} */
    this._edges = new Map(data.edges.map((e) => [e.id, { ...e }]));
  }

  // ── Node operations ─────────────────────────────────────────────────────

  addNode(id, type, config = {}) {
    if (this._nodes.has(id)) {
      throw new Error(`Node "${id}" already exists.`);
    }
    this._nodes.set(id, { id, type, config });
    return this;
  }

  updateNode(id, updates = {}) {
    const node = this._nodes.get(id);
    if (!node) throw new Error(`Node "${id}" not found.`);
    this._nodes.set(id, { ...node, config: { ...node.config, ...updates } });
    return this;
  }

  removeNode(id) {
    this._nodes.delete(id);
    // Remove all edges connected to this node
    for (const [eid, edge] of this._edges) {
      if (edge.source === id || edge.target === id) {
        this._edges.delete(eid);
      }
    }
    return this;
  }

  getNode(id) {
    return this._nodes.get(id) ?? null;
  }

  getNodes() {
    return [...this._nodes.values()];
  }

  getNodesByType(type) {
    return this.getNodes().filter((n) => n.type === type);
  }

  hasNode(id) {
    return this._nodes.has(id);
  }

  // ── Edge operations ─────────────────────────────────────────────────────

  addEdge(id, source, target, connectionType = 'ethernet') {
    if (!this._nodes.has(source)) throw new Error(`Source node "${source}" not found.`);
    if (!this._nodes.has(target)) throw new Error(`Target node "${target}" not found.`);
    if (this._edges.has(id)) throw new Error(`Edge "${id}" already exists.`);
    this._edges.set(id, { id, source, target, connectionType });
    return this;
  }

  removeEdge(id) {
    this._edges.delete(id);
    return this;
  }

  getEdge(id) {
    return this._edges.get(id) ?? null;
  }

  getEdges() {
    return [...this._edges.values()];
  }

  /** All edges that include `nodeId` as either endpoint */
  getEdgesOf(nodeId) {
    return this.getEdges().filter(
      (e) => e.source === nodeId || e.target === nodeId
    );
  }

  // ── Graph queries ────────────────────────────────────────────────────────

  /**
   * Returns direct neighbors of `nodeId`.
   * @param {string} nodeId
   * @returns {GraphNode[]}
   */
  getNeighbors(nodeId) {
    return this.getEdgesOf(nodeId)
      .map((e) => {
        const otherId = e.source === nodeId ? e.target : e.source;
        return this._nodes.get(otherId);
      })
      .filter(Boolean);
  }

  /**
   * BFS: returns all nodes reachable from `startId`.
   * @param {string} startId
   * @returns {GraphNode[]}
   */
  getReachableFrom(startId) {
    if (!this._nodes.has(startId)) return [];
    const visited = new Set();
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of this.getNeighbors(current)) {
        if (!visited.has(neighbor.id)) queue.push(neighbor.id);
      }
    }
    return [...visited].map((id) => this._nodes.get(id));
  }

  /**
   * BFS path: returns the shortest path (list of node ids) from start to end,
   * or null if no path exists.
   * @param {string} startId
   * @param {string} endId
   * @returns {string[] | null}
   */
  findPath(startId, endId) {
    if (!this._nodes.has(startId) || !this._nodes.has(endId)) return null;
    const visited = new Set();
    const queue = [[startId]];
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === endId) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of this.getNeighbors(current)) {
        if (!visited.has(neighbor.id)) queue.push([...path, neighbor.id]);
      }
    }
    return null;
  }

  /**
   * Returns all connected components as arrays of node IDs.
   * @returns {string[][]}
   */
  getConnectedComponents() {
    const unvisited = new Set(this._nodes.keys());
    const components = [];
    while (unvisited.size > 0) {
      const start = unvisited.values().next().value;
      const reachable = this.getReachableFrom(start).map((n) => n.id);
      components.push(reachable);
      for (const id of reachable) unvisited.delete(id);
    }
    return components;
  }

  /**
   * Are two nodes in the same connected component?
   */
  isConnected(aId, bId) {
    return !!this.findPath(aId, bId);
  }

  /**
   * Find any path between two node types (ignoring specific IDs).
   * Returns the first path found, or null.
   * @param {string} fromType
   * @param {string} toType
   */
  findPathBetweenTypes(fromType, toType) {
    const starts = this.getNodesByType(fromType);
    const ends = this.getNodesByType(toType);
    for (const start of starts) {
      for (const end of ends) {
        const path = this.findPath(start.id, end.id);
        if (path) return path;
      }
    }
    return null;
  }

  /**
   * Check if there is a Layer-3 device (router or l3Switch) on ANY path
   * between two node sets defined by their types.
   */
  hasL3BetweenTypes(typeA, typeB) {
    const L3_TYPES = ['router', 'l3Switch'];
    const nodesA = this.getNodesByType(typeA);
    const nodesB = this.getNodesByType(typeB);
    for (const a of nodesA) {
      for (const b of nodesB) {
        const path = this.findPath(a.id, b.id);
        if (!path) continue;
        const pathNodes = path.map((id) => this._nodes.get(id));
        const hasL3 = pathNodes.some((n) => L3_TYPES.includes(n.type));
        if (hasL3) return true;
      }
    }
    return false;
  }

  /**
   * Check if there is a firewall between two node type groups.
   * i.e. at least one path goes through a firewall node.
   */
  hasFirewallBetweenTypes(typeA, typeB) {
    const nodesA = this.getNodesByType(typeA);
    const nodesB = this.getNodesByType(typeB);
    for (const a of nodesA) {
      for (const b of nodesB) {
        const path = this.findPath(a.id, b.id);
        if (!path) continue;
        const hasFirewall = path.some(
          (id) => this._nodes.get(id)?.type === 'firewall'
        );
        if (hasFirewall) return true;
      }
    }
    return false;
  }

  /**
   * Get all distinct VLAN IDs configured across all nodes.
   */
  getAllVLANs() {
    const vlans = new Set();
    for (const node of this._nodes.values()) {
      const nodeVlans = node.config?.vlans ?? [];
      for (const v of nodeVlans) vlans.add(v);
    }
    return [...vlans];
  }

  /**
   * Count nodes of a given type.
   */
  countByType(type) {
    return this.getNodesByType(type).length;
  }

  // ── Serialization ────────────────────────────────────────────────────────

  exportJSON() {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
    };
  }

  static fromJSON(data) {
    return new NetworkGraph(data);
  }
}

/**
 * @typedef {{ id: string, type: string, config: Object }} GraphNode
 * @typedef {{ id: string, source: string, target: string, connectionType: string }} GraphEdge
 */
