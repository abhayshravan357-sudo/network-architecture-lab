// Minimal ARP simulation for the MVP.
// Concept reference: michael-borck/netsim src/engine/switch.ts (MAC flooding) and
// joxorsayan/netsim app/engine/packet.py (ARP unit) — behavior reimplemented in JS.

import { getDevice, getNeighbors, isConnected } from '../topology/topologyModel.js';

let packetCounter = 0;

function nextPacketId(prefix) {
  packetCounter += 1;
  return `${prefix}-${packetCounter}`;
}

// BFS flood order from source across the L2 domain. Returns [{ from, to }] pairs.
function broadcastPath(topology, sourceId) {
  const visited = new Set([sourceId]);
  const queue = [sourceId];
  const order = [];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbor of getNeighbors(topology, current)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      order.push({ from: current, to: neighbor });
      queue.push(neighbor);
    }
  }
  return order;
}

// Returns { events, steps, repliedBy } for an ARP request/reply exchange.
export function arpRequest(topology, sourceId, targetIp) {
  const events = [];
  const steps = [];
  const requestPacketId = nextPacketId('pkt-arp-req');
  const replyPacketId = nextPacketId('pkt-arp-rep');

  const hops = broadcastPath(topology, sourceId);
  const source = getDevice(topology, sourceId);

  // 1. ARP request: broadcast from source, flooded across the domain.
  events.push({
    id: `evt-${requestPacketId}-tx`,
    packetId: requestPacketId,
    deviceId: sourceId,
    action: 'broadcast',
    timestamp: new Date().toISOString(),
    packetType: 'arp-request',
    detail: `${source?.name || sourceId} broadcasts ARP: who has ${targetIp}?`,
  });
  steps.push({ device: sourceId, action: 'broadcast', packetType: 'arp-request' });

  let repliedBy = null;
  for (const hop of hops) {
    const device = getDevice(topology, hop.to);
    if (!device) continue;
    if (device.type === 'switch') {
      events.push({
        id: `evt-${requestPacketId}-flood-${hop.to}`,
        packetId: requestPacketId,
        deviceId: hop.to,
        action: 'flood',
        timestamp: new Date().toISOString(),
        packetType: 'arp-request',
        detail: `${device.name} floods ARP request (unknown destination MAC)`,
      });
      steps.push({ device: hop.to, action: 'flood', packetType: 'arp-request' });
    } else if (device.ip === targetIp) {
      events.push({
        id: `evt-${requestPacketId}-rx-${hop.to}`,
        packetId: requestPacketId,
        deviceId: hop.to,
        action: 'receive',
        timestamp: new Date().toISOString(),
        packetType: 'arp-request',
        detail: `${device.name} receives ARP request for its IP ${targetIp}`,
      });
      steps.push({ device: hop.to, action: 'receive', packetType: 'arp-request' });
      repliedBy = hop.to;
    }
  }

  if (!repliedBy) return { events, steps, repliedBy: null };

  // 2. ARP reply: target responds, reply travels back to the source.
  const target = getDevice(topology, repliedBy);
  events.push({
    id: `evt-${replyPacketId}-tx`,
    packetId: replyPacketId,
    deviceId: repliedBy,
    action: 'reply',
    timestamp: new Date().toISOString(),
    packetType: 'arp-reply',
    detail: `${target?.name || repliedBy} replies: ${targetIp} is at its MAC`,
  });

  const { path: replyPath } = isConnected(topology, repliedBy, sourceId);
  const replySteps = [{ device: repliedBy, action: 'reply', packetType: 'arp-reply' }];
  replyPath.forEach((deviceId, index) => {
    if (index === 0 || index === replyPath.length - 1) return; // origin and final RX handled separately
    const device = getDevice(topology, deviceId);
    if (device?.type === 'switch') {
      events.push({
        id: `evt-${replyPacketId}-fwd-${deviceId}`,
        packetId: replyPacketId,
        deviceId,
        action: 'forward',
        timestamp: new Date().toISOString(),
        packetType: 'arp-reply',
        detail: `${device.name} forwards ARP reply toward ${source?.name || sourceId}`,
      });
      replySteps.push({ device: deviceId, action: 'forward', packetType: 'arp-reply' });
    }
  });

  const sourceDevice = getDevice(topology, sourceId);
  events.push({
    id: `evt-${replyPacketId}-rx`,
    packetId: replyPacketId,
    deviceId: sourceId,
    action: 'receive',
    timestamp: new Date().toISOString(),
    packetType: 'arp-reply',
    detail: `${sourceDevice?.name || sourceId} receives ARP reply for ${targetIp}`,
  });
  replySteps.push({ device: sourceId, action: 'receive', packetType: 'arp-reply' });

  steps.push(...replySteps);

  return { events, steps, repliedBy };
}
