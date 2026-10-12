/**
 * Small Office Scenario Solution
 * 
 * Reference architecture: Internet → Firewall → Router → L2 Switch → PCs + Server
 * Simple star topology with perimeter security.
 */

export const smallOfficeSolution = {
  nodes: [
    // Internet / Cloud
    {
      id: 'cloud-1',
      type: 'deviceNode',
      position: { x: 100, y: 300 },
      data: {
        type: 'cloud',
        label: 'Internet',
        vlans: [],
      },
    },
    // Firewall at perimeter
    {
      id: 'fw-1',
      type: 'deviceNode',
      position: { x: 300, y: 300 },
      data: {
        type: 'firewall',
        label: 'FW-1 (Perimeter)',
        vlans: [],
      },
    },
    // Router for NAT and WAN connectivity
    {
      id: 'rt-1',
      type: 'deviceNode',
      position: { x: 500, y: 300 },
      data: {
        type: 'router',
        label: 'Router-1',
        vlans: [],
        interfaces: [
          { ip: '203.0.113.1', mask: 29, name: 'G0/0 (WAN)' },
          { ip: '192.168.1.1', mask: 24, name: 'G0/1 (LAN)' },
        ],
      },
    },
    // L2 Switch for LAN
    {
      id: 'sw-1',
      type: 'deviceNode',
      position: { x: 700, y: 300 },
      data: {
        type: 'l2Switch',
        label: 'SW-1 (Access)',
        vlans: [10],
      },
    },
    // Server (File/DHCP/DNS)
    {
      id: 'srv-1',
      type: 'deviceNode',
      position: { x: 700, y: 150 },
      data: {
        type: 'server',
        label: 'SRV-1 (File/DHCP/DNS)',
        vlans: [10],
        ip: '192.168.1.10',
        services: ['dhcp', 'dns'],
        dhcp: true,
        dhcpRange: '192.168.1.100-192.168.1.200',
      },
    },
    // PCs (12 total - arranged in 3 rows of 4)
    {
      id: 'pc-1',
      type: 'deviceNode',
      position: { x: 900, y: 100 },
      data: { type: 'pc', label: 'PC-1 (Finance)', vlans: [10], ip: '192.168.1.101' },
    },
    {
      id: 'pc-2',
      type: 'deviceNode',
      position: { x: 900, y: 170 },
      data: { type: 'pc', label: 'PC-2 (Finance)', vlans: [10], ip: '192.168.1.102' },
    },
    {
      id: 'pc-3',
      type: 'deviceNode',
      position: { x: 900, y: 240 },
      data: { type: 'pc', label: 'PC-3 (Finance)', vlans: [10], ip: '192.168.1.103' },
    },
    {
      id: 'pc-4',
      type: 'deviceNode',
      position: { x: 900, y: 310 },
      data: { type: 'pc', label: 'PC-4 (Finance)', vlans: [10], ip: '192.168.1.104' },
    },
    {
      id: 'pc-5',
      type: 'deviceNode',
      position: { x: 900, y: 380 },
      data: { type: 'pc', label: 'PC-5 (Ops)', vlans: [10], ip: '192.168.1.105' },
    },
    {
      id: 'pc-6',
      type: 'deviceNode',
      position: { x: 900, y: 450 },
      data: { type: 'pc', label: 'PC-6 (Ops)', vlans: [10], ip: '192.168.1.106' },
    },
    {
      id: 'pc-7',
      type: 'deviceNode',
      position: { x: 900, y: 520 },
      data: { type: 'pc', label: 'PC-7 (Ops)', vlans: [10], ip: '192.168.1.107' },
    },
    {
      id: 'pc-8',
      type: 'deviceNode',
      position: { x: 900, y: 590 },
      data: { type: 'pc', label: 'PC-8 (Ops)', vlans: [10], ip: '192.168.1.108' },
    },
    {
      id: 'pc-9',
      type: 'deviceNode',
      position: { x: 1080, y: 100 },
      data: { type: 'pc', label: 'PC-9 (Ops)', vlans: [10], ip: '192.168.1.109' },
    },
    {
      id: 'pc-10',
      type: 'deviceNode',
      position: { x: 1080, y: 170 },
      data: { type: 'pc', label: 'PC-10 (Ops)', vlans: [10], ip: '192.168.1.110' },
    },
    {
      id: 'pc-11',
      type: 'deviceNode',
      position: { x: 1080, y: 240 },
      data: { type: 'pc', label: 'PC-11 (Ops)', vlans: [10], ip: '192.168.1.111' },
    },
    {
      id: 'pc-12',
      type: 'deviceNode',
      position: { x: 1080, y: 310 },
      data: { type: 'pc', label: 'PC-12 (Ops)', vlans: [10], ip: '192.168.1.112' },
    },
  ],
  
  edges: [
    // Internet → Firewall
    { id: 'e1', source: 'cloud-1', target: 'fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // Firewall → Router
    { id: 'e2', source: 'fw-1', target: 'rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // Router → Switch
    { id: 'e3', source: 'rt-1', target: 'sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // Switch → Server
    { id: 'e4', source: 'sw-1', target: 'srv-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // Switch → PCs (first row)
    { id: 'e5', source: 'sw-1', target: 'pc-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e6', source: 'sw-1', target: 'pc-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e7', source: 'sw-1', target: 'pc-3', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e8', source: 'sw-1', target: 'pc-4', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // Switch → PCs (second row)
    { id: 'e9', source: 'sw-1', target: 'pc-5', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e10', source: 'sw-1', target: 'pc-6', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e11', source: 'sw-1', target: 'pc-7', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e12', source: 'sw-1', target: 'pc-8', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // Switch → PCs (third row)
    { id: 'e13', source: 'sw-1', target: 'pc-9', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e14', source: 'sw-1', target: 'pc-10', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e15', source: 'sw-1', target: 'pc-11', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e16', source: 'sw-1', target: 'pc-12', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
  ],
  
  explanation: {
    overview: 'Internet → Firewall → Router → L2 Switch → PCs + Server. Simple star topology with perimeter security.',
    deviceRoles: {
      'cloud-1': 'Represents the Internet/ISP connection point.',
      'fw-1': 'Perimeter firewall protecting the internal network from Internet threats. All traffic passes through here.',
      'rt-1': 'Router performs NAT (sharing one public IP) and connects the office LAN to the Internet via the firewall. G0/0 faces WAN, G0/1 faces LAN.',
      'sw-1': 'Single L2 access switch connecting all 12 PCs and the server. Ports assigned to VLAN 10.',
      'srv-1': 'Central file server also running DHCP and DNS services for the office. Static IP 192.168.1.10.',
      'pc-1..pc-12': 'Employee workstations (Finance and Operations departments). Receive IPs via DHCP from the server.',
    },
    trafficFlow: 'Internet ↔ Firewall ↔ Router (NAT) ↔ Switch ↔ PCs/Server. All internal traffic stays on the switch. Internet traffic passes through firewall → router NAT.',
    keyInsights: [
      'The firewall sits at the Internet boundary — first line of defense.',
      'The router performs NAT, allowing all 12 PCs + server to share one public IP.',
      'A single L2 switch is sufficient for 12 users in a small office.',
      'The server provides DHCP and DNS, eliminating manual IP configuration.',
      'VLAN 10 segments the office network (only one VLAN needed at this scale).',
    ],
    validationNotes: [
      'All 12 PCs connected to switch → passes "all-pcs-connected" validation.',
      'Path exists PC → Switch → Router → Firewall → Cloud → passes "internet-reachable".',
      'Server connected to switch → passes "server-reachable".',
      'Server has DHCP service → passes "dhcp-present".',
      'Firewall between Cloud and Switch → passes "internet-boundary-secured".',
    ],
  },

  // Stage states for 100% validation
  stageStates: {
    sdnState: {
      controllerPlaced: true,
      flowRules: [
        { switchId: 'sw-1', priority: 100, match: { in_port: 'any' }, actions: [{ type: 'output', port: 'normal' }] },
        { switchId: 'sw-1', priority: 200, match: { eth_type: 0x0800, ipv4_dst: '192.168.1.10' }, actions: [{ type: 'output', port: 'srv-1' }] },
      ],
      policyFlows: [],
      policies: [],
      sdnEvents: [],
    },
    nfvState: {
      deployments: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'srv-1', resources: { cpu: 2, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-1', resources: { cpu: 1, memory: 512 } },
      ],
      serviceChain: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'srv-1', resources: { cpu: 2, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-1', resources: { cpu: 1, memory: 512 } },
      ],
    },
    orchestrationState: {
      instances: [
        { id: 'vnf-fw-instance', vnfId: 'vFirewall', hostNodeId: 'srv-1', state: 'running', resources: { cpu: 2, memory: 2048 } },
        { id: 'vnf-dhcp-instance', vnfId: 'vDHCP', hostNodeId: 'srv-1', state: 'running', resources: { cpu: 1, memory: 512 } },
      ],
      actions: [
        { kind: 'deploy', instanceId: 'vnf-fw-instance', timestamp: Date.now() },
        { kind: 'deploy', instanceId: 'vnf-dhcp-instance', timestamp: Date.now() },
      ],
      load: 0.15,
    },
    simulationState: {
      events: [
        { seq: 0, type: 'PACKET_SENT', fromId: 'pc-1', toId: 'srv-1', deviceId: 'pc-1', decision: 'Host sends frame to default gateway', timestamp: Date.now() },
        { seq: 1, type: 'SWITCH_FWD', fromId: 'pc-1', toId: 'rt-1', deviceId: 'sw-1', decision: 'Forward to router', timestamp: Date.now() },
        { seq: 2, type: 'ROUTER_NAT', fromId: 'rt-1', toId: 'fw-1', deviceId: 'rt-1', decision: 'NAT translation', timestamp: Date.now() },
        { seq: 3, type: 'FIREWALL_ALLOW', fromId: 'fw-1', toId: 'cloud-1', deviceId: 'fw-1', decision: 'Permit outbound', timestamp: Date.now() },
      ],
      graphAfter: null,
    },
  },
};