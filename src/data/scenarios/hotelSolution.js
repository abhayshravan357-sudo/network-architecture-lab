/**
 * Hotel Scenario Solution
 * 
 * Internet → Firewall → Router → L3 Switch (inter-VLAN routing + ACL) 
 * → Per-segment L2 switches → End devices. Wireless Controller manages all APs.
 */

export const hotelSolution = {
  nodes: [
    // Internet / Cloud
    {
      id: 'cloud-1',
      type: 'deviceNode',
      position: { x: 100, y: 350 },
      data: { type: 'cloud', label: 'Internet', vlans: [] },
    },
    // Firewall
    {
      id: 'fw-1',
      type: 'deviceNode',
      position: { x: 300, y: 350 },
      data: { type: 'firewall', label: 'FW-1 (Perimeter)', vlans: [] },
    },
    // Router
    {
      id: 'rt-1',
      type: 'deviceNode',
      position: { x: 500, y: 350 },
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
    // Core L3 Switch (inter-VLAN routing + ACLs)
    {
      id: 'core-sw-1',
      type: 'deviceNode',
      position: { x: 700, y: 350 },
      data: { type: 'l3Switch', label: 'Core-SW (L3)', vlans: [10,20,30,40,50] },
    },
    // Access Switches per segment
    // Guest (VLAN 10)
    {
      id: 'guest-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 100 },
      data: { type: 'l2Switch', label: 'Guest-SW-1 (Rooms 1-50)', vlans: [10] },
    },
    {
      id: 'guest-sw-2',
      type: 'deviceNode',
      position: { x: 900, y: 180 },
      data: { type: 'l2Switch', label: 'Guest-SW-2 (Rooms 51-100)', vlans: [10] },
    },
    {
      id: 'guest-sw-3',
      type: 'deviceNode',
      position: { x: 900, y: 260 },
      data: { type: 'l2Switch', label: 'Guest-SW-3 (Rooms 101-150)', vlans: [10] },
    },
    {
      id: 'guest-sw-4',
      type: 'deviceNode',
      position: { x: 900, y: 340 },
      data: { type: 'l2Switch', label: 'Guest-SW-4 (Rooms 151-200)', vlans: [10] },
    },
    // Staff (VLAN 20)
    {
      id: 'staff-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 420 },
      data: { type: 'l2Switch', label: 'Staff-SW-1 (Front Desk)', vlans: [20] },
    },
    {
      id: 'staff-sw-2',
      type: 'deviceNode',
      position: { x: 900, y: 500 },
      data: { type: 'l2Switch', label: 'Staff-SW-2 (Back Office)', vlans: [20] },
    },
    // PMS (VLAN 30)
    {
      id: 'pms-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 580 },
      data: { type: 'l2Switch', label: 'PMS-SW-1', vlans: [30] },
    },
    // CCTV (VLAN 40)
    {
      id: 'cctv-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 660 },
      data: { type: 'l2Switch', label: 'CCTV-SW-1', vlans: [40] },
    },
    // Management (VLAN 50)
    {
      id: 'mgmt-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 740 },
      data: { type: 'l2Switch', label: 'Mgmt-SW-1', vlans: [50] },
    },
    // Wireless Controller
    {
      id: 'wlc-1',
      type: 'deviceNode',
      position: { x: 700, y: 600 },
      data: { type: 'wirelessController', label: 'WLC-1', vlans: [10,20] },
    },
    // Servers (2)
    {
      id: 'srv-1',
      type: 'deviceNode',
      position: { x: 1100, y: 560 },
      data: { type: 'server', label: 'SRV-1 (PMS)', vlans: [30], ip: '10.30.1.10' },
    },
    {
      id: 'srv-2',
      type: 'deviceNode',
      position: { x: 1100, y: 610 },
      data: { type: 'server', label: 'SRV-2 (DHCP/DNS)', vlans: [40], ip: '10.40.1.10' },
    },
    // APs (10)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `ap-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 660 + i * 30 },
      data: { type: 'accessPoint', label: `AP-${i+1}`, vlans: [10,20] },
    })),
    // Staff PCs (15)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `pc-staff-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 420 + i * 25 },
      data: { type: 'pc', label: `PC-Staff-${i+1}`, vlans: [20] },
    })),
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `pc-staff-${i+9}`,
      type: 'deviceNode',
      position: { x: 1150, y: 420 + i * 25 },
      data: { type: 'pc', label: `PC-Staff-${i+9}`, vlans: [20] },
    })),
    // Laptops (8 wireless staff)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `laptop-${i+1}`,
      type: 'deviceNode',
      position: { x: 1300, y: 660 + i * 25 },
      data: { type: 'laptop', label: `Laptop-${i+1}`, vlans: [20] },
    })),
    // CCTV Cameras (represented as PCs for simplicity)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `cctv-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 740 + i * 25 },
      data: { type: 'pc', label: `CCTV-Cam-${i+1}`, vlans: [40] },
    })),
  ],
  
  edges: [
    // Internet → Firewall → Router → Core
    { id: 'e1', source: 'cloud-1', target: 'fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e2', source: 'fw-1', target: 'rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e3', source: 'rt-1', target: 'core-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Core → Access Switches
    { id: 'e4', source: 'core-sw-1', target: 'guest-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e5', source: 'core-sw-1', target: 'guest-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e6', source: 'core-sw-1', target: 'guest-sw-3', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e7', source: 'core-sw-1', target: 'guest-sw-4', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e8', source: 'core-sw-1', target: 'staff-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e9', source: 'core-sw-1', target: 'staff-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e10', source: 'core-sw-1', target: 'pms-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e11', source: 'core-sw-1', target: 'cctv-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e12', source: 'core-sw-1', target: 'mgmt-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e13', source: 'core-sw-1', target: 'wlc-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // Servers
    { id: 'e14', source: 'pms-sw-1', target: 'srv-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e15', source: 'cctv-sw-1', target: 'srv-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    
    // APs to WLC
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-ap-${i+1}`,
      source: 'wlc-1',
      target: `ap-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    
    // Staff PCs
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `e-pc-staff-${i+1}`,
      source: i < 8 ? 'staff-sw-1' : 'staff-sw-2',
      target: `pc-staff-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    
    // Laptops (wireless - logical)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `e-laptop-${i+1}`,
      source: 'wlc-1',
      target: `laptop-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '3,3' },
    })),
    
    // CCTV Cameras
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `e-cctv-${i+1}`,
      source: 'cctv-sw-1',
      target: `cctv-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
  ],
  
  explanation: {
    overview: 'Internet → Firewall → Router → L3 Switch (inter-VLAN routing + ACL) → Per-segment L2 switches → End devices. Wireless Controller manages all APs with SSID-to-VLAN mapping.',
    deviceRoles: {
      'cloud-1': 'Internet/ISP connection for guest browsing, cloud PMS backup, vendor access.',
      'fw-1': 'Perimeter firewall. Filters inbound/outbound. Blocks guest access to internal VLANs.',
      'rt-1': 'Edge router. NAT for guest and staff Internet access. Connects to ISP.',
      'core-sw-1': 'L3 Core switch. Performs inter-VLAN routing with deny-by-default ACLs. Only explicit permits allowed.',
      'guest-sw-1..4': 'L2 Access switches for 200 guest rooms (50 rooms each). VLAN 10. NO routing to Staff/PMS/CCTV.',
      'staff-sw-1..2': 'L2 Access switches for front desk, back office, restaurant POS. VLAN 20.',
      'pms-sw-1': 'L2 Access switch for PMS server only. VLAN 30. Most protected segment.',
      'cctv-sw-1': 'L2 Access switch for 40 CCTV cameras and DVR/NVR. VLAN 40. No routing to Guest/Staff.',
      'mgmt-sw-1': 'L2 Access switch for management workstation. VLAN 50.',
      'wlc-1': 'Wireless LAN Controller. Maps "GrandMeridian_Guest"→VLAN 10, "HotelStaff"→VLAN 20 across all 10 APs.',
      'srv-1': 'PMS (Property Management System) server. Check-in/out, billing, room assignments. VLAN 30.',
      'srv-2': 'DHCP/DNS server. Also acts as CCTV DVR/NVR. VLAN 40 (separate from PMS).',
      'ap-*': 'Access Points in all 200 rooms, lobby, restaurant, conference rooms, back office.',
      'pc-staff-*': 'Front desk, back office, restaurant POS, maintenance tablets. VLAN 20. Can reach PMS (VLAN 30) via ACL permit.',
      'laptop-*': 'Staff laptops on wireless. VLAN 20. Same access as wired staff PCs.',
      'cctv-*': '40 CCTV cameras. VLAN 40. ONLY connect to DVR/NVR (SRV-2). No routing to Guest/Staff/PMS.',
    },
    trafficFlow: 'Guest WiFi (VLAN 10) → Core-SW (ACL deny to VLAN 20/30/40/50) → Router → Firewall → Internet ONLY. Staff PC (VLAN 20) → Core-SW (ACL permit to VLAN 30 PMS, deny to 10/40) → PMS Server. CCTV (VLAN 40) → Core-SW (ACL deny all user VLANs) → DVR (SRV-2) only. Conference room → Staff VLAN 20 for presentations.',
    keyInsights: [
      'Guest VLAN (10) routes only to the Internet — ACLs on the L3 switch deny all routes to Staff, PMS, and CCTV VLANs.',
      'PMS VLAN (30) permits inbound connections only from front-desk IP ranges on Staff VLAN (20).',
      'CCTV VLAN (40) has no routing to any user VLAN — it connects only to the security DVR and the security manager\'s dedicated workstation.',
      'The Wireless Controller maps "GrandMeridian_Guest" SSID to VLAN 10 and "HotelStaff" SSID to VLAN 20 across all 10 APs.',
      'A single L3 switch handles inter-VLAN routing with deny-by-default ACLs — explicit permits are the exception, not the rule.',
      'PMS server isolation is critical — compromise would allow unauthorized room access and billing fraud.',
    ],
    validationNotes: [
      'Guest isolated from Staff/PMS/CCTV → passes "guest-isolated" (VLAN 10, ACL deny to 20/30/40).',
      'PMS server protected, only front desk access → passes "pms-server-protected" (VLAN 30, explicit ACL permits).',
      'CCTV isolated from Guest/Staff → passes "cctv-isolated" (VLAN 40, no routing to 10/20).',
      'Internet reachable for Guest/Staff → passes "internet-reachable" (all VLANs to Cloud).',
      'Staff PCs connected → passes "staff-connected" (15 PCs on VLAN 20).',
      '10 APs present → passes "wireless-present" (min 4).',
    ],
  },

  // Stage states for 100% validation
  stageStates: {
    sdnState: {
      controllerPlaced: true,
      flowRules: [
        { switchId: 'core-sw-1', priority: 100, match: { in_port: 'any' }, actions: [{ type: 'output', port: 'normal' }] },
        { switchId: 'core-sw-1', priority: 200, match: { eth_type: 0x0800, ipv4_dst: '10.30.1.0/24' }, actions: [{ type: 'output', port: 'pms-sw-1' }] },
      ],
      policyFlows: [],
      policies: [],
      sdnEvents: [],
    },
    nfvState: {
      deployments: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'srv-2', resources: { cpu: 2, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-2', resources: { cpu: 1, memory: 512 } },
      ],
      serviceChain: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'srv-2', resources: { cpu: 2, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-2', resources: { cpu: 1, memory: 512 } },
      ],
    },
    orchestrationState: {
      instances: [
        { id: 'vnf-fw-instance', vnfId: 'vFirewall', hostNodeId: 'srv-2', state: 'running', resources: { cpu: 2, memory: 2048 } },
        { id: 'vnf-dhcp-instance', vnfId: 'vDHCP', hostNodeId: 'srv-2', state: 'running', resources: { cpu: 1, memory: 512 } },
      ],
      actions: [
        { kind: 'deploy', instanceId: 'vnf-fw-instance', timestamp: Date.now() },
        { kind: 'deploy', instanceId: 'vnf-dhcp-instance', timestamp: Date.now() },
      ],
      load: 0.15,
    },
    simulationState: {
      events: [],
      graphAfter: null,
    },
  },
};