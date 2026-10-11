import React, { useState, useMemo } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { learningAssets } from '../../assets/assetMap.js';

/** Core networking concepts organized by category */
const CONCEPTS = {
  fundamentals: [
    {
      id: 'lan',
      title: 'Local Area Network (LAN)',
      category: 'Fundamentals',
      icon: '🏢',
      description: 'A network connecting devices in a limited geographical area like an office or building. Uses Ethernet switching for high-speed communication between endpoints.',
      keyPoints: ['Switches create collision domains', 'MAC address learning', 'Broadcast domains', 'Star topology standard'],
      related: ['vlan', 'switching', 'ethernet'],
    },
    {
      id: 'wan',
      title: 'Wide Area Network (WAN)',
      category: 'Fundamentals',
      icon: '🌐',
      description: 'Connects geographically dispersed networks across cities, countries, or globally. Typically involves ISP links, MPLS, or internet VPNs.',
      keyPoints: ['Router-to-router connections', 'Serial/Digital links', 'MPLS, VPN, SD-WAN', 'NAT at boundaries'],
      related: ['router', 'nat', 'vpn', 'sd-wan'],
    },
    {
      id: 'ethernet',
      title: 'Ethernet & Switching',
      category: 'Fundamentals',
      icon: '🔌',
      description: 'The dominant LAN technology. Switches forward frames based on MAC addresses, learning source addresses from incoming frames.',
      keyPoints: ['CSMA/CD (historical)', 'Full-duplex eliminates collisions', 'MAC address table', 'Flood/forward/filter logic'],
      related: ['lan', 'vlan', 'switching'],
    },
    {
      id: 'ip-addressing',
      title: 'IP Addressing & Subnetting',
      category: 'Fundamentals',
      icon: '🔢',
      description: 'IPv4 addresses (32-bit) divided into network and host portions via subnet masks. CIDR notation (/24) specifies prefix length.',
      keyPoints: ['Network/host bits', 'Private ranges (RFC1918)', 'Subnet calculation', 'VLSM for efficiency'],
      related: ['cidr', 'dhcp', 'routing'],
    },
  ],
  switching: [
    {
      id: 'vlan',
      title: 'Virtual LANs (VLANs)',
      category: 'Switching',
      icon: '🏷️',
      description: 'Logically segment a physical switch into multiple broadcast domains. Tag frames with 802.1Q headers for trunk links.',
      keyPoints: ['Broadcast isolation', 'Security boundaries', '802.1Q trunking', 'Native VLAN considerations'],
      related: ['lan', 'trunking', 'security'],
    },
    {
      id: 'stp',
      title: 'Spanning Tree Protocol (STP)',
      category: 'Switching',
      icon: '🌳',
      description: 'Prevents Layer-2 loops in redundant topologies. Elects a root bridge, blocks redundant ports. RSTP provides faster convergence.',
      keyPoints: ['Root bridge election', 'Port roles (root, designated, blocked)', 'BPDU exchange', 'RSTP port states'],
      related: ['redundancy', 'switching', 'loops'],
    },
    {
      id: 'lacp',
      title: 'Link Aggregation (LACP)',
      category: 'Switching',
      icon: '🔗',
      description: 'Bundles multiple physical links into one logical link for increased bandwidth and redundancy. IEEE 802.3ad standard.',
      keyPoints: ['Active/passive modes', 'Load balancing algorithms', 'Same speed/duplex required', 'Single logical interface'],
      related: ['bandwidth', 'redundancy', 'trunking'],
    },
  ],
  routing: [
    {
      id: 'routing-basics',
      title: 'Routing Fundamentals',
      category: 'Routing',
      icon: '🧭',
      description: 'Routers forward packets between networks using destination IP. Routing tables populated by static routes or dynamic protocols.',
      keyPoints: ['Longest prefix match', 'Administrative distance', 'Static vs dynamic', 'Default routes'],
      related: ['ospf', 'bgp', 'static-routes'],
    },
    {
      id: 'ospf',
      title: 'OSPF (Open Shortest Path First)',
      category: 'Routing',
      icon: '📍',
      description: 'Link-state IGP using Dijkstra algorithm. Areas reduce LSDB size. Fast convergence, hierarchical design.',
      keyPoints: ['Area 0 backbone', 'DR/BDR on multi-access', 'LSA types', 'Cost = 100Mbps/bandwidth'],
      related: ['routing-basics', 'area-design', 'convergence'],
    },
    {
      id: 'bgp',
      title: 'BGP (Border Gateway Protocol)',
      category: 'Routing',
      icon: '🌍',
      description: 'Path-vector EGP powering the Internet. Policy-based routing with attributes (AS-PATH, LOCAL_PREF, MED). iBGP/eBGP distinction.',
      keyPoints: ['AS numbers', 'Path attributes', 'iBGP full mesh / RR', 'Route reflectors'],
      related: ['wan', 'peering', 'policy-routing'],
    },
  ],
  services: [
    {
      id: 'dhcp',
      title: 'DHCP (Dynamic Host Configuration Protocol)',
      category: 'Services',
      icon: '📋',
      description: 'Automates IP address assignment. DORA process: Discover, Offer, Request, Acknowledge. Options provide gateway, DNS, NTP.',
      keyPoints: ['Lease lifecycle', 'Relay agents for remote subnets', 'Option 82 for security', 'Reservation for static needs'],
      related: ['ip-addressing', 'vlan', 'server'],
    },
    {
      id: 'dns',
      title: 'DNS (Domain Name System)',
      category: 'Services',
      icon: '🔍',
      description: 'Hierarchical name resolution. Recursive resolvers query authoritative servers. Caching improves performance.',
      keyPoints: ['A/AAAA/CNAME/MX records', 'TTL and caching', 'Split-horizon DNS', 'DNSSEC for validation'],
      related: ['ip-addressing', 'server', 'security'],
    },
    {
      id: 'nat',
      title: 'NAT (Network Address Translation)',
      category: 'Services',
      icon: '🔄',
      description: 'Translates private IPv4 addresses to public. PAT/NAPT overloads one public IP for many private hosts using port mapping.',
      keyPoints: ['Static/Dynamic/PAT', 'Inside/outside interfaces', 'ALG for embedded IPs', 'IPv6 eliminates need'],
      related: ['wan', 'firewall', 'ipv6'],
    },
  ],
  security: [
    {
      id: 'firewall',
      title: 'Firewall & ACLs',
      category: 'Security',
      icon: '🛡️',
      description: 'Stateful inspection tracks connection state. ACLs filter by IP, port, protocol. Zone-based policy groups interfaces.',
      keyPoints: ['State table', 'Implicit deny', 'Zone-based firewall', 'Application-layer inspection'],
      related: ['nat', 'vlan', 'segmentation'],
    },
    {
      id: 'vpn',
      title: 'VPN (Virtual Private Network)',
      category: 'Security',
      icon: '🔒',
      description: 'Encrypts traffic over untrusted networks. IPsec (site-to-site, remote access) and SSL/TLS (clientless, AnyConnect).',
      keyPoints: ['IPsec phases (IKE, ESP)', 'Tunnel vs transport mode', 'Split tunneling', 'Certificate/PSK auth'],
      related: ['wan', 'encryption', 'remote-access'],
    },
    {
      id: 'segmentation',
      title: 'Network Segmentation',
      category: 'Security',
      icon: '🧱',
      description: 'Divides network into zones with controlled communication. VLANs, firewalls, and micro-segmentation limit blast radius.',
      keyPoints: ['Zero Trust principles', 'DMZ for public services', 'East-west traffic control', 'Micro-segmentation'],
      related: ['vlan', 'firewall', 'zero-trust'],
    },
  ],
  sdn: [
    {
      id: 'sdn-architecture',
      title: 'SDN Architecture',
      category: 'SDN',
      icon: '🎛️',
      description: 'Separates control plane from data plane. Centralized controller programs flow tables via OpenFlow or NETCONF/RESTCONF.',
      keyPoints: ['Control/data plane separation', 'Northbound/Southbound APIs', 'OpenFlow, NETCONF, gNMI', 'Single network view'],
      related: ['openflow', 'controller', 'automation'],
    },
    {
      id: 'openflow',
      title: 'OpenFlow Protocol',
      category: 'SDN',
      icon: '📡',
      description: 'Standard southbound protocol. Controller sends flow_mod messages to match fields (L2-L4) and apply actions (forward, drop, modify).',
      keyPoints: ['Match-action tables', 'Pipeline processing', 'Metering for QoS', 'Group tables for ECMP'],
      related: ['sdn-architecture', 'flow-tables', 'qos'],
    },
    {
      id: 'sdn-policies',
      title: 'Intent-Based SDN Policies',
      category: 'SDN',
      icon: '📝',
      description: 'Declare desired network behavior (allow/deny, QoS, path) — controller computes and installs flows. Validation ensures compliance.',
      keyPoints: ['Declarative intent', 'Automatic translation', 'Continuous verification', 'Rollback on conflict'],
      related: ['sdn-architecture', 'validation', 'automation'],
    },
  ],
  nfv: [
    {
      id: 'nfv-concepts',
      title: 'NFV (Network Functions Virtualization)',
      category: 'NFV',
      icon: '☁️',
      description: 'Decouples network functions from proprietary hardware. Runs VNFs (firewall, router, LB) as software on commodity servers.',
      keyPoints: ['VNF vs PNF', 'NFVI (compute/storage/network)', 'MANO (orchestration)', 'VNF lifecycle management'],
      related: ['vnf', 'mano', 'orchestration'],
    },
    {
      id: 'service-chaining',
      title: 'Service Function Chaining (SFC)',
      category: 'NFV',
      icon: '⛓️',
      description: 'Directs traffic through an ordered sequence of VNFs (e.g., firewall → IDS → load balancer). NSH or VXLAN-GPE for metadata.',
      keyPoints: ['Ordered VNF traversal', 'NSH metadata', 'Classification at entry', 'Symmetric/asymmetric paths'],
      related: ['nfv-concepts', 'vnf', 'traffic-steering'],
    },
    {
      id: 'mano',
      title: 'MANO (Management & Orchestration)',
      category: 'NFV',
      icon: '🤖',
      description: 'ETSI NFV framework: VNFM manages VNF lifecycle, NFVO orchestrates network services, VIM manages infrastructure resources.',
      keyPoints: ['VNFM per-VNF or generic', 'NFVO for NS lifecycle', 'VIM (OpenStack/K8s)', 'Descriptor onboarding (VNFD, NSD)'],
      related: ['nfv-concepts', 'orchestration', 'k8s'],
    },
  ],
  orchestration: [
    {
      id: 'vnf-lifecycle',
      title: 'VNF Lifecycle Management',
      category: 'Orchestration',
      icon: '🔄',
      description: 'Instantiate, configure, scale (in/out), heal, migrate, terminate. LCM operations driven by policies or manual triggers.',
      keyPoints: ['LCM states', 'Scale triggers (CPU, throughput)', 'Live migration', 'Graceful termination'],
      related: ['mano', 'scaling', 'k8s'],
    },
    {
      id: 'k8s-networking',
      title: 'Kubernetes Networking for VNFs',
      category: 'Orchestration',
      icon: '⚓',
      description: 'CNI plugins (Calico, Cilium, Multus) provide pod networking. SR-IOV, DPDK for high-performance VNFs. Network policies for segmentation.',
      keyPoints: ['CNI model', 'Multus for multi-interface', 'SR-IOV/DPDK', 'NetworkPolicy'],
      related: ['mano', 'vnf-lifecycle', 'sr-iov'],
    },
  ],
  scaling: [
    {
      id: 'horizontal-scaling',
      title: 'Horizontal Scaling (Scale Out)',
      category: 'Scaling',
      icon: '➕',
      description: 'Add more VNF instances to handle load. Load balancer distributes traffic. Requires stateless design or shared state store.',
      keyPoints: ['Stateless preferred', 'Session affinity when needed', 'Shared databases', 'Rolling updates'],
      related: ['vnf-lifecycle', 'load-balancer', 'state'],
    },
    {
      id: 'vertical-scaling',
      title: 'Vertical Scaling (Scale Up)',
      category: 'Scaling',
      icon: '⬆️',
      description: 'Increase resources (CPU, memory) of existing VNF instance. Often requires restart. Simpler but has hardware limits.',
      keyPoints: ['Resource hot-add if supported', 'Downtime often required', 'Hardware limits', 'Cost efficiency'],
      related: ['vnf-lifecycle', 'resource-management', 'capacity-planning'],
    },
  ],
};

/** Flatten concepts for search/filter */
const ALL_CONCEPTS = Object.values(CONCEPTS).flat();

const CATEGORIES = [
  { id: 'all', label: 'All Concepts' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'switching', label: 'Switching' },
  { id: 'routing', label: 'Routing' },
  { id: 'services', label: 'Network Services' },
  { id: 'security', label: 'Security' },
  { id: 'sdn', label: 'SDN' },
  { id: 'nfv', label: 'NFV' },
  { id: 'orchestration', label: 'Orchestration' },
  { id: 'scaling', label: 'Scaling' },
];

export default function LearnConcepts() {
  const goToStage = useGameStore((s) => s.goToStage);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConcept, setSelectedConcept] = useState(null);

  const filteredConcepts = useMemo(() => {
    let list = activeCategory === 'all' ? ALL_CONCEPTS : CONCEPTS[activeCategory] ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.keyPoints.some((kp) => kp.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  const handleConceptClick = (concept) => {
    setSelectedConcept(selectedConcept?.id === concept.id ? null : concept);
  };

  return (
    <div className="page-inner anim-fade-in">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Learning Library</div>
        <h2>Networking Concept Reference</h2>
        <p style={{ color: 'var(--c-text-muted)', maxWidth: 640, margin: '10px auto 0' }}>
          Browse core networking, SDN, and NFV concepts. Each entry explains the what, why, and when —
          the architectural reasoning behind real-world design decisions.
        </p>
      </div>

      <div className="learn-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
        {/* Sidebar: Categories + Search */}
        <div className="panel" style={{ padding: 16, height: 'fit-content', position: 'sticky', top: 80 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Browse by Category</div>
          <input
            type="text"
            className="field"
            placeholder="Search concepts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 16, width: '100%' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`concept-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => { setActiveCategory(cat.id); setSelectedConcept(null); }}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: activeCategory === cat.id ? '2px solid var(--c-accent)' : '1px solid var(--c-border)',
                  background: activeCategory === cat.id ? 'rgba(56,189,248,0.08)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  color: 'var(--c-text)',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--c-border)', color: 'var(--c-text-dim)', fontSize: '0.82rem' }}>
            {filteredConcepts.length} concept{filteredConcepts.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Main: Concept list + detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedConcept ? (
            <ConceptDetail concept={selectedConcept} onClose={() => setSelectedConcept(null)} />
          ) : (
            <div className="panel" style={{ padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Concepts</span>
                <span style={{ color: 'var(--c-text-dim)', fontSize: '0.8rem', fontWeight: 400 }}>
                  {filteredConcepts.length} entries
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredConcepts.map((concept) => (
                  <button
                    key={concept.id}
                    className="concept-list-item"
                    onClick={() => handleConceptClick(concept)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      border: '1px solid var(--c-border)',
                      borderRadius: 8,
                      background: 'var(--c-bg-elevated)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-accent)'; e.currentTarget.style.background = 'rgba(56,189,248,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.background = 'var(--c-bg-elevated)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{concept.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{concept.title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--c-text-muted)', lineHeight: 1.5 }}>
                          {concept.description.slice(0, 140)}{concept.description.length > 140 ? '…' : ''}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className="chip" style={{ fontSize: '0.65rem' }}>{concept.category}</span>
                          {concept.keyPoints.slice(0, 2).map((kp, i) => (
                            <span key={i} className="chip" style={{ fontSize: '0.6rem', background: 'var(--c-bg-deep)' }}>{kp}</span>
                          ))}
                        </div>
                      </div>
                      <span style={{ color: 'var(--c-text-dim)', fontSize: '0.7rem' }}>Click to expand</span>
                    </div>
                  </button>
                ))}
                {filteredConcepts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-text-dim)' }}>
                    No concepts match your search. Try a different term or category.
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedConcept && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <button className="btn btn-ghost btn-lg" onClick={() => goToStage(STAGES.HOME)}>
                ← Return to Mission Select
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConceptDetail({ concept, onClose }) {
  return (
    <div className="panel concept-detail anim-fade-in" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2rem' }}>{concept.icon}</span>
          <div>
            <div className="chip" style={{ fontSize: '0.7rem', marginBottom: 6 }}>{concept.category}</div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{concept.title}</h2>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
          ✕
        </button>
      </div>

      <div style={{ color: 'var(--c-text-muted)', lineHeight: 1.7, marginBottom: 20, fontSize: '1.02rem' }}>
        {concept.description}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 8, color: 'var(--c-text)' }}>Key Points</h4>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {concept.keyPoints.map((point, i) => (
            <li key={i} style={{ color: 'var(--c-text-muted)', lineHeight: 1.6 }}>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {concept.related.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 8, color: 'var(--c-text)' }}>Related Concepts</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {concept.related.map((relId) => {
              // Find related concept title
              let related = ALL_CONCEPTS.find((c) => c.id === relId);
              return (
                <button
                  key={relId}
                  className="chip"
                  onClick={() => {
                    // In a real app, would navigate to related concept
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {related ? related.title : relId}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}