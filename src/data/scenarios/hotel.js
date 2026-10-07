/**
 * Scenario: Hotel
 *
 * Teaches: guest vs. staff network isolation, PMS server security,
 * CCTV network segmentation, wireless deployment for hospitality,
 * and business-critical service protection.
 *
 * IMPORTANT: The scenario does NOT prescribe solutions.
 * Requirements are presented as business needs. The student
 * must reason from context to the appropriate network design.
 */

export const hotel = {
  id: 'hotel',
  name: 'Hotel',
  tagline: 'Keep 200 guest rooms connected while protecting the business behind the scenes.',
  difficulty: 2,
  estimatedMinutes: 25,
  icon: 'hotel',
  coverGradient: 'linear-gradient(135deg, #1a0533 0%, #3b0764 100%)',
  accentColor: '#a855f7',
  tags: ['Guest Isolation', 'PMS Security', 'CCTV', 'Wireless', 'VLAN', 'Hospitality'],

  story: `The Grand Meridian is a 200-room business hotel located in the heart of the city. It serves corporate travelers, conference attendees, and leisure guests. The hotel has a full-service restaurant, two conference rooms that can seat up to 80 people each, a business center, a lobby, and five guest floors.

The hotel's operations revolve around its Property Management System (PMS) — the software that handles guest check-in and check-out, room assignments, billing, and integration with the hotel's point-of-sale systems in the restaurant. The PMS server is the single most important system in the hotel; if it goes offline, front desk staff cannot check guests in or process payments. Access to the PMS must be restricted to front desk terminals and the hotel management team only — a housekeeper's tablet or a conference room PC must never be able to reach it.

The hotel also operates a CCTV security system with 40 cameras covering all corridors, entrances, and public areas. The security manager insists that CCTV footage must flow on its own isolated network — if a guest somehow gained access to camera feeds, it would be a serious privacy and legal liability. Alongside these internal systems, the hotel's General Manager, Sophia Reinholt, expects every guest to have fast, reliable Wi-Fi in their room and in all public areas. Guests must be able to browse the Internet freely, but they must never be able to see or reach the hotel's staff systems, the PMS, or the CCTV network.

Your task is to design a hotel network that keeps guests happy, protects the business, secures the surveillance system, and ensures the front desk can always reach the PMS — even during the busiest check-in times.`,

  requirements: [
    {
      id: 'req-guest-wifi-isolated',
      text: 'Guest Wi-Fi must provide Internet access but must be completely isolated from staff systems, the PMS server, and CCTV network.',
      category: 'security',
      impliedConcepts: ['VLAN', 'Firewall', 'ACL', 'AccessPoint'],
      validationRule: 'guest-isolated',
      severity: 'critical',
    },
    {
      id: 'req-pms-secure',
      text: 'The PMS server must be accessible only to front desk terminals and hotel management workstations — no other device on any other network may reach it.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL', 'Firewall'],
      validationRule: 'pms-server-protected',
      severity: 'critical',
    },
    {
      id: 'req-cctv-isolated',
      text: 'CCTV cameras and the security DVR/NVR must be on a network completely isolated from guest and general staff networks.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL'],
      validationRule: 'cctv-isolated',
    },
    {
      id: 'req-internet-access',
      text: 'Guests need high-speed Internet. Staff need Internet for email and hotel management tools. Conference rooms require high-bandwidth connectivity for presentations and video calls.',
      category: 'connectivity',
      impliedConcepts: ['Router', 'NAT', 'Firewall', 'Bandwidth'],
      validationRule: 'internet-reachable',
    },
    {
      id: 'req-staff-connectivity',
      text: 'Front desk PCs, back-office administrative workstations, restaurant POS terminals, and maintenance staff tablets must all be connected and able to reach relevant internal services.',
      category: 'connectivity',
      impliedConcepts: ['Switching', 'VLAN', 'DHCP'],
      validationRule: 'staff-connected',
    },
    {
      id: 'req-wireless-coverage',
      text: 'Wi-Fi coverage is required in all 200 guest rooms, the lobby, restaurant, conference rooms, and back-office areas.',
      category: 'connectivity',
      impliedConcepts: ['AccessPoint', 'WirelessController', 'SSID'],
      validationRule: 'wireless-present',
    },
  ],

  resourcePool: {
    router: 1,
    l2Switch: 5,
    l3Switch: 1,
    firewall: 1,
    server: 2,
    accessPoint: 10,
    pc: 15,
    laptop: 8,
    cloud: 1,
    wirelessController: 1,
  },

  planningQuiz: [
    {
      id: 'q-guest-staff-separation',
      type: 'single-select',
      question: 'A guest connects to "GrandMeridian_WiFi" and opens a network scanner on their phone. You need to ensure they cannot discover or reach any front desk PC or the PMS server. What network design principle achieves this — and where does it need to be enforced?',
      options: [
        { id: 'password', label: 'Use a strong Wi-Fi password so unauthorized users cannot connect', correct: false },
        { id: 'firewall-only', label: 'Block guest traffic at the Internet firewall', correct: false },
        { id: 'network-layer-isolation', label: 'Place guest traffic in its own logical network segment with no routing path to any internal staff or server segments', correct: true },
        { id: 'different-ap', label: 'Use separate physical access points for guests and staff — one for each group', correct: false },
      ],
      hint: 'hint-guest-isolation',
      explanation: 'Physical separation of APs does not help if both APs connect to the same underlying switch segment. The isolation must be enforced at the network layer — guests are in a separate logical segment that has no routing path to internal systems. Even if a guest connects to a physically close AP, their traffic cannot reach staff systems.',
    },
    {
      id: 'q-pms-access-control',
      type: 'multi-select',
      question: 'The PMS server must be accessible to front desk PCs but not to conference room PCs, guest devices, or housekeeping tablets. Which mechanisms can enforce this? (Select all that apply)',
      options: [
        { id: 'vlan-pms', label: 'Placing the PMS server in its own isolated network segment', correct: true },
        { id: 'acl', label: 'Access Control Lists that explicitly permit front-desk IPs and deny everything else', correct: true },
        { id: 'firewall-rule', label: 'Firewall rules that only allow traffic from the staff segment to the PMS segment', correct: true },
        { id: 'same-switch', label: 'Connecting the PMS server and front desk PCs to the same physical switch port', correct: false },
        { id: 'mac-filter', label: 'MAC address filtering on the server NIC', correct: false },
      ],
      hint: 'hint-pms-access',
      explanation: 'Effective PMS protection requires multiple layers. A dedicated segment isolates the PMS at Layer 2. ACLs at the L3 switch enforce policy at Layer 3. Firewall rules add an additional perimeter. Sharing a switch port is not isolation, and MAC filtering is easily spoofed and hard to manage at scale.',
    },
    {
      id: 'q-cctv-network',
      type: 'single-select',
      question: 'The hotel has 40 CCTV cameras generating continuous video streams. Why should these cameras be on a completely separate network segment rather than sharing the guest or staff network?',
      options: [
        { id: 'bandwidth', label: 'Because camera video streams consume significant bandwidth and would degrade other users\' experience', correct: false },
        { id: 'privacy-only', label: 'Only for privacy — cameras use their own protocol so there is no security risk', correct: false },
        { id: 'both', label: 'Both — high bandwidth would impact shared segments, and isolation prevents guests from accessing camera feeds or disrupting the security DVR', correct: true },
        { id: 'cost', label: 'To reduce switch port costs by grouping cameras together', correct: false },
      ],
      hint: 'hint-cctv-isolation',
      explanation: 'CCTV isolation serves two purposes: preventing unauthorized access to live camera feeds (a legal and privacy requirement), and ensuring camera video traffic does not compete with guest or staff traffic on shared segments. An isolated CCTV segment achieves both with the same design decision.',
    },
    {
      id: 'q-wireless-controller',
      type: 'single-select',
      question: 'The hotel needs 10 access points covering guest rooms, the lobby, conference rooms, and back-office areas. Each access point needs to serve two SSIDs — one for guests and one for staff — but map them to completely different networks. What device makes this centrally manageable?',
      options: [
        { id: 'configure-each', label: 'Configure each access point individually with its own settings and passwords', correct: false },
        { id: 'wlc', label: 'A Wireless LAN Controller (WLC) that manages all APs centrally and maps SSIDs to different network segments', correct: true },
        { id: 'l3switch', label: 'An L3 switch — it handles wireless traffic directly', correct: false },
        { id: 'extra-router', label: 'A second router dedicated to guest Wi-Fi traffic', correct: false },
      ],
      hint: 'hint-wireless-controller',
      explanation: 'A Wireless LAN Controller centralizes AP configuration, allowing you to define SSIDs and their VLAN mappings once and push the policy to all 10 APs simultaneously. When a guest connects to "GrandMeridian_Guest", the WLC ensures their traffic is tagged and forwarded to the guest segment — regardless of which physical AP they connect to.',
    },
  ],

  validationRules: [
    {
      id: 'guest-isolated',
      check: 'groups-segmented',
      groups: ['accessPoint-guest', 'pc-staff'],
      requiresVLAN: true,
      weight: 25,
    },
    {
      id: 'pms-server-protected',
      check: 'server-in-protected-segment',
      requiresFirewallOrACL: true,
      weight: 25,
    },
    {
      id: 'cctv-isolated',
      check: 'groups-segmented',
      groups: ['cctv-cameras', 'pc-guest'],
      requiresVLAN: true,
      weight: 15,
    },
    {
      id: 'internet-reachable',
      check: 'path-exists',
      pathBetween: ['pc', 'cloud'],
      requiresL3: true,
      weight: 15,
    },
    {
      id: 'staff-connected',
      check: 'type-connected',
      deviceType: 'pc',
      weight: 10,
    },
    {
      id: 'wireless-present',
      check: 'type-present',
      deviceType: 'accessPoint',
      minCount: 4,
      weight: 10,
    },
  ],

  sdnOpportunities: [
    {
      id: 'sdn-guest-policy',
      label: 'Dynamic guest network policy',
      description: 'An SDN controller can automatically provision a unique micro-segment for each guest room upon check-in and tear it down on check-out, ensuring no cross-room traffic is ever possible.',
    },
    {
      id: 'sdn-bandwidth-management',
      label: 'Per-guest bandwidth management',
      description: 'SDN enables per-flow bandwidth policies, allowing the hotel to guarantee minimum speeds to conference rooms while fairly distributing remaining capacity among guest rooms.',
    },
  ],

  vnfOpportunities: [
    {
      id: 'vnf-firewall',
      replaces: 'firewall',
      label: 'vFirewall',
      description: 'Replace the physical firewall with a software vFirewall VNF on the hotel server, enabling rapid rule updates during security incidents without hardware replacement.',
    },
    {
      id: 'vnf-dhcp',
      replaces: 'dhcp-server',
      label: 'vDHCP',
      description: 'Run per-VLAN DHCP as a VNF, enabling the hotel to quickly adjust IP pool sizes during large conferences without reconfiguring physical servers.',
    },
  ],

  simulationEvents: [
    {
      id: 'evt-full-occupancy-overload',
      label: 'Hotel Full Occupancy Wi-Fi Overload',
      description: 'All 200 rooms are occupied, every guest is streaming video simultaneously, and a conference in Room A has 80 laptops active. Evaluate how your wireless design handles the surge and whether guest traffic affects staff or PMS connectivity.',
    },
    {
      id: 'evt-pms-failure',
      label: 'PMS Server Failure',
      description: 'The PMS server goes offline during peak check-in time. Thirty guests are in the lobby. The front desk cannot process check-ins or access room assignments. Identify the single point of failure in your server design.',
    },
    {
      id: 'evt-guest-breach',
      label: 'Security Breach on Guest Network',
      description: 'A malicious actor on the guest Wi-Fi launches an attack attempting to reach the CCTV DVR and the back-office administrative PCs. Verify that your isolation design prevents any lateral movement from the guest segment.',
    },
  ],

  referenceArchitecture: {
    description: 'Internet → Firewall → Router → L3 Switch (inter-VLAN routing + ACL) → Per-segment L2 switches → End devices. Wireless Controller manages all APs with SSID-to-VLAN mapping.',
    vlans: [
      { id: 10, name: 'Guest', color: '#a855f7' },
      { id: 20, name: 'Staff', color: '#3b82f6' },
      { id: 30, name: 'PMS', color: '#10b981' },
      { id: 40, name: 'CCTV', color: '#ef4444' },
      { id: 50, name: 'Management', color: '#64748b' },
    ],
    keyInsights: [
      'Guest VLAN (10) routes only to the Internet — ACLs on the L3 switch deny all routes to Staff, PMS, and CCTV VLANs.',
      'PMS VLAN (30) permits inbound connections only from front-desk IP ranges on Staff VLAN (20).',
      'CCTV VLAN (40) has no routing to any user VLAN — it connects only to the security DVR and the security manager\'s dedicated workstation.',
      'The Wireless Controller maps "GrandMeridian_Guest" SSID to VLAN 10 and "HotelStaff" SSID to VLAN 20 across all 10 APs.',
      'A single L3 switch handles inter-VLAN routing with deny-by-default ACLs — explicit permits are the exception, not the rule.',
    ],
  },
};
