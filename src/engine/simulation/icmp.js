// Minimal ICMP echo simulation for the MVP (same-subnet only).
// Concept reference: joxorsayan/netsim app/engine/packet.py (ICMP unit) — reimplemented in JS.

let packetCounter = 0;

function nextPacketId(prefix) {
  packetCounter += 1;
  return `${prefix}-${packetCounter}`;
}

function hopEvents(topology, packetId, packetType, path, actionMap) {
  const events = [];
  const steps = [];
  path.forEach((deviceId, index) => {
    const device = topology.devices.find((d) => d.id === deviceId);
    const name = device?.name || deviceId;
    let action;
    if (index === 0) action = 'transmit';
    else if (index === path.length - 1) action = 'receive';
    else action = 'forward';

    const detailByAction = actionMap[action] || action;
    events.push({
      id: `evt-${packetId}-${action}-${deviceId}`,
      packetId,
      deviceId,
      action,
      timestamp: new Date().toISOString(),
      packetType,
      detail: `${name} ${detailByAction}`,
    });
    steps.push({ device: deviceId, action, packetType });
  });
  return { events, steps };
}

// Echo request travels source -> target; reply travels target -> source.
export function icmpEcho(topology, sourceId, targetId, path) {
  const requestPacketId = nextPacketId('pkt-icmp-req');
  const replyPacketId = nextPacketId('pkt-icmp-rep');

  const request = hopEvents(topology, requestPacketId, 'icmp-echo', path, {
    transmit: 'transmits ICMP Echo Request',
    forward: 'forwards ICMP Echo Request',
    receive: 'receives ICMP Echo Request',
  });

  const replyPath = [...path].reverse();
  const reply = hopEvents(topology, replyPacketId, 'icmp-reply', replyPath, {
    transmit: 'transmits ICMP Echo Reply',
    forward: 'forwards ICMP Echo Reply',
    receive: 'receives ICMP Echo Reply',
  });

  return {
    events: [...request.events, ...reply.events],
    steps: [...request.steps, ...reply.steps],
  };
}
