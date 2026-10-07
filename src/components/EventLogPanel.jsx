import React, { useEffect, useRef } from 'react';
import { useTopologyStore } from '../store/topologyStore.js';

const PACKET_LABELS = {
  'arp-request': 'ARP Request',
  'arp-reply': 'ARP Reply',
  'icmp-echo': 'ICMP Echo Request',
  'icmp-reply': 'ICMP Echo Reply',
};

export default function EventLogPanel() {
  const eventLog = useTopologyStore((s) => s.eventLog);
  const devices = useTopologyStore((s) => s.topology.devices);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog.length]);

  return (
    <div className="panel event-log-panel">
      <h4>Simulation Events</h4>
      {eventLog.length === 0 ? (
        <p className="panel-hint">
          Run a ping to see ARP and ICMP events as packets travel through the topology.
        </p>
      ) : (
        <div className="event-log">
          {eventLog.map((evt) => {
            const device = devices.find((d) => d.id === evt.deviceId);
            const time = new Date(evt.timestamp).toLocaleTimeString();
            return (
              <div key={evt.id} className="event-row">
                <span className="event-time">{time}</span>
                <span className={`event-badge ${evt.packetType}`}>
                  {PACKET_LABELS[evt.packetType] || evt.packetType}
                </span>
                <span className="event-device">{device?.name || evt.deviceId}</span>
                <span className="event-detail">{evt.detail}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
