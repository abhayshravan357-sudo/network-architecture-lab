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
    // ARP cache: Map<nodeId, Map<ipAddress, macAddress>>
    this._arpCaches = new Map();
    // MAC address tables for switches: Map<switchId, Map<macAddress, portId>>
    this._macTables = new Map();
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

  getEdges() {
    return [...this._edges.values()];
  }

  /** All edges that include `nodeId` as either endpoint */
  getEdgesOf(nodeId) {
    return this.getEdges().filter(
      (e) => e.source === nodeId || e.target === nodeId
    );
  }

  // ── ARP Cache operations ──────────────────────────────────────────────────
  /**
   * Get the ARP cache for a node
   * @param {string} nodeId
   * @returns {Map<string, string>} Map of IP -> MAC
   */
  getArpCache(nodeId) {
    if (!this._arpCaches.has(nodeId)) {
      this._arpCaches.set(nodeId, new Map());
    }
    return this._arpCaches.get(nodeId);
  }

  /**
   * Add or update an ARP entry in a node's cache
   * @param {string} nodeId
   * @param {string} ipAddress
   * @param {string} macAddress
   */
  setArpEntry(nodeId, ipAddress, macAddress) {
    const cache = this.getArpCache(nodeId);
    cache.set(ipAddress, macAddress);
  }

  /**
   * Get MAC address from ARP cache
   * @param {string} nodeId
   * @param {string} ipAddress
   * @returns {string | undefined}
   */
  getArpEntry(nodeId, ipAddress) {
    const cache = this.getArpCache(nodeId);
    return cache.get(ipAddress);
  }

  /**
   * Check if ARP cache has entry for IP
   * @param {string} nodeId
   * @param {string} ipAddress
   * @returns {boolean}
   */
  hasArpEntry(nodeId, ipAddress) {
    const cache = this.getArpCache(nodeId);
    return cache.has(ipAddress);
  }

  /**
   * Clear ARP cache for a node
   * @param {string} nodeId
   */
  clearArpCache(nodeId) {
    this._arpCaches.delete(nodeId);
  }

  // ── MAC Address Table (Switch Forwarding Table) ──────────────────────────
  /**
   * Get MAC address table for a switch
   * @param {string} switchId
   * @returns {Map<string, string>} Map of MAC -> port (neighbor node ID)
   */
  getMacTable(switchId) {
    if (!this._macTables.has(switchId)) {
      this._macTables.set(switchId, new Map());
    }
    return this._macTables.get(switchId);
  }

  /**
   * Learn MAC address on a switch port (ingress port)
   * @param {string} switchId
   * @param {string} macAddress
   * @param {string} portId - Neighbor node ID (the port where frame came from)
   */
  learnMac(switchId, macAddress, portId) {
    const table = this.getMacTable(switchId);
    table.set(macAddress, portId);
  }

  /**
   * Look up MAC address in switch table
   * @param {string} switchId
   * @param {string} macAddress
   * @returns {string | undefined} Port ID (neighbor node ID) or undefined
   */
  lookupMac(switchId, macAddress) {
    const table = this.getMacTable(switchId);
    return table.get(macAddress);
  }

  /**
   * Check if MAC is known in switch table
   * @param {string} switchId
   * @param {string} macAddress
   * @returns {boolean}
   */
  hasMacEntry(switchId, macAddress) {
    const table = this.getMacTable(switchId);
    return table.has(macAddress);
  }

  /**
   * Flood frame to all ports except ingress
   * @param {string} switchId
   * @param {string} ingressPortId
   * @returns {string[]} Array of neighbor node IDs (ports to flood to)
   */
  floodPorts(switchId, ingressPortId) {
    const neighbors = this.getNeighbors(switchId);
    return neighbors
      .filter((n) => n.id !== ingressPortId)
      .map((n) => n.id);
  }

  // ── MAC Address Generation ──────────────────────────────────────────────
  /**
   * Generate a deterministic MAC address for a node based on its ID
   * @param {string} nodeId
   * @returns {string} MAC address in format XX:XX:XX:XX:XX:XX
   */
  static generateMac(nodeId) {
    let hash = 0;
    for (let i = 0; i < nodeId.length; i++) {
      hash = ((hash << 5) - hash) + nodeId.charCodeAt(i);
      hash |= 0;
    }
    const bytes = [
      (hash >> 24) & 0xff,
      (hash >> 16) & 0xff,
      (hash >> 8) & 0xff,
      hash & 0xff,
      (hash >> 4) & 0xff,
      hash & 0xff,
    ];
    // Set locally administered bit (bit 1 of first byte)
    bytes[0] = (bytes[0] | 0x02) & 0xfe;
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join(':');
  }

  /**
   * Get or generate MAC address for a node's interface
   * @param {string} nodeId
   * @param {string} [interfaceName] - Optional interface name for multi-interface nodes
   * @returns {string} MAC address
   */
  getNodeMac(nodeId, interfaceName) {
    const node = this._nodes.get(nodeId);
    if (!node) return null;
    
    const key = interfaceName ? `${nodeId}:${interfaceName}` : nodeId;
    const cached = this.getArpEntry(nodeId, key);
    if (cached) return cached;
    
    const mac = NetworkGraph.generateMac(key);
    this.setArpEntry(nodeId, key, mac);
    return mac;
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
   * Get the networks (CIDR) a node is DIRECTLY connected to via its own interfaces.
   * This is different from getNodeNetworks which returns all reachable networks.
   * @param {string} nodeId
   * @returns {string[]} Array of CIDR networks
   */
  getNodeDirectNetworks(nodeId) {
    const node = this._nodes.get(nodeId);
    if (!node || !node.config?.interfaces) return [];
    return node.config.interfaces
      .filter((i) => i.ip && i.mask)
      .map((i) => NetworkGraph.ipToNetwork(i.ip, i.mask));
  }
  /**
   * Get the networks (CIDR) a node owns from its OWN configured addresses.
   *
   * Two configuration shapes are supported because the builder stores
   * endpoint addresses as `config.ip` while routers keep `config.interfaces`:
   *   - interfaces[] with ip + mask → network derived from that interface
   *   - a bare `config.ip`           → network of the router interface that
   *                                    contains it, else an assumed /24
   *
   * This is deliberately different from getNodeNetworks(), which returns every
   * network reachable through the node's L2 neighbourhood. Same-subnet
   * decisions must be based on the node's own addresses.
   *
   * @param {string} nodeId
   * @returns {string[]} Array of CIDR networks
   */
  getNodeOwnNetworks(nodeId) {
    const node = this._nodes.get(nodeId);
    if (!node) return [];

    const networks = new Set();
    for (const iface of node.config?.interfaces ?? []) {
      if (iface.ip && iface.mask) {
        networks.add(NetworkGraph.ipToNetwork(iface.ip, iface.mask));
      }
    }

    const ownIp = node.config?.ip;
    if (ownIp && networks.size === 0) {
      // Resolve the mask from the router interface that owns this address so
      // the decision comes from real configuration, not an assumption.
      for (const router of this.getRouterInterfaces()) {
        if (NetworkGraph.networkContains(router.network, ownIp)) {
          networks.add(router.network);
          break;
        }
      }
      // Fall back to the conventional /24 host assumption when no router
      // interface in the topology claims this address.
      if (networks.size === 0) networks.add(NetworkGraph.ipToNetwork(ownIp, 24));
    }

    return [...networks];
  }

  /**
   * All configured addresses of a node (interfaces first, then config.ip).
   * @param {string} nodeId
   * @returns {string[]}
   */
  getNodeAddresses(nodeId) {
    const node = this._nodes.get(nodeId);
    if (!node) return [];
    const addresses = (node.config?.interfaces ?? [])
      .filter((i) => i.ip)
      .map((i) => i.ip);
    if (node.config?.ip && !addresses.includes(node.config.ip)) {
      addresses.push(node.config.ip);
    }
    return addresses;
  }

  /**
   * Resolve IP to MAC using ARP (simulated)
   * For same-subnet: direct ARP
   * For different subnet: ARP for gateway
   * @param {string} srcNodeId - Source node ID
   * @param {string} targetIp - Target IP address
   * @returns {Object} { mac, viaGateway: boolean, gatewayNodeId?, targetNodeId?, steps: Array, error? }
   */
  resolveMac(srcNodeId, targetIp) {
    const srcNode = this._nodes.get(srcNodeId);
    if (!srcNode) return { mac: null, viaGateway: false, error: 'Source node not found' };
    
    // Check local ARP cache first
    const cachedMac = this.getArpEntry(srcNodeId, targetIp);
    if (cachedMac) {
      return { mac: cachedMac, viaGateway: false, fromCache: true };
    }
    
    // Find target node by IP
    const targetNode = this._findNodeByIp(targetIp);
    if (!targetNode) {
      return { mac: null, viaGateway: false, error: `No node with IP ${targetIp}` };
    }
    
    // Check if same subnet using DIRECT networks (node's own interfaces)
    const srcNetworks = this.getNodeOwnNetworks(srcNodeId);
    const targetNetworks = this.getNodeOwnNetworks(targetNode.id);
    const commonNetwork = srcNetworks.find(n => targetNetworks.includes(n));
    
    if (commonNetwork) {
      // Same subnet - direct ARP
      const targetMac = this.getNodeMac(targetNode.id);
      this.setArpEntry(srcNodeId, targetIp, targetMac);
      this.setArpEntry(targetNode.id, srcNode.config?.interfaces?.[0]?.ip || '', this.getNodeMac(srcNodeId));
      return { 
        mac: targetMac, 
        viaGateway: false, 
        targetNodeId: targetNode.id,
        steps: [
          { type: 'arp-request', from: srcNodeId, to: targetNode.id, targetIp },
          { type: 'arp-reply', from: targetNode.id, to: srcNodeId, mac: targetMac }
        ]
      };
    } else {
      // Different subnet - need gateway
      const gatewayIp = this._findGatewayIp(srcNodeId, targetIp);
      if (!gatewayIp) {
        return { mac: null, viaGateway: false, error: 'No gateway found for destination' };
      }
      
      const gatewayNode = this._findNodeByIp(gatewayIp);
      if (!gatewayNode) {
        return { mac: null, viaGateway: true, error: 'Gateway node not found' };
      }
      
      const gatewayMac = this.getNodeMac(gatewayNode.id);
      this.setArpEntry(srcNodeId, gatewayIp, gatewayMac);
      this.setArpEntry(gatewayNode.id, srcNode.config?.interfaces?.[0]?.ip || '', this.getNodeMac(srcNodeId));
      
      return { 
        mac: gatewayMac, 
        viaGateway: true, 
        gatewayNodeId: gatewayNode.id,
        targetIp,
        steps: [
          { type: 'arp-request', from: srcNodeId, to: gatewayNode.id, targetIp: gatewayIp },
          { type: 'arp-reply', from: gatewayNode.id, to: srcNodeId, mac: gatewayMac }
        ]
      };
    }
  }

  /**
   * Find node by IP address
   * @param {string} ip 
   * @returns {GraphNode|null}
   */
  _findNodeByIp(ip) {
    for (const node of this._nodes.values()) {
      if (node.config?.interfaces) {
        for (const iface of node.config.interfaces) {
          if (iface.ip === ip) return node;
        }
      }
      // Also check if node has a simple IP config
      if (node.config?.ip === ip) return node;
    }
    return null;
  }

  /**
   * Find gateway IP for reaching target IP
   * @param {string} srcNodeId
   * @param {string} targetIp
   * @returns {string|null}
   */
  _findGatewayIp(srcNodeId, targetIp) {
    const srcNode = this._nodes.get(srcNodeId);
    if (!srcNode) return null;

    // Find router on path to target, based on the addresses each side owns
    const srcNetworks = this.getNodeOwnNetworks(srcNodeId);
    const targetNode = this._findNodeByIp(targetIp);
    if (!targetNode) return null;

    const targetNetworks = this.getNodeOwnNetworks(targetNode.id);

    // A gateway is the router interface that faces the source subnet and also
    // owns an interface in the destination subnet.
    const spanning = this.getRoutersSpanning(srcNetworks, targetNetworks);
    for (const router of spanning) {
      return router.ingress.interface.ip;
    }
    return null;
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

  // ── Routing / Subnet support ───────────────────────────────────────────────

  /**
   * Get the IP network (prefix) for an interface config.
   * @returns {string | null} CIDR string like "192.168.1.0/24"
   */
  static ipToNetwork(ip, mask) {
    const parts = ip.split('.').map(Number);
    // Handle both CIDR notation (e.g., '24') and dotted decimal (e.g., '255.255.255.0')
    let maskBits;
    if (typeof mask === 'string' && mask.includes('.')) {
      // Convert dotted decimal to CIDR
      const maskParts = mask.split('.').map(Number);
      let maskInt = (maskParts[0] << 24) | (maskParts[1] << 16) | (maskParts[2] << 8) | maskParts[3];
      maskBits = 0;
      for (let i = 31; i >= 0; i--) {
        if (maskInt & (1 << i)) maskBits++;
        else break;
      }
    } else {
      maskBits = Number(mask);
    }
    const maskBits32 = 32 - maskBits;
    const maskValue = maskBits === 0 ? 0 : (~((1 << maskBits32) - 1)) >>> 0;
    const ipInt = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    const netInt = ipInt & maskValue;
    return `${(netInt >>> 24) & 255}.${(netInt >>> 16) & 255}.${(netInt >>> 8) & 255}.${netInt & 255}/${maskBits}`;
  }

  /**
   * Does a CIDR network contain the given IP address?
   * @param {string} networkCidr e.g. "192.168.1.0/24"
   * @param {string} ip e.g. "192.168.1.37"
   * @returns {boolean}
   */
  static networkContains(networkCidr, ip) {
    if (!networkCidr || !ip) return false;
    const [netIp, prefixRaw] = networkCidr.split('/');
    const prefix = Number(prefixRaw);
    if (!netIp || Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;

    const toInt = (addr) => {
      const parts = addr.split('.').map(Number);
      if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
      return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    };

    const netInt = toInt(netIp);
    const ipInt = toInt(ip);
    if (netInt === null || ipInt === null) return false;
    const mask = prefix === 0 ? 0 : (~((1 << (32 - prefix)) - 1)) >>> 0;
    return (netInt & mask) === (ipInt & mask);
  }

  /**
   * Find routers that have an interface in a network of each set.
   *
   * Router interfaces are inspected per router (not per interface), because a
   * single interface can only belong to one subnet — a router routes between
   * subnets by owning an interface in each of them.
   *
   * @param {string[]} networksA CIDR networks, e.g. the source subnets
   * @param {string[]} networksB CIDR networks, e.g. the destination subnets
   * @returns {Array<{ nodeId, interfaces: Array, ingress: Object }>}
   *   `ingress` is the interface that faces networksA.
   */
  getRoutersSpanning(networksA, networksB) {
    const netsA = new Set(networksA ?? []);
    const netsB = new Set(networksB ?? []);
    const byRouter = new Map();

    for (const ri of this.getRouterInterfaces()) {
      if (!byRouter.has(ri.nodeId)) byRouter.set(ri.nodeId, []);
      byRouter.get(ri.nodeId).push(ri);
    }

    const spanning = [];
    for (const [nodeId, interfaces] of byRouter) {
      const nets = interfaces.map((i) => i.network);
      const inA = interfaces.find((i) => netsA.has(i.network));
      const inB = interfaces.find((i) => netsB.has(i.network));
      // A router reaches both sides when it owns an interface in each set.
      if (inA && inB) spanning.push({ nodeId, interfaces, ingress: inA, egress: inB });
    }
    return spanning;
  }

  /**
   * Get all router interfaces that have IP configs.
   * @returns {Array<{ nodeId, interface, network }>}
   */
  getRouterInterfaces() {
    const results = [];
    for (const node of this._nodes.values()) {
      if (node.type === 'router' && node.config?.interfaces) {
        for (const iface of node.config.interfaces) {
          if (iface.ip && iface.mask) {
            results.push({
              nodeId: node.id,
              interface: iface,
              network: NetworkGraph.ipToNetwork(iface.ip, iface.mask),
            });
          }
        }
      }
    }
    return results;
  }

  /**
   * Check if a node has an interface in the given CIDR network.
   */
  nodeHasNetwork(nodeId, networkCidr) {
    const node = this._nodes.get(nodeId);
    if (!node?.config?.interfaces) return false;
    return node.config.interfaces.some((iface) => {
      if (!iface.ip || !iface.mask) return false;
      return NetworkGraph.ipToNetwork(iface.ip, iface.mask) === networkCidr;
    });
  }

  /**
   * Find a path between two nodes that respects Layer-3 routing.
   * For endpoints in different subnets, the path MUST traverse a router
   * that has interfaces in BOTH subnets.
   * @returns {string[] | null} Node ID path, or null if no routed path exists.
   */
  findRoutedPath(startId, endId) {
    // First check simple L2 connectivity
    const l2Path = this.findPath(startId, endId);
    if (!l2Path) return null;

    const startNode = this._nodes.get(startId);
    const endNode = this._nodes.get(endId);
    if (!startNode || !endNode) return null;

    // If both are endpoints (PC, server, etc.), check if they're in same subnet
    // via a connected router, or need routing
    const startNetworks = this.getNodeNetworks(startId);
    const endNetworks = this.getNodeNetworks(endId);

    // Same subnet = direct L2 connectivity is fine
    const common = startNetworks.find((n) => endNetworks.includes(n));
    if (common) return l2Path;

    // Different subnets: need a router with interfaces in BOTH networks
    const spanning = this.getRoutersSpanning(startNetworks, endNetworks);
    for (const router of spanning) {
      // Verify the router is actually on the L2 path
      if (l2Path.includes(router.nodeId)) return l2Path;
    }

    // No suitable router found on the path
    return null;
  }

  /**
   * Get all networks (CIDR) a node belongs to.
   * For endpoints: check connected router interfaces via L2 path.
   * For routers: return their own interface networks.
   */
  getNodeNetworks(nodeId, visited = new Set()) {
    const node = this._nodes.get(nodeId);
    if (!node) return [];

    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    if (node.type === 'router' && node.config?.interfaces) {
      return node.config.interfaces
        .filter((i) => i.ip && i.mask)
        .map((i) => NetworkGraph.ipToNetwork(i.ip, i.mask));
    }

    const networks = new Set();
    for (const neighbor of this.getNeighbors(nodeId)) {
      const neighborNets = this.getNodeNetworks(neighbor.id, visited);
      for (const n of neighborNets) networks.add(n);
    }
    return [...networks];
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
