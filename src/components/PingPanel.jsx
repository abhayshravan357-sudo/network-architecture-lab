import React, { useEffect, useState } from 'react';
import { useTopologyStore } from '../store/topologyStore.js';

export default function PingPanel() {
  // Select the stable devices array reference; derive the PC
  // list in render. Filtering inside a Zustand v5 selector
  // creates a new array on every snapshot and causes an
  // infinite re-render loop (blank Lab).
  const devices = useTopologyStore((s) => s.topology.devices);
  const pingResult = useTopologyStore((s) => s.pingResult);
  const runPing = useTopologyStore((s) => s.runPing);
  const replayPing = useTopologyStore((s) => s.replayPing);
  const pcs = devices.filter((d) => d.type === 'pc');

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  // Keep selections valid as PCs are added/removed.
  useEffect(() => {
    if (pcs.length === 0) {
      setSourceId('');
      setTargetId('');
    } else {
      if (!pcs.some((p) => p.id === sourceId)) setSourceId(pcs[0].id);
      if (!pcs.some((p) => p.id === targetId) || targetId === sourceId) {
        setTargetId(pcs.find((p) => p.id !== sourceId)?.id || pcs[0].id);
      }
    }
  }, [devices, sourceId, targetId]);

  const canPing = sourceId && targetId && sourceId !== targetId;

  return (
    <div className="panel ping-panel">
      <h4>Ping</h4>
      <div className="ping-selectors">
        <label className="field">
          <span>Source</span>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">— select PC —</option>
            {pcs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.ip || 'no IP'})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Target</span>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">— select PC —</option>
            {pcs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.ip || 'no IP'})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ping-actions">
        <button
          type="button"
          className="btn primary"
          disabled={!canPing}
          onClick={() => runPing(sourceId, targetId)}
        >
          PING
        </button>
        {pingResult && (
          <button type="button" className="btn" onClick={replayPing}>
            Replay animation
          </button>
        )}
      </div>

      {pingResult && (
        <div className={`ping-result ${pingResult.success ? 'success' : 'failed'}`}>
          <strong>{pingResult.success ? 'PING SUCCESSFUL' : 'PING FAILED'}</strong>
          {pingResult.success ? (
            <span>
              Reply from {pcs.find((p) => p.id === targetId)?.ip || targetId}: time &lt;1ms,
              TTL=64
            </span>
          ) : (
            <span>Reason: {pingResult.reason}</span>
          )}
        </div>
      )}
    </div>
  );
}
