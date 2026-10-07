// Runtime topology model — the "design" object consumed by validationEngine.
// Reference architecture: michael-borck/netsim src/engine/device.ts + network.ts (MIT).

let idCounter = 0;

export function createTopology() {
  return {
    id: `topology-${Date.now()}`,
    name: 'Lab Topology',
    devices: [],
    links: [],
  };
}

export function getDevice(topology, deviceId) {
  return topology.devices.find((d) => d.id === deviceId) || null;
}

export function addDevice(topology, device) {
  const record = {
    id: device.id || `device-${++idCounter}`,
    type: device.type,
    name: device.name,
    ip: device.ip ?? '',
    mask: device.mask ?? '',
    gateway: device.gateway ?? '',
    x: device.x ?? 120,
    y: device.y ?? 160,
  };
  topology.devices.push(record);
  return record;
}

export function updateDevice(topology, deviceId, patch) {
  const device = getDevice(topology, deviceId);
  if (!device) return null;
  Object.assign(device, patch);
  return device;
}

export function removeDevice(topology, deviceId) {
  const before = topology.devices.length;
  topology.devices = topology.devices.filter((d) => d.id !== deviceId);
  topology.links = topology.links.filter(
    (l) => l.source.deviceId !== deviceId && l.target.deviceId !== deviceId,
  );
  return topology.devices.length < before;
}

export function addLink(topology, sourceId, targetId) {
  if (sourceId === targetId) return null;
  if (!getDevice(topology, sourceId) || !getDevice(topology, targetId)) return null;
  const exists = topology.links.some(
    (l) =>
      (l.source.deviceId === sourceId && l.target.deviceId === targetId) ||
      (l.source.deviceId === targetId && l.target.deviceId === sourceId),
  );
  if (exists) return null;
  const link = {
    id: `link-${sourceId}-${targetId}`,
    source: { deviceId: sourceId, port: 'eth0' },
    target: { deviceId: targetId, port: 'eth0' },
    type: 'ethernet',
    status: 'up',
  };
  topology.links.push(link);
  return link;
}

export function removeLink(topology, linkId) {
  const before = topology.links.length;
  topology.links = topology.links.filter((l) => l.id !== linkId);
  return topology.links.length < before;
}

export function getNeighbors(topology, deviceId) {
  const neighbors = [];
  for (const link of topology.links) {
    if (link.status === 'down') continue;
    const source = getDevice(topology, link.source.deviceId);
    const target = getDevice(topology, link.target.deviceId);
    if (!source || !target) continue;
    // Links involving administratively down devices are ignored.
    if (source.status === 'down' || target.status === 'down') continue;
    if (link.source.deviceId === deviceId) neighbors.push(link.target.deviceId);
    else if (link.target.deviceId === deviceId) neighbors.push(link.source.deviceId);
  }
  return neighbors;
}

// BFS over links. Returns { connected, path } where path is the ordered
// device-id list from source to target (inclusive).
export function isConnected(topology, sourceId, targetId) {
  if (sourceId === targetId) return { connected: true, path: [sourceId] };
  const visited = new Set([sourceId]);
  const queue = [[sourceId]];
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    for (const neighbor of getNeighbors(topology, current)) {
      if (visited.has(neighbor)) continue;
      const next = [...path, neighbor];
      if (neighbor === targetId) return { connected: true, path: next };
      visited.add(neighbor);
      queue.push(next);
    }
  }
  return { connected: false, path: [] };
}

// Adapter: exposes the runtime topology in the shape the existing
// validateArchitecture(design, scenario) contract expects
// (design.connections / design.vlans). Resolves the Phase 1 contract gap.
export function toDesign(topology) {
  return {
    connections: topology.links.map(
      (l) => `${l.source.deviceId}->${l.target.deviceId}`,
    ),
    vlans: [],
  };
}
