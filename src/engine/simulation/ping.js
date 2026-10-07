// Deterministic, synchronous ping simulation for the MVP.
// The engine computes the result; the UI controls animation timing.
// Concept reference: michael-borck/netsim src/engine/network.ts + ip.ts (MIT).

import { getDevice, isConnected } from '../topology/topologyModel.js';
import { arpRequest } from './arp.js';
import { icmpEcho } from './icmp.js';

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function sameSubnet(a, b) {
  if (!a.ip || !b.ip || !a.mask || !b.mask) return false;
  const mask = ipToInt(a.mask);
  return (ipToInt(a.ip) & mask) === (ipToInt(b.ip) & mask);
}

function fail(reason) {
  return { success: false, reason, path: [], events: [], steps: [], packets: [] };
}

export function runPing(topology, sourceId, targetId) {
  const source = getDevice(topology, sourceId);
  const target = getDevice(topology, targetId);

  if (!source || !target) return fail('Device not found');
  if (source.ip && target.ip && source.ip === target.ip) {
    return fail('Duplicate IP address');
  }
  if (source.status === 'down' || target.status === 'down') {
    return fail('Device is administratively down');
  }
  if (!source.ip || !target.ip) {
    return fail('Device IP not configured');
  }
  if (!sameSubnet(source, target)) {
    return fail('No route to destination (router not in topology)');
  }

  const { connected, path } = isConnected(topology, sourceId, targetId);
  if (!connected || path.length < 2) {
    return fail('No link path between devices');
  }

  // ARP exchange (request broadcast + reply), then ICMP echo + reply.
  const arp = arpRequest(topology, sourceId, target.ip);
  const icmp = icmpEcho(topology, sourceId, targetId, path);

  return {
    success: true,
    reason: '',
    path,
    events: [...arp.events, ...icmp.events],
    steps: [...arp.steps, ...icmp.steps],
    packets: [
      { type: 'arp-request', source: sourceId, target: 'broadcast' },
      { type: 'arp-reply', source: targetId, target: sourceId },
      { type: 'icmp-echo', source: sourceId, target: targetId, path },
      { type: 'icmp-reply', source: targetId, target: sourceId, path: [...path].reverse() },
    ],
  };
}
