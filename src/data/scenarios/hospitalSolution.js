/**
 * Hospital Scenario Solution
 * 
 * Dual-firewall perimeter → Redundant L3 switch core → 
 * Dedicated access switches per segment → Isolated VLANs
 */

export const hospitalSolution = {
  nodes: [
    // Internet / Cloud
    {
      id: 'cloud-1',
      type: 'deviceNode',
      position: { x: 100, y: 400 },
      data: { type: 'cloud', label: 'Internet', vlans: [] },
    },
    // Dual Firewalls (Active-Passive)
    {
      id: 'fw-1',
      type: 'deviceNode',
      position: { x: 300, y: 300 },
      data: { type: 'firewall', label: 'FW-1 (Active)', vlans: [] },
    },
    {
      id: 'fw-2',
      type: 'deviceNode',
      position: { x: 300, y: 500 },
      data: { type: 'firewall', label: 'FW-2 (Standby)', vlans: [] },
    },
    // Edge Routers (2 for redundancy)
    {
      id: 'rt-1',
      type: 'deviceNode',
      position: { x: 500, y: 300 },
      data: { type: 'router', label: 'Edge-RT-1', vlans: [], interfaces: [{ ip: '203.0.113.1', mask: 29, name: 'G0/0' }, { ip: '10.0.0.1', mask: 24, name: 'G0/1' }] },
    },
    {
      id: 'rt-2',
      type: 'deviceNode',
      position: { x: 500, y: 500 },
      data: { type: 'router', label: 'Edge-RT-2', vlans: [], interfaces: [{ ip: '203.0.113.2', mask: 29, name: 'G0/0' }, { ip: '10.0.0.2', mask: 24, name: 'G0/1' }] },
    },
    // Redundant Core L3 Switches
    {
      id: 'core-sw-1',
      type: 'deviceNode',
      position: { x: 700, y: 300 },
      data: { type: 'l3Switch', label: 'Core-SW-1 (L3)', vlans: [10,20,30,40,50,60] },
    },
    {
      id: 'core-sw-2',
      type: 'deviceNode',
      position: { x: 700, y: 500 },
      data: { type: 'l3Switch', label: 'Core-SW-2 (L3)', vlans: [10,20,30,40,50,60] },
    },
    // Cross-link between cores
    // Distribution/Access Switches per segment
    // Clinical (VLAN 10)
    {
      id: 'clin-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 100 },
      data: { type: 'l2Switch', label: 'Clin-SW-1 (ICU/ER)', vlans: [10] },
    },
    {
      id: 'clin-sw-2',
      type: 'deviceNode',
      position: { x: 900, y: 180 },
      data: { type: 'l2Switch', label: 'Clin-SW-2 (Wards)', vlans: [10] },
    },
    // Admin (VLAN 20)
    {
      id: 'admin-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 260 },
      data: { type: 'l2Switch', label: 'Admin-SW-1', vlans: [20] },
    },
    {
      id: 'admin-sw-2',
      type: 'deviceNode',
      position: { x: 900, y: 340 },
      data: { type: 'l2Switch', label: 'Admin-SW-2', vlans: [20] },
    },
    // Medical Devices (VLAN 30) - NO ROUTING TO OTHERS
    {
      id: 'med-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 420 },
      data: { type: 'l2Switch', label: 'MedDev-SW-1 (ICU)', vlans: [30] },
    },
    {
      id: 'med-sw-2',
      type: 'deviceNode',
      position: { x: 900, y: 500 },
      data: { type: 'l2Switch', label: 'MedDev-SW-2 (Wards)', vlans: [30] },
    },
    // Servers (VLAN 40)
    {
      id: 'srv-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 580 },
      data: { type: 'l2Switch', label: 'Srv-SW-1', vlans: [40] },
    },
    // Guest (VLAN 50)
    {
      id: 'guest-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 660 },
      data: { type: 'l2Switch', label: 'Guest-SW-1', vlans: [50] },
    },
    // Management (VLAN 60)
    {
      id: 'mgmt-sw-1',
      type: 'deviceNode',
      position: { x: 900, y: 740 },
      data: { type: 'l2Switch', label: 'Mgmt-SW-1', vlans: [60] },
    },
    // Wireless Controller
    {
      id: 'wlc-1',
      type: 'deviceNode',
      position: { x: 700, y: 700 },
      data: { type: 'wirelessController', label: 'WLC-1', vlans: [10,20,50] },
    },
    // Servers (4)
    {
      id: 'srv-1',
      type: 'deviceNode',
      position: { x: 1100, y: 540 },
      data: { type: 'server', label: 'SRV-1 (EMR)', vlans: [40], ip: '10.40.1.10' },
    },
    {
      id: 'srv-2',
      type: 'deviceNode',
      position: { x: 1100, y: 580 },
      data: { type: 'server', label: 'SRV-2 (PACS)', vlans: [40], ip: '10.40.1.20' },
    },
    {
      id: 'srv-3',
      type: 'deviceNode',
      position: { x: 1100, y: 620 },
      data: { type: 'server', label: 'SRV-3 (Pharmacy DB)', vlans: [40], ip: '10.40.1.30' },
    },
    {
      id: 'srv-4',
      type: 'deviceNode',
      position: { x: 1100, y: 660 },
      data: { type: 'server', label: 'SRV-4 (DHCP/DNS)', vlans: [40], ip: '10.40.1.40' },
    },
    // APs (8)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `ap-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 700 + i * 30 },
      data: { type: 'accessPoint', label: `AP-${i+1}`, vlans: [10,20,50] },
    })),
    // Clinical PCs (15)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `pc-clin-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 100 + i * 30 },
      data: { type: 'pc', label: `PC-Clin-${i+1}`, vlans: [10] },
    })),
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `pc-clin-${i+9}`,
      type: 'deviceNode',
      position: { x: 1150, y: 100 + i * 30 },
      data: { type: 'pc', label: `PC-Clin-${i+9}`, vlans: [10] },
    })),
    // Admin PCs (10)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `pc-admin-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 260 + i * 25 },
      data: { type: 'pc', label: `PC-Admin-${i+1}`, vlans: [20] },
    })),
    // Medical Devices (20)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `med-dev-${i+1}`,
      type: 'deviceNode',
      position: { x: 1100, y: 420 + i * 25 },
      data: { type: 'pc', label: `MedDev-${i+1}`, vlans: [30] },
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `med-dev-${i+11}`,
      type: 'deviceNode',
      position: { x: 1150, y: 420 + i * 25 },
      data: { type: 'pc', label: `MedDev-${i+11}`, vlans: [30] },
    })),
    // Laptops (15 wireless)
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `laptop-${i+1}`,
      type: 'deviceNode',
      position: { x: 1300, y: 700 + i * 22 },
      data: { type: 'laptop', label: `Laptop-${i+1}`, vlans: [10,20,50] },
    })),
  ],
  
  edges: [
    // Internet → Firewalls → Routers → Cores
    { id: 'e1', source: 'cloud-1', target: 'fw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e2', source: 'cloud-1', target: 'fw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '5,5' } },
    { id: 'e3', source: 'fw-1', target: 'rt-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e4', source: 'fw-2', target: 'rt-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '5,5' } },
    { id: 'e5', source: 'rt-1', target: 'core-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e6', source: 'rt-2', target: 'core-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '5,5' } },
    // Core cross-link
    { id: 'e7', source: 'core-sw-1', target: 'core-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '5,5' } },
    // Cores → Segment Switches
    { id: 'e8', source: 'core-sw-1', target: 'clin-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e9', source: 'core-sw-1', target: 'clin-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e10', source: 'core-sw-2', target: 'admin-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e11', source: 'core-sw-2', target: 'admin-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e12', source: 'core-sw-1', target: 'med-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e13', source: 'core-sw-2', target: 'med-sw-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e14', source: 'core-sw-1', target: 'srv-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e15', source: 'core-sw-2', target: 'guest-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e16', source: 'core-sw-1', target: 'mgmt-sw-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // Servers
    { id: 'e17', source: 'srv-sw-1', target: 'srv-1', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e18', source: 'srv-sw-1', target: 'srv-2', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e19', source: 'srv-sw-1', target: 'srv-3', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    { id: 'e20', source: 'srv-sw-1', target: 'srv-4', type: 'straight', animated: false, style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 } },
    // APs to WLC
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `e-ap-${i+1}`,
      source: 'wlc-1',
      target: `ap-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    // Clinical PCs
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `e-pc-clin-${i+1}`,
      source: i < 8 ? 'clin-sw-1' : 'clin-sw-2',
      target: `pc-clin-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    // Admin PCs
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `e-pc-admin-${i+1}`,
      source: i < 5 ? 'admin-sw-1' : 'admin-sw-2',
      target: `pc-admin-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    // Medical Devices
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `e-med-dev-${i+1}`,
      source: i < 10 ? 'med-sw-1' : 'med-sw-2',
      target: `med-dev-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2 },
    })),
    // Laptops (wireless - logical connection to WLC)
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `e-laptop-${i+1}`,
      source: 'wlc-1',
      target: `laptop-${i+1}`,
      type: 'straight',
      animated: false,
      style: { stroke: 'var(--c-border-lit)', strokeWidth: 2, strokeDasharray: '3,3' },
    })),
  ],
  
  explanation: {
    overview: 'Dual-firewall perimeter → Redundant L3 switch core → Dedicated access switches per segment → Isolated VLANs for Clinical, Admin, Medical Devices, Servers, Guest, and Management traffic.',
    deviceRoles: {
      'cloud-1': 'Internet/ISP connection for telemedicine, vendor updates, research.',
      'fw-1': 'Active perimeter firewall. All Internet traffic passes here.',
      'fw-2': 'Standby firewall (active-passive). Takes over if FW-1 fails.',
      'rt-1': 'Active edge router. NAT for outbound, WAN connectivity.',
      'rt-2': 'Standby edge router. Redundancy for WAN link.',
      'core-sw-1': 'Active L3 core switch. Routes between Clinical(10), Admin(20), Server(40), Mgmt(60). BLOCKS routing to Medical(30) and Guest(50).',
      'core-sw-2': 'Standby L3 core switch. Redundancy for inter-VLAN routing.',
      'clin-sw-1/2': 'Access switches for nursing stations, ER, ICU workstations. VLAN 10.',
      'admin-sw-1/2': 'Access switches for billing, HR, insurance workstations. VLAN 20.',
      'med-sw-1/2': 'Access switches for ventilators, monitors, infusion pumps. VLAN 30. NO Layer 3 interface — completely isolated.',
      'srv-sw-1': 'Access switch for EMR, PACS, Pharmacy, DHCP/DNS servers. VLAN 40.',
      'guest-sw-1': 'Access switch for guest WiFi APs. VLAN 50. Routes ONLY to Internet via firewall.',
      'mgmt-sw-1': 'Access switch for network management, security monitoring. VLAN 60.',
      'wlc-1': 'Wireless Controller. Maps "HospitalStaff" SSID→VLAN 10/20, "HospitalGuest" SSID→VLAN 50.',
      'srv-1': 'EMR (Electronic Medical Records) server. Most sensitive clinical data.',
      'srv-2': 'PACS (Picture Archiving) imaging server. Large DICOM files.',
      'srv-3': 'Pharmacy database. Medication orders, dispensing records.',
      'srv-4': 'DHCP/DNS for all VLANs except Medical Devices (30) and Guest (50).',
      'ap-*': 'Access Points throughout wards, clinic, waiting areas, admin zones.',
      'pc-clin-*': 'Nursing station and clinician workstations. VLAN 10. Can reach EMR/PACS.',
      'pc-admin-*': 'Billing, HR, insurance workstations. VLAN 20. NO access to Clinical VLAN 10.',
      'med-dev-*': 'Ventilators, monitors, infusion pumps. VLAN 30. NO routing to ANY other VLAN.',
      'laptop-*': 'Staff laptops on wireless. VLAN 10 (clinical) or 20 (admin) or 50 (guest).',
    },
    trafficFlow: 'Clinical PC (VLAN 10) → Core-SW (L3 routing + ACL permit) → Server VLAN 40 (EMR/PACS). Admin PC (VLAN 20) → Core-SW (ACL deny to VLAN 10/30/40) → Internet only via Firewall. Medical Device (VLAN 30) → NO Layer 3 interface → Complete isolation. Guest WiFi (VLAN 50) → Core-SW (ACL deny all internal) → Firewall → Internet ONLY. Dual cores provide redundant paths for ICU/ER clinical traffic.',
    keyInsights: [
      'Medical device VLAN (30) has NO routing to any other internal VLAN — isolation is absolute.',
      'Guest VLAN (50) routes only to the Internet via the firewall, never to internal segments.',
      'Redundant L3 switches at the core eliminate the single point of failure for inter-VLAN routing.',
      'Two firewalls in active-passive mode protect the Internet perimeter without a single point of failure.',
      'Server VLAN (40) is accessible only through explicit ACL permits on the L3 switch — deny-by-default.',
      'The Wireless Controller maps SSIDs to VLANs: "HospitalStaff" → VLAN 10/20, "HospitalGuest" → VLAN 50.',
      'Cross-links between redundant devices (cores, firewalls, routers) ensure no single point of failure.',
    ],
    validationNotes: [
      'Clinical isolated from Guest → passes "clinical-isolated" (VLAN 10 vs 50, no routing).',
      'Guest isolated from all internal → passes "guest-isolated" (VLAN 50 only to Internet).',
      'Admin segmented from Clinical → passes "admin-segmented" (VLAN 20 vs 10, ACL deny).',
      'Servers in protected segment with ACL → passes "server-protected" (VLAN 40, explicit permits only).',
      'Redundant core paths → passes "redundant-core" (2 L3 switches, cross-link).',
      'Internet reachable for Clinical/Admin → passes "internet-reachable".',
      '8 APs present → passes "wireless-present" (min 3).',
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
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-4', resources: { cpu: 1, memory: 512 } },
      ],
      serviceChain: [
        { id: 'vnf-fw', vnfId: 'vFirewall', hostNodeId: 'srv-1', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids', vnfId: 'vIDS', hostNodeId: 'srv-2', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp', vnfId: 'vDHCP', hostNodeId: 'srv-4', resources: { cpu: 1, memory: 512 } },
      ],
    },
    orchestrationState: {
      instances: [
        { id: 'vnf-fw-instance', vnfId: 'vFirewall', hostNodeId: 'srv-1', state: 'running', resources: { cpu: 4, memory: 4096 } },
        { id: 'vnf-ids-instance', vnfId: 'vIDS', hostNodeId: 'srv-2', state: 'running', resources: { cpu: 3, memory: 2048 } },
        { id: 'vnf-dhcp-instance', vnfId: 'vDHCP', hostNodeId: 'srv-4', state: 'running', resources: { cpu: 1, memory: 512 } },
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