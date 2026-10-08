import React, { useMemo, useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { deployVNF, buildServiceChain, scoreNFV } from '../../engine/nfv/nfvEngine.js';
import { VNF_MAP } from '../../data/vnfs/vnfCatalog.js';
import { DEVICE_CATALOG_MAP } from '../../data/devices/deviceCatalog.js';
import { vnfAssets, uiAssets } from '../../assets/assetMap.js';

const DEFAULT_HOST_RESOURCES = {
  cpu: 8,
  memory: 16,
  throughput: 5000,
};

export default function NfvStage() {
  const graph = useGameStore((s) => s.network.graph);
  const nfvState = useGameStore((s) => s.nfvState);
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const deployVNFAction = useGameStore((s) => s.deployVNF);
  const removeDeployment = useGameStore((s) => s.removeDeployment);
  const setServiceChain = useGameStore((s) => s.setServiceChain);
  const saveNFVResult = useGameStore((s) => s.saveNFVResult);

  const [selectedVnfId, setSelectedVnfId] = useState(null);
  const [deployError, setDeployError] = useState(null);
  const scenario = getScenario(activeScenarioId);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const servers = nodes.filter((n) => n.type === 'server');
  const deployments = nfvState?.deployments ?? [];
  const serviceChain = nfvState?.serviceChain ?? [];

  const opportunityReplaces = (scenario?.vnfOpportunities ?? []).map((o) => o.replaces);
  const palette = useMemo(() => {
    const all = Object.values(VNF_MAP);
    const suggested = all.filter((v) => opportunityReplaces.includes(v.replaces));
    const rest = all.filter((v) => !opportunityReplaces.includes(v.replaces));
    return [...suggested, ...rest];
  }, [scenario]);

  const chainValidation = useMemo(
    () => buildServiceChain(deployments, serviceChain.map((c) => c.id)),
    [deployments, serviceChain]
  );

  const score = useMemo(
    () => scoreNFV({ nodes, edges }, { deployments, serviceChain }, scenario),
    [nodes, edges, deployments, serviceChain, scenario]
  );

  const hostResources = useMemo(() => {
    const map = {};
    for (const s of servers) {
      const hosted = deployments.filter((d) => d.hostNodeId === s.id);
      const allocated = hosted.reduce(
        (acc, d) => {
          const vnf = VNF_MAP[d.vnfId];
          if (!vnf) return acc;
          acc.cpu += vnf.cpu;
          acc.memory += vnf.memory;
          acc.throughput += vnf.throughput;
          return acc;
        },
        { cpu: 0, memory: 0, throughput: 0 }
      );
      const caps = s.config?.resources ?? DEFAULT_HOST_RESOURCES;
      map[s.id] = {
        cpu: caps.cpu,
        memory: caps.memory,
        throughput: caps.throughput,
        allocated,
        remaining: {
          cpu: Math.max(0, caps.cpu - allocated.cpu),
          memory: Math.max(0, caps.memory - allocated.memory),
          throughput: Math.max(0, caps.throughput - allocated.throughput),
        },
      };
    }
    return map;
  }, [servers, deployments]);

  if (nodes.length === 0) {
    return (
      <div className="page-inner anim-fade-in">
        <div className="panel config-panel-empty" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>NFV Stage</div>
          <h2>No network to virtualize yet</h2>
          <p style={{ color: 'var(--c-text-muted)', margin: '12px 0 24px' }}>
            Build a traditional architecture first — NFV replaces physical functions with VNFs on servers.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => goToStage(STAGES.BUILD)}>
            ← Back to Builder
          </button>
        </div>
      </div>
    );
  }

  const handleDeploy = (hostNodeId) => {
    if (!selectedVnfId) return;
    setDeployError(null);
    const vnf = VNF_MAP[selectedVnfId];
    const resources = hostResources[hostNodeId];
    if (!vnf || !resources) return;

    if (resources.remaining.cpu < vnf.cpu || resources.remaining.memory < vnf.memory || resources.remaining.throughput < vnf.throughput) {
      const reasons = [];
      if (resources.remaining.cpu < vnf.cpu) reasons.push(`CPU ${resources.remaining.cpu}/${vnf.cpu}`);
      if (resources.remaining.memory < vnf.memory) reasons.push(`memory ${resources.remaining.memory}/${vnf.memory}`);
      if (resources.remaining.throughput < vnf.throughput) reasons.push(`throughput ${resources.remaining.throughput}/${vnf.throughput}`);
      setDeployError(`Insufficient host resources on ${hostNodeId}: ${reasons.join(', ')}`);
      return;
    }

    const result = deployVNF(selectedVnfId, hostNodeId, { nodes, edges });
    if (!result.ok) {
      setDeployError(result.error);
      return;
    }
    if (deployments.some((d) => d.id === result.deployment.id)) return;
    deployVNFAction(result.deployment);
  };

  const moveInChain = (index, direction) => {
    const next = [...serviceChain];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setServiceChain(next);
  };

  const handleContinue = () => {
    saveNFVResult(scoreNFV({ nodes, edges }, { deployments, serviceChain }, scenario));
    goToStage(STAGES.ORCHESTRATION);
  };

  return (
    <div className="page-inner anim-fade-in">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Modernization Stage — NFV</div>
        <h2>Design with Network Functions Virtualization</h2>
        <p style={{ color: 'var(--c-text-muted)', maxWidth: 640, margin: '10px auto 0' }}>
          Physical appliances (firewall, router, load balancer) run on dedicated hardware.
          NFV runs them as <strong>software VNFs on commodity servers</strong> — deployable,
          scalable, and chainable.
        </p>
      </div>

      <div className="nfv-layout">
        {/* VNF palette */}
        <div className="panel" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>VNF Catalog</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {palette.map((v) => {
              const suggested = opportunityReplaces.includes(v.replaces);
              const deployedCount = deployments.filter((d) => d.vnfId === v.id).length;
              return (
                <button
                  key={v.id}
                  className={`palette-item ${selectedVnfId === v.id ? 'selected' : ''}`}
                  style={{
                    textAlign: 'left',
                    border: selectedVnfId === v.id ? '2px solid var(--c-accent)' : '1px solid var(--c-border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: 'var(--c-bg-elevated)',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  onClick={() => { setSelectedVnfId(v.id); setDeployError(null); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                      {vnfAssets[v.id] ? (
                        <img src={vnfAssets[v.id]} alt="" style={{ width: 26, height: 26 }} draggable={false} />
                      ) : (
                        <span>{v.icon}</span>
                      )}
                      {v.name}
                    </span>
                    {suggested && <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>SCENARIO</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--c-text-dim)', marginTop: 4 }}>
                    CPU {v.cpu} · MEM {v.memory} · {v.throughput.toLocaleString()} users
                    {deployedCount > 0 ? ` · deployed ×${deployedCount}` : ''}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--c-text-muted)', marginTop: 4 }}>{v.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Server hosts with resource accounting */}
        <div className="panel" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Server Hosts</div>
          {!selectedVnfId && (
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.9rem' }}>
              Select a VNF from the catalog, then click a server to deploy it there.
            </p>
          )}
          {deployError && (
            <div style={{ color: 'var(--c-danger)', fontSize: '0.84rem', marginBottom: 10 }}>{deployError}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {servers.map((s) => {
              const hosted = deployments.filter((d) => d.hostNodeId === s.id);
              const resources = hostResources[s.id] ?? DEFAULT_HOST_RESOURCES;
              return (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid var(--c-border)',
                    borderRadius: 10,
                    padding: 12,
                    background: 'var(--c-bg-elevated)',
                    cursor: selectedVnfId ? 'pointer' : 'default',
                  }}
                  onClick={() => handleDeploy(s.id)}
                  title={selectedVnfId ? `Deploy ${selectedVnfId} here` : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <img src={uiAssets.monitor} alt="" style={{ width: '1rem', height: '1rem' }} />
                      {s.id}
                    </span>
                    <span className="chip" style={{ fontSize: '0.7rem' }}>
                      {hosted.length} VNF(s)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--c-text-dim)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>CPU: <span className="mono">{resources.allocated.cpu}</span> / <span className="mono">{resources.cpu}</span> · Remaining: <span className="mono">{resources.remaining.cpu}</span></div>
                    <div>Memory: <span className="mono">{resources.allocated.memory}</span> / <span className="mono">{resources.memory}</span> · Remaining: <span className="mono">{resources.remaining.memory}</span></div>
                    <div>Throughput: <span className="mono">{resources.allocated.throughput}</span> / <span className="mono">{resources.throughput}</span> · Remaining: <span className="mono">{resources.remaining.throughput}</span></div>
                  </div>
                  {hosted.map((d) => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: '0.84rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {vnfAssets[d.vnfId] ? (
                          <img src={vnfAssets[d.vnfId]} alt="" style={{ width: 20, height: 20 }} draggable={false} />
                        ) : (
                          <span>{VNF_MAP[d.vnfId]?.icon}</span>
                        )}
                        {d.vnfId}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); removeDeployment(d.id); }}
                        title="Remove VNF"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
            {servers.length === 0 && (
              <p style={{ color: 'var(--c-text-muted)', fontSize: '0.9rem' }}>
                No servers in the topology — VNFs need server hosts. Add a server in the builder.
              </p>
            )}
          </div>
        </div>

        {/* Service chain + score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Service Chain</div>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.86rem', margin: '0 0 12px' }}>
              Order the deployed VNFs the way traffic traverses them. Traffic is inspected
              (vFirewall, vIDS) <em>before</em> it is distributed (vLoadBalancer, vProxy).
            </p>
            {serviceChain.length === 0 ? (
              <p style={{ color: 'var(--c-text-dim)', fontSize: '0.88rem', fontStyle: 'italic' }}>
                Deployed VNFs appear here. Use ↑ ↓ to order them.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {serviceChain.map((c, i) => (
                  <div key={c.id} className="check-item" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="mono" style={{ color: 'var(--c-accent)', marginRight: 2 }}>{i + 1}.</span>
                      {vnfAssets[c.vnfId] ? (
                        <img src={vnfAssets[c.vnfId]} alt="" style={{ width: 20, height: 20 }} draggable={false} />
                      ) : (
                        <span>{VNF_MAP[c.vnfId]?.icon}</span>
                      )}
                      {c.vnfId}
                      <span style={{ color: 'var(--c-text-dim)' }}> on {c.hostNodeId}</span>
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => moveInChain(i, -1)}>↑</button>
                      <button className="btn btn-ghost btn-sm" disabled={i === serviceChain.length - 1} onClick={() => moveInChain(i, 1)}>↓</button>
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: '0.82rem' }}>
                  {chainValidation.valid ? (
                    <span style={{ color: 'var(--c-success)' }}>✓ Chain is valid — traffic flows through {serviceChain.length} function(s) in order</span>
                  ) : (
                    <span style={{ color: 'var(--c-warning)' }}>
                      △ {chainValidation.errors.join('; ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Score */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>NFV Design Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'monospace', color: score.overall >= 70 ? 'var(--c-success)' : 'var(--c-warning)' }}>
                {score.overall}%
              </span>
              <span style={{ color: 'var(--c-text-dim)', fontSize: '0.9rem' }}>{score.message}</span>
            </div>
            <div className="score-dimensions" style={{ marginTop: 12 }}>
              <div className="score-dimension"><span className="score-dimension-label">Opportunities</span><span className="score-dimension-value">{score.opportunities}%</span></div>
              <div className="score-dimension"><span className="score-dimension-label">Placement</span><span className="score-dimension-value">{score.placement}%</span></div>
              <div className="score-dimension"><span className="score-dimension-label">Chain</span><span className="score-dimension-value">{score.chain}%</span></div>
              <div className="score-dimension"><span className="score-dimension-label">Capacity</span><span className="score-dimension-value">{score.capacity}%</span></div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 16, width: '100%' }} onClick={handleContinue}>
              Continue to Orchestration →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
