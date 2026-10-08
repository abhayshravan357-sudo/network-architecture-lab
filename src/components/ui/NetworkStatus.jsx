import React from 'react';
import { useGameStore } from '../../state/gameStore.js';

export default function NetworkStatus() {
  const network = useGameStore((s) => s.network);
  const nodes = network.graph?.nodes ?? network.rfNodes.map((n) => ({ id: n.id, type: n.data.type, config: n.data }));
  const edges = network.graph?.edges ?? network.rfEdges;
  const sdnState = useGameStore((s) => s.sdnState);
  const nfvState = useGameStore((s) => s.nfvState);

  const devices = nodes.length;
  const links = edges.length;
  const vlans = [...new Set(nodes.flatMap((n) => (n.config?.vlans ?? n.data?.vlans ?? [])))];
  const routers = nodes.filter((n) => (n.type ?? n.data?.type) === 'router').length;
  const vnfs = nfvState?.deployments?.length ?? 0;

  const status = devices === 0 ? 'EMPTY' : links === 0 ? 'NO LINKS' : 'READY';

  return (
    <div className="network-status" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '6px 12px', background: 'var(--c-bg-glass)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>
      <span style={{ fontWeight: 700, color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network</span>
      <span>Devices: <span className="mono" style={{ color: 'var(--c-text)' }}>{devices}</span></span>
      <span>Links: <span className="mono" style={{ color: 'var(--c-text)' }}>{links}</span></span>
      <span>Routers: <span className="mono" style={{ color: 'var(--c-text)' }}>{routers}</span></span>
      <span>VLANs: <span className="mono" style={{ color: 'var(--c-text)' }}>{vlans.length}</span></span>
      <span>VNFs: <span className="mono" style={{ color: 'var(--c-text)' }}>{vnfs}</span></span>
      <span style={{ color: devices === 0 ? 'var(--c-text-dim)' : status === 'READY' ? 'var(--c-success)' : 'var(--c-warning)' }}>● {status}</span>
    </div>
  );
}
