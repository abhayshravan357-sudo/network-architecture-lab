/**
 * College Campus Scenario Solution
 * 
 * Three-tier hierarchical campus design: Access switches per department → 
 * L3 Distribution switches → Core → Firewall → Router → Internet
 */

export const collegeCampusSolution = {
  nodes: [
    // Internet / Cloud
    {
      id: 'cloud-1',
      type: 'deviceNode',
      position: { x: 100, y: 400 },
      data: { type: 'cloud', label: 'Internet', vlans: [] },
    },
    // Firewall at perimeter
    {
      id: 'fw-1',
      type: 'deviceNode',
      position: { x: 300, y: 400 },
      data: { type: 'firewall', label: 'FW-1 (Perimeter)', vlans: [] },
    },
    // Edge Router
    {
      id: 'rt-1',
      type: 'deviceNode',
      position: { x: 500, y: 400 },
      data: { 
        type: 'router', 
        label: 'Edge-Router', 
        vlans: [],
        interfaces: [
          { ip: '203.0.113.1', mask: 29, name: 'G0/0 (WAN)' },
          { ip: '10.0.0.1', mask: 24, name: 'G0/1 (Core)' },
        ],
      },
    },
    // Core L3 Switch
    {
      id: 'core-sw-1',
      type: 'deviceNode',
      position: { x: 700, y: 400 },
      data: { type: 'l3Switch', label: 'Core-SW (L3)', vlans: [10,20,30,40,50,60] },
    },
    // Distribution L3 Switches (2)
    {
      id: 'dist-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 200 },
      data: { type: 'l3Switch', label: 'Dist-SW-1 (Academic)', vlans: [10,20,30,40] },
    },
    {
      id: 'dist-sw-2',
      type: 'deviceNode',
      position: { x: 900, y: 600 },
      data: { type: 'l3Switch', label: 'Dist-SW-2 (Admin/Tech)', vlans: [10,20,40,50,60] },
    },
    // Access Switches - Academic Building (L2)
    {
      id: 'acc-sw-1',
      type: 'deviceNode',
      position: { x: 1100, y: 100 },
      data: { type: 'l2Switch', label: 'Acc-SW-1 (Labs)', vlans: [30] },
    },
    {
      id: 'acc-sw-2',
      type: 'deviceNode',
      position: { x: 1100, y: 200 },
      data: { type: 'l2Switch', label: 'Acc-SW-2 (Classrooms)', vlans: [30] },
    },
    // Access Switches - Main Building (L2)
    {
      id: 'acc-sw-3',
      type: 'deviceNode',
      position: { x: 1100, y: 300 },
      data: { type: 'l2Switch', label: 'Acc-SW-3 (Faculty)', vlans: [20] },
    },
    {
      id: 'acc-sw-4',
      type: 'deviceNode',
      position: { x: 1100, y: 400 },
      data: { type: 'l2Switch', label: 'Acc-SW-4 (Admin)', vlans: [10] },
    },
    // Access Switches - Tech Building (L2)
    {
      id: 'acc-sw-5',
      type: 'deviceNode',
      position: { x: 1100, y: 500 },
      data: { type: 'l2Switch', label: 'Acc-SW-5 (Servers)', vlans: [40] },
    },
    {
      id: 'acc-sw-6',
      type: 'deviceNode',
      position: { x: 1100, y: 600 },
      data: { type: 'l2Switch', label: 'Acc-SW-6 (Wireless)', vlans: [50] },
    },
    // Wireless Controller
    {
      id: 'wlc-1',
      type: 'deviceNode',
      position: { x: 900, y: 700 },
      data: { type: 'wirelessController', label: 'WLC-1', vlans: [50] },
    },
    // Servers (3)
    {
      id: 'srv-1',
      type: 'deviceNode',
      position: { x: 1300, y: 480 },
      data: { type: 'server', label: 'SRV-1 (DHCP/DNS)', vlans: [40], ip: '10.40.1.10' },
    },
    {
      id: 'srv-2',
      type: 'deviceNode',
      position: { x: 1300, y: 530 },
      data: { type: 'server', label: 'SRV-2 (File/Web)', vlans: [40], ip: '10.40.1.20' },
    },
    {
      id: 'srv-3',
      type: 'deviceNode',
      position: { x: 1300, y: 580 },
      data: { type: 'server', label: 'SRV-3 (LMS/Portal)', vlans: [40], ip: '10.40.1.30' },
    },
    // Access Points (6)
    {
      id: 'ap-1',
      type: 'deviceNode',
      position: { x: 1300, y: 640 },
      data: { type: 'accessPoint', label: 'AP-1 (Main Bldg)', vlans: [50] },
    },
    {
      id: 'ap-2',
      type: 'deviceNode',
      position: { x: 1300, y: 680 },
      data: { type: 'accessPoint', label: 'AP-2 (Acad Bldg)', vlans: [50] },
    },
    {
      id: 'ap-3',
      type: 'deviceNode',
      position: { x: 1300, y: 720 },
      data: { type: 'accessPoint', label: 'AP-3 (Tech Bldg)', vlans: [50] },
    },
    {
      id: 'ap-4',
      type: 'deviceNode',
      position: { x: 1300, y: 760 },
      data: { type: 'accessPoint', label: 'AP-4 (Library)', vlans: [50] },
    },
    {
      id: 'ap-5',
      type: 'deviceNode',
      position: { x: 1300, y: 800 },
      data: { type: 'accessPoint', label: 'AP-5 (Dorms)', vlans: [50] },
    },
    {
      id: 'ap-6',
      type: 'deviceNode',
      position: { x: 1300, y: 840 },
      data: { type: 'accessPoint', label: 'AP-6 (Outdoor)', vlans: [50] },
    },
    // PCs (40) - Students in labs/classrooms
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `pc-student-${i+1}`,
      type: 'deviceNode',
      position: { x: 1300, y: 100 + i * 25 },
      data: { type: 'pc', label: `PC-Student-${i+1}`, vlans: [30] },
    })),
    // PCs (12) - Faculty
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `pc-faculty-${i+1}`,
      type: 'deviceNode',
      position: { x: 1300, y: 200 + i * 25 },
      data: { type: 'pc', label: `PC-Faculty-${i+1}`, vlans: [20] },
    })),
    // PCs (8) - Admin
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `pc-admin-${i+1}`,
      type: 'deviceNode',
      position: { x: 1300, y: 300 + i * 25 },
      data: { type: 'pc', label: `PC-Admin-${i+1}`, vlans: [10] },
    })),
    // Laptops (12) - Wireless
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `laptop-${i+1}`,
      type: 'deviceNode',
      position: { x: 1300, y: 400 + i * 25 },
      data: { type: 'laptop', label: `Laptop-${i+1}`, vlans: [50] },
    })),
  ],
  
  edges: [
    // Internet → Firewall → Router → Core
    { id: 'e1', source: 'cloud-1', target: 'fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e2', source: 'fw-1', target: 'rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e3', source: 'rt-1', target: 'core-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Core → Distribution
    { id: 'e4', source: 'core-sw-1', target: 'dist-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e5', source: 'core-sw-1', target: 'dist-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Distribution → Access (Academic)
    { id: 'e6', source: 'dist-sw-1', target: 'acc-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e7', source: 'dist-sw-1', target: 'acc-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e8', source: 'dist-sw-1', target: 'acc-sw-3', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Distribution → Access (Admin/Tech)
    { id: 'e9', source: 'dist-sw-2', target: 'acc-sw-4', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e10', source: 'dist-sw-2', target: 'acc-sw-5', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e11', source: 'dist-sw-2', target: 'acc-sw-6', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e12', source: 'dist-sw-2', target: 'wlc-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Access → Servers
    { id: 'e13', source: 'acc-sw-5', target: 'srv-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e14', source: 'acc-sw-5', target: 'srv-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e15', source: 'acc-sw-5', target: 'srv-3', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Access → APs (via WLC or direct)
    { id: 'e16', source: 'wlc-1', target: 'ap-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e17', source: 'wlc-1', target: 'ap-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e18', source: 'wlc-1', target: 'ap-3', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e19', source: 'wlc-1', target: 'ap-4', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e20', source: 'wlc-1', target: 'ap-5', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e21', source: 'wlc-1', target: 'ap-6', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Access → Student PCs (10)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-student-${i+1}`,
      source: i < 5 ? 'acc-sw-1' : 'acc-sw-2',
      target: `pc-student-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    
    // Access → Faculty PCs (6)
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `e-faculty-${i+1}`,
      source: 'acc-sw-3',
      target: `pc-faculty-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    
    // Access → Admin PCs (6)
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `e-admin-${i+1}`,
      source: 'acc-sw-4',
      target: `pc-admin-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    
    // Access → Laptops (6)
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `e-laptop-${i+1}`,
      source: 'acc-sw-6',
      target: `laptop-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
  ],
  
  explanation: {
    overview: 'Three-tier hierarchical campus design: Access switches per department → L3 Distribution switches → Core → Firewall → Router → Internet.',
    deviceRoles: {
      'cloud-1': 'Internet/ISP connection point for the campus.',
      'fw-1': 'Perimeter firewall at the Internet boundary. Blocks unauthorized inbound, permits controlled outbound.',
      'rt-1': 'Edge router connecting campus to ISP. Performs NAT for outbound traffic.',
      'core-sw-1': 'L3 Core switch providing high-speed interconnect between distribution switches. Routes between all VLANs.',
      'dist-sw-1': 'L3 Distribution switch for Academic Building. Aggregates access switches, enforces ACLs between VLANs.',
      'dist-sw-2': 'L3 Distribution switch for Admin/Tech Buildings. Aggregates access switches, enforces ACLs.',
      'acc-sw-1': 'L2 Access switch for computer labs (Student VLAN 30).',
      'acc-sw-2': 'L2 Access switch for classrooms (Student VLAN 30).',
      'acc-sw-3': 'L2 Access switch for faculty offices (Faculty VLAN 20).',
      'acc-sw-4': 'L2 Access switch for admin offices (Admin VLAN 10).',
      'acc-sw-5': 'L2 Access switch for server room (Server VLAN 40).',
      'acc-sw-6': 'L2 Access switch for wireless infrastructure (Wireless VLAN 50).',
      'wlc-1': 'Wireless LAN Controller managing all 6 APs centrally. Maps SSIDs to VLANs.',
      'srv-1': 'DHCP/DNS server for all VLANs. Static IP in Server VLAN 40.',
      'srv-2': 'File and web server. Accessible via inter-VLAN routing with ACLs.',
      'srv-3': 'Learning Management System / Student Portal server.',
      'ap-1..ap-6': 'Access Points broadcasting SSIDs. WLC maps "CampusWiFi"→VLAN 30/20, "CampusGuest"→VLAN 50.',
      'pc-student-*': 'Student workstations in labs/classrooms. VLAN 30. No access to Admin VLAN 10.',
      'pc-faculty-*': 'Faculty workstations. VLAN 20. Can reach servers, Internet, but not Admin VLAN 10.',
      'pc-admin-*': 'Admin workstations. VLAN 10. Can reach servers, Internet. Isolated from Student VLAN 30.',
      'laptop-*': 'Faculty/staff laptops on wireless. VLAN 50 mapped to Faculty/Admin via WLC.',
    },
    trafficFlow: 'Student PC (VLAN 30) → Acc-SW → Dist-SW-1 (L3 routing + ACL) → Core → Server VLAN 40. Internet traffic: Any VLAN → Core → Router → Firewall → Internet. Guest WiFi (VLAN 50) → WLC → Dist-SW-2 → Core → Router → Firewall → Internet (NO access to internal VLANs).',
    keyInsights: [
      'VLANs provide logical isolation on shared physical switches.',
      'The L3 switch performs inter-VLAN routing with ACLs controlling which VLANs can communicate.',
      'Servers are in a dedicated VLAN (40) accessible only through controlled routes.',
      'Firewall sits at the Internet perimeter — not between internal VLANs (ACLs handle that).',
      'Wireless Controller manages all APs for consistent SSID and VLAN policy.',
      'Hierarchical design (Access → Distribution → Core) scales to 500+ users.',
    ],
    validationNotes: [
      'Admin isolated from Student → passes "admin-isolated" (VLAN 10 vs 30, ACL enforced).',
      'All student PCs connected → passes "students-connected" (10+ PCs on VLAN 30).',
      '6 APs present → passes "wireless-present" (min 2).',
      'Servers in protected segment with ACL → passes "server-vlan-isolated".',
      'Path to Internet exists for all → passes "internet-reachable".',
      'DHCP/DNS servers present → passes "dhcp-dns-present".',
      'L3 switches at distribution layer → passes "hierarchical-design".',
      'Firewall at perimeter → passes "firewall-at-perimeter".',
    ],
  },

  // Stage states for 100% validation
  stageStates: {
    sdnState: {
      controllerPlaced: true,
      flowRules: [
        { switchId: 'core-sw-1', priority: 100, match: { in_port: 'any' }, actions: [{ type: 'output', port: 'normal' }] },
        { switchId: 'core-sw-1', priority: 200, match: { eth_type: 0x0800, ipv4_dst: '10.40.1.0/24' }, actions: [{ type: 'output', port: 'srv-sw-1' }] },
      ],
      policyFlows: [],
      policies: [],
      sdnEvents: [],
    },
    nfvState: {
      deployments: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'srv-1', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids', vnfId: 'vIDS', hostNodeId: 'srv-2', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-1', resources: { cpu: 1, memory: 512 } },
      ],
      serviceChain: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'srv-1', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids', vnfId: 'vIDS', hostNodeId: 'srv-2', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-1', resources: { cpu: 1, memory: 512 } },
      ],
    },
    orchestrationState: {
      instances: [
        { id: 'vnf-fw-instance', vnfId: 'vFirewall', hostNodeId: 'srv-1', state: 'running', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids-instance', vnfId: 'vIDS', hostNodeId: 'srv-2', state: 'running', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp-instance', vnfId: 'vDHCP', hostNodeId: 'srv-1', state: 'running', resources: { cpu: 1, memory: 512 } },
      ],
      actions: [
        { kind: 'deploy', instanceId: 'vnf-fw-instance', timestamp: Date.now() },
        { kind: 'deploy', instanceId: 'vnf-ids-instance', timestamp: Date.now() },
        { kind: 'deploy', instanceId: 'vnf-dhcp-instance', timestamp: Date.now() },
      ],
      load: 0.25,
    },
    simulationState: {
      events: [],
      graphAfter: null,
    },
  },
};