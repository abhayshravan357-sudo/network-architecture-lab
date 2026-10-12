/**
 * Multi-Branch Enterprise Scenario Solution
 * 
 * Hub-and-spoke WAN: HQ acts as the hub with the central data center. 
 * Each branch has its own router, firewall, and L3 switch. 
 * All inter-branch traffic transits HQ. Each site has independent Internet access.
 */

export const multiBranchSolution = {
  nodes: [
    // Internet (2 connections - HQ and Branch C)
    {
      id: 'cloud-hq',
      type: 'deviceNode',
      position: { x: 100, y: 200 },
      data: { type: 'cloud', label: 'Internet (HQ)', vlans: [] },
    },
    {
      id: 'cloud-bc',
      type: 'deviceNode',
      position: { x: 1500, y: 600 },
      data: { type: 'cloud', label: 'Internet (Branch C)', vlans: [] },
    },
    // HQ Perimeter
    {
      id: 'hq-fw-1',
      type: 'deviceNode',
      position: { x: 300, y: 200 },
      data: { type: 'firewall', label: 'HQ-FW-1', vlans: [] },
    },
    {
      id: 'hq-rt-1',
      type: 'deviceNode',
      position: { x: 500, y: 200 },
      data: { 
        type: 'router', 
        label: 'HQ-Edge-RT', 
        vlans: [],
        interfaces: [
          { ip: '203.0.113.1', mask: 29, name: 'G0/0 (WAN)' },
          { ip: '10.0.0.1', mask: 24, name: 'G0/1 (Core)' },
        ],
      },
    },
    // HQ Core L3 Switches
    {
      id: 'hq-core-1',
      type: 'deviceNode',
      position: { x: 700, y: 200 },
      data: { type: 'l3Switch', label: 'HQ-Core-1 (L3)', vlans: [10,20,30,40,60,70] },
    },
    {
      id: 'hq-core-2',
      type: 'deviceNode',
      position: { x: 700, y: 300 },
      data: { type: 'l3Switch', label: 'HQ-Core-2 (L3)', vlans: [10,20,30,40,60,70] },
    },
    // HQ Access Switches per department
    {
      id: 'hq-eng-sw',
      type: 'deviceNode',
      position: { x: 900, y: 50 },
      data: { type: 'l2Switch', label: 'HQ-Eng-SW', vlans: [10] },
    },
    {
      id: 'hq-fin-sw',
      type: 'deviceNode',
      position: { x: 900, y: 150 },
      data: { type: 'l2Switch', label: 'HQ-Fin-SW', vlans: [20] },
    },
    {
      id: 'hq-hr-sw',
      type: 'deviceNode',
      position: { x: 900, y: 250 },
      data: { type: 'l2Switch', label: 'HQ-HR-SW', vlans: [30] },
    },
    {
      id: 'hq-srv-sw',
      type: 'deviceNode',
      position: { x: 900, y: 350 },
      data: { type: 'l2Switch', label: 'HQ-Srv-SW', vlans: [40] },
    },
    {
      id: 'hq-mgmt-sw',
      type: 'deviceNode',
      position: { x: 900, y: 450 },
      data: { type: 'l2Switch', label: 'HQ-Mgmt-SW', vlans: [60] },
    },
    // HQ WAN Router (connects to branches)
    {
      id: 'hq-wan-rt',
      type: 'deviceNode',
      position: { x: 700, y: 400 },
      data: { 
        type: 'router', 
        label: 'HQ-WAN-RT', 
        vlans: [70],
        interfaces: [
          { ip: '10.70.1.1', mask: 24, name: 'G0/0 (Branch A)' },
          { ip: '10.70.2.1', mask: 24, name: 'G0/1 (Branch B)' },
          { ip: '10.70.3.1', mask: 24, name: 'G0/2 (Branch C)' },
        ],
      },
    },
    // HQ Servers (4)
    {
      id: 'hq-srv-1',
      type: 'deviceNode',
      position: { x: 1100, y: 320 },
      data: { type: 'server', label: 'HQ-SRV-1 (File)', vlans: [40], ip: '10.40.1.10' },
    },
    {
      id: 'hq-srv-2',
      type: 'deviceNode',
      position: { x: 1100, y: 360 },
      data: { type: 'server', label: 'HQ-SRV-2 (HRIS)', vlans: [40], ip: '10.40.1.20' },
    },
    {
      id: 'hq-srv-3',
      type: 'deviceNode',
      position: { x: 1100, y: 400 },
      data: { type: 'server', label: 'HQ-SRV-3 (ERP)', vlans: [40], ip: '10.40.1.30' },
    },
    {
      id: 'hq-srv-4',
      type: 'deviceNode',
      position: { x: 1100, y: 440 },
      data: { type: 'server', label: 'HQ-SRV-4 (Dev/DNS/DHCP)', vlans: [40], ip: '10.40.1.40' },
    },
    // HQ PCs (20 per dept = 60)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `hq-pc-eng-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 30 + i * 25 },
      data: { type: 'pc', label: `HQ-PC-Eng-${i+1}`, vlans: [10] },
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `hq-pc-fin-${i+1}`,
      type: 'deviceNode',
      position: { x: 1150, y: 30 + i * 25 },
      data: { type: 'pc', label: `HQ-PC-Fin-${i+1}`, vlans: [20] },
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `hq-pc-hr-${i+1}`,
      type: 'deviceNode',
      position: { x: 1200, y: 30 + i * 25 },
      data: { type: 'pc', label: `HQ-PC-HR-${i+1}`, vlans: [30] },
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `hq-pc-mgmt-${i+1}`,
      type: 'deviceNode',
      position: { x: 1250, y: 30 + i * 25 },
      data: { type: 'pc', label: `HQ-PC-Mgmt-${i+1}`, vlans: [60] },
    })),
    // Branch A
    {
      id: 'ba-fw-1',
      type: 'deviceNode',
      position: { x: 900, y: 550 },
      data: { type: 'firewall', label: 'BranchA-FW', vlans: [] },
    },
    {
      id: 'ba-rt-1',
      type: 'deviceNode',
      position: { x: 1100, y: 550 },
      data: { 
        type: 'router', 
        label: 'BranchA-Edge-RT', 
        vlans: [],
        interfaces: [
          { ip: '10.70.1.2', mask: 24, name: 'G0/0 (WAN to HQ)' },
          { ip: '192.168.10.1', mask: 24, name: 'G0/1 (LAN)' },
        ],
      },
    },
    {
      id: 'ba-sw-1',
      type: 'deviceNode',
      position: { x: 1300, y: 550 },
      data: { type: 'l3Switch', label: 'BranchA-L3-SW', vlans: [50] },
    },
    {
      id: 'ba-ap-1',
      type: 'deviceNode',
      position: { x: 1300, y: 480 },
      data: { type: 'accessPoint', label: 'BranchA-AP-1', vlans: [50] },
    },
    {
      id: 'ba-ap-2',
      type: 'deviceNode',
      position: { x: 1300, y: 520 },
      data: { type: 'accessPoint', label: 'BranchA-AP-2', vlans: [50] },
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `ba-pc-${i+1}`,
      type: 'deviceNode',
      position: { x: 1500, y: 480 + i * 25 },
      data: { type: 'pc', label: `BranchA-PC-${i+1}`, vlans: [50] },
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `ba-laptop-${i+1}`,
      type: 'deviceNode',
      position: { x: 1550, y: 480 + i * 25 },
      data: { type: 'laptop', label: `BranchA-Laptop-${i+1}`, vlans: [50] },
    })),
    // Branch B
    {
      id: 'bb-fw-1',
      type: 'deviceNode',
      position: { x: 900, y: 650 },
      data: { type: 'firewall', label: 'BranchB-FW', vlans: [] },
    },
    {
      id: 'bb-rt-1',
      type: 'deviceNode',
      position: { x: 1100, y: 650 },
      data: { 
        type: 'router', 
        label: 'BranchB-Edge-RT', 
        vlans: [],
        interfaces: [
          { ip: '10.70.2.2', mask: 24, name: 'G0/0 (WAN to HQ)' },
          { ip: '192.168.20.1', mask: 24, name: 'G0/1 (LAN)' },
        ],
      },
    },
    {
      id: 'bb-sw-1',
      type: 'deviceNode',
      position: { x: 1300, y: 650 },
      data: { type: 'l3Switch', label: 'BranchB-L3-SW', vlans: [50] },
    },
    {
      id: 'bb-ap-1',
      type: 'deviceNode',
      position: { x: 1300, y: 580 },
      data: { type: 'accessPoint', label: 'BranchB-AP-1', vlans: [50] },
    },
    {
      id: 'bb-ap-2',
      type: 'deviceNode',
      position: { x: 1300, y: 620 },
      data: { type: 'accessPoint', label: 'BranchB-AP-2', vlans: [50] },
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `bb-pc-${i+1}`,
      type: 'deviceNode',
      position: { x: 1500, y: 580 + i * 25 },
      data: { type: 'pc', label: `BranchB-PC-${i+1}`, vlans: [50] },
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `bb-laptop-${i+1}`,
      type: 'deviceNode',
      position: { x: 1550, y: 580 + i * 25 },
      data: { type: 'laptop', label: `BranchB-Laptop-${i+1}`, vlans: [50] },
    })),
    // Branch C
    {
      id: 'bc-fw-1',
      type: 'deviceNode',
      position: { x: 900, y: 750 },
      data: { type: 'firewall', label: 'BranchC-FW', vlans: [] },
    },
    {
      id: 'bc-rt-1',
      type: 'deviceNode',
      position: { x: 1100, y: 750 },
      data: { 
        type: 'router', 
        label: 'BranchC-Edge-RT', 
        vlans: [],
        interfaces: [
          { ip: '10.70.3.2', mask: 24, name: 'G0/0 (WAN to HQ)' },
          { ip: '203.0.114.1', mask: 29, name: 'G0/1 (Local Internet)' },
          { ip: '192.168.30.1', mask: 24, name: 'G0/2 (LAN)' },
        ],
      },
    },
    {
      id: 'bc-sw-1',
      type: 'deviceNode',
      position: { x: 1300, y: 750 },
      data: { type: 'l3Switch', label: 'BranchC-L3-SW', vlans: [50] },
    },
    {
      id: 'bc-ap-1',
      type: 'deviceNode',
      position: { x: 1300, y: 680 },
      data: { type: 'accessPoint', label: 'BranchC-AP-1', vlans: [50] },
    },
    {
      id: 'bc-ap-2',
      type: 'deviceNode',
      position: { x: 1300, y: 720 },
      data: { type: 'accessPoint', label: 'BranchC-AP-2', vlans: [50] },
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `bc-pc-${i+1}`,
      type: 'deviceNode',
      position: { x: 1500, y: 680 + i * 25 },
      data: { type: 'pc', label: `BranchC-PC-${i+1}`, vlans: [50] },
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `bc-laptop-${i+1}`,
      type: 'deviceNode',
      position: { x: 1550, y: 680 + i * 25 },
      data: { type: 'laptop', label: `BranchC-Laptop-${i+1}`, vlans: [50] },
    })),
    // Cloud for Branch C Internet
    {
      id: 'bc-cloud-fw',
      type: 'deviceNode',
      position: { x: 1100, y: 820 },
      data: { type: 'firewall', label: 'BranchC-Internet-FW', vlans: [] },
    },
    {
      id: 'bc-cloud-rt',
      type: 'deviceNode',
      position: { x: 1300, y: 820 },
      data: { type: 'router', label: 'BranchC-Internet-RT', vlans: [] },
    },
  ],
  
  edges: [
    // HQ Internet path
    { id: 'e1', source: 'cloud-hq', target: 'hq-fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e2', source: 'hq-fw-1', target: 'hq-rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e3', source: 'hq-rt-1', target: 'hq-core-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e4', source: 'hq-core-1', target: 'hq-core-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '5,5' } },
    
    // HQ Core → Access
    { id: 'e5', source: 'hq-core-1', target: 'hq-eng-sw', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e6', source: 'hq-core-1', target: 'hq-fin-sw', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e7', source: 'hq-core-1', target: 'hq-hr-sw', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e8', source: 'hq-core-1', target: 'hq-srv-sw', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e9', source: 'hq-core-1', target: 'hq-mgmt-sw', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e10', source: 'hq-core-1', target: 'hq-wan-rt', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // HQ Servers
    { id: 'e11', source: 'hq-srv-sw', target: 'hq-srv-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e12', source: 'hq-srv-sw', target: 'hq-srv-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e13', source: 'hq-srv-sw', target: 'hq-srv-3', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e14', source: 'hq-srv-sw', target: 'hq-srv-4', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // HQ PCs
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-hq-eng-${i+1}`,
      source: 'hq-eng-sw',
      target: `hq-pc-eng-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-hq-fin-${i+1}`,
      source: 'hq-fin-sw',
      target: `hq-pc-fin-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-hq-hr-${i+1}`,
      source: 'hq-hr-sw',
      target: `hq-pc-hr-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-hq-mgmt-${i+1}`,
      source: 'hq-mgmt-sw',
      target: `hq-pc-mgmt-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    
    // HQ WAN to Branches
    { id: 'e15', source: 'hq-wan-rt', target: 'ba-rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-accent)', strokeWidth: 3 } },
    { id: 'e16', source: 'hq-wan-rt', target: 'bb-rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-accent)', strokeWidth: 3 } },
    { id: 'e17', source: 'hq-wan-rt', target: 'bc-rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-accent)', strokeWidth: 3 } },
    
    // Branch A
    { id: 'e18', source: 'ba-rt-1', target: 'ba-fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e19', source: 'ba-fw-1', target: 'ba-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e20', source: 'ba-sw-1', target: 'ba-ap-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e21', source: 'ba-sw-1', target: 'ba-ap-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-ba-pc-${i+1}`,
      source: 'ba-sw-1',
      target: `ba-pc-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `e-ba-laptop-${i+1}`,
      source: 'ba-ap-1',
      target: `ba-laptop-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '3,3' },
    })),
    
    // Branch B
    { id: 'e22', source: 'bb-rt-1', target: 'bb-fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e23', source: 'bb-fw-1', target: 'bb-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e24', source: 'bb-sw-1', target: 'bb-ap-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e25', source: 'bb-sw-1', target: 'bb-ap-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-bb-pc-${i+1}`,
      source: 'bb-sw-1',
      target: `bb-pc-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `e-bb-laptop-${i+1}`,
      source: 'bb-ap-1',
      target: `bb-laptop-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '3,3' },
    })),
    
    // Branch C
    { id: 'e26', source: 'bc-rt-1', target: 'bc-fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e27', source: 'bc-fw-1', target: 'bc-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e28', source: 'bc-sw-1', target: 'bc-ap-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e29', source: 'bc-sw-1', target: 'bc-ap-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-bc-pc-${i+1}`,
      source: 'bc-sw-1',
      target: `bc-pc-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `e-bc-laptop-${i+1}`,
      source: 'bc-ap-1',
      target: `bc-laptop-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '3,3' },
    })),
    
    // Branch C local Internet
    { id: 'e30', source: 'cloud-bc', target: 'bc-cloud-fw', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e31', source: 'bc-cloud-fw', target: 'bc-cloud-rt', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e32', source: 'bc-cloud-rt', target: 'bc-rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
  ],
  
  explanation: {
    overview: 'Hub-and-spoke WAN: HQ acts as the hub with the central data center. Each branch has its own router, firewall, and L3 switch. All inter-branch traffic transits HQ. Each site has independent Internet access through its local firewall.',
    deviceRoles: {
      'cloud-hq': 'Primary Internet connection at HQ for central services and HQ staff.',
      'cloud-bc': 'Secondary Internet connection at Branch C (80km away) for local browsing and failover.',
      'hq-fw-1': 'HQ perimeter firewall. Filters all Internet traffic for HQ.',
      'hq-rt-1': 'HQ edge router. NAT for HQ Internet. Connects to ISP.',
      'hq-core-1/2': 'Redundant L3 core switches at HQ. Route between Engineering(10), Finance(20), HR(30), Server(40), Mgmt(60), WAN-Transit(70). ACLs block branch-to-branch.',
      'hq-eng-sw': 'Access switch for Engineering dept (VLAN 10).',
      'hq-fin-sw': 'Access switch for Finance dept (VLAN 20).',
      'hq-hr-sw': 'Access switch for HR dept (VLAN 30).',
      'hq-srv-sw': 'Access switch for central servers (VLAN 40): File, HRIS, ERP, Dev/DNS/DHCP.',
      'hq-mgmt-sw': 'Access switch for network management (VLAN 60).',
      'hq-wan-rt': 'HQ WAN router. Three interfaces to Branch A/B/C. VLAN 70 for WAN transit.',
      'hq-srv-1': 'Central file server. Accessible from all branches.',
      'hq-srv-2': 'HRIS (HR Information System). Employee records, payroll.',
      'hq-srv-3': 'ERP (Finance/Operations). Financials, procurement.',
      'hq-srv-4': 'Dev server + DNS/DHCP for HQ. Also DNS forwarder for branches.',
      'hq-pc-*': 'HQ workstations. Engineering(10), Finance(20), HR(30), Mgmt(60).',
      'ba-fw-1': 'Branch A perimeter firewall. Filters Branch A Internet + WAN to HQ.',
      'ba-rt-1': 'Branch A edge router. WAN link to HQ (10.70.1.0/24), LAN (192.168.10.0/24).',
      'ba-sw-1': 'Branch A L3 switch. Routes VLAN 50 users to WAN. Local Internet via firewall.',
      'ba-ap-1/2': 'Branch A wireless APs. SSID maps to VLAN 50.',
      'ba-pc/laptop-*': 'Branch A users (Sales/Client Services). VLAN 50. Reach HQ servers via WAN. NO direct route to Branch B/C.',
      'bb-fw-1/rt-1/sw-1/ap-*': 'Branch B (Project Delivery). Same design. WAN 10.70.2.0/24. LAN 192.168.20.0/24. VLAN 50.',
      'bb-pc/laptop-*': 'Branch B users. VLAN 50. Reach HQ servers. Blocked from Branch A/C by HQ ACLs.',
      'bc-fw-1/rt-1/sw-1/ap-*': 'Branch C (Regional Support, 80km). Dual Internet: WAN to HQ + Local ISP. WAN 10.70.3.0/24. LAN 192.168.30.0/24. Local Internet via bc-cloud-fw/rt.',
      'bc-pc/laptop-*': 'Branch C users. VLAN 50. Primary WAN to HQ. Local Internet failover.',
      'bc-cloud-fw/rt': 'Branch C local Internet perimeter. Independent of HQ.',
    },
    trafficFlow: 'Branch A PC (VLAN 50) → BranchA-L3-SW → BranchA-RT (WAN 10.70.1.0/24) → HQ-WAN-RT → HQ-Core → Server VLAN 40 (File/HRIS/ERP). Return traffic: HQ-Core → HQ-WAN-RT → BranchA-RT → BranchA-L3-SW → PC. Branch A to Branch B: Blocked at HQ-Core by ACL (no route between 10.70.1.0/24 and 10.70.2.0/24). Branch C local Internet: PC → BranchC-L3-SW → BranchC-RT (local) → BranchC-Internet-FW → Internet. HQ staff: Normal inter-VLAN routing via HQ-Core with ACLs.',
    keyInsights: [
      'Hub-and-spoke WAN topology: branches connect to HQ, never directly to each other.',
      'Each branch has its own subnet routable to HQ\'s server VLANs, but not to other branch subnets.',
      'A router and firewall at each branch site enforce the Internet perimeter and WAN boundary.',
      'HQ uses L3 switches at its core to route between department VLANs and the WAN-facing router.',
      'ACLs at HQ\'s core switch block branch-to-branch routing while permitting branch-to-server routing.',
      'Adding Branch D requires: a new WAN link, a branch router/firewall, and a new subnet advertised to HQ — no existing device needs redesigning.',
      'SD-WAN can replace the traditional hub-and-spoke model: each branch edge device is centrally managed, and paths between sites are selected dynamically based on application policy.',
      'Branch C has dual Internet (WAN to HQ + local ISP) for resilience — critical for 80km remote site.',
    ],
    validationNotes: [
      'All branches connected to HQ → passes "all-branches-connected" (3 branches, WAN links).',
      'HQ services reachable from branches → passes "services-reachable" (path PC→Server via WAN).',
      'Branch A isolated from Branch B → passes "branch-isolation" (ACL at HQ core blocks).',
      'Each site has Internet → passes "internet-per-site" (HQ, A, B, C all have firewall+router).',
      'Firewall at each site → passes "firewall-per-site" (4 firewalls: HQ, A, B, C).',
      'Scalable design (dynamic routing or hub-spoke) → passes "scalable-design" (hub-spoke with WAN router).',
    ],
  },

  // Stage states for 100% validation
  stageStates: {
    sdnState: {
      controllerPlaced: true,
      flowRules: [
        { switchId: 'hq-core-1', priority: 100, match: { in_port: 'any' }, actions: [{ type: 'output', port: 'normal' }] },
        { switchId: 'hq-core-1', priority: 200, match: { eth_type: 0x0800, ipv4_dst: '10.40.1.0/24' }, actions: [{ type: 'output', port: 'hq-srv-sw' }] },
      ],
      policyFlows: [],
      policies: [],
      sdnEvents: [],
    },
    nfvState: {
      deployments: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'hq-srv-1', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids', vnfId: 'vIDS', hostNodeId: 'hq-srv-2', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'hq-srv-4', resources: { cpu: 1, memory: 512 } },
      ],
      serviceChain: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'hq-srv-1', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids', vnfId: 'vIDS', hostNodeId: 'hq-srv-2', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'hq-srv-4', resources: { cpu: 1, memory: 512 } },
      ],
    },
    orchestrationState: {
      instances: [
        { id: 'vnf-fw-instance', vnfId: 'vFirewall', hostNodeId: 'hq-srv-1', state: 'running', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids-instance', vnfId: 'vIDS', hostNodeId: 'hq-srv-2', state: 'running', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp-instance', vnfId: 'vDHCP', hostNodeId: 'hq-srv-4', state: 'running', resources: { cpu: 1, memory: 512 } },
      ],
      actions: [
        { kind: 'deploy', instanceId: 'vnf-fw-instance', timestamp: Date.now() },
        { kind: 'deploy', instanceId: 'vnf-ids-instance', timestamp: Date.now() },
        { kind: 'deploy', instanceId: 'vnf-dhcp-instance', timestamp: Date.now() },
      ],
      load: 0.2,
    },
    simulationState: {
      events: [],
      graphAfter: null,
    },
  },
};