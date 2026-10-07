/**
 * Scenario: College Campus
 *
 * The richest scenario in the simulator. Teaches:
 * hierarchical design, VLANs, inter-VLAN routing, wireless,
 * DHCP, DNS, ACL, firewall, server placement, and segmentation.
 *
 * IMPORTANT: The scenario does NOT tell the student to "use VLAN."
 * It presents requirements that IMPLY the need for VLANs.
 * The student must reason from requirements to solution.
 */

export const collegeCampus = {
  id: 'college-campus',
  name: 'College Campus',
  tagline: 'Design a network that separates, connects, and protects 500 users across 3 buildings.',
  difficulty: 3,
  estimatedMinutes: 35,
  icon: 'campus',
  coverGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
  accentColor: '#818cf8',
  tags: ['VLAN', 'Inter-VLAN Routing', 'Wireless', 'Hierarchical Design', 'ACL', 'Firewall'],

  story: `Greenfield College is expanding its campus. The college has three buildings: the Main Building (Administration and Faculty offices), the Academic Building (student classrooms and computer labs), and the Technology Building (servers, IT infrastructure, and computer science labs).

The college has approximately 500 users: 50 administrative staff, 100 faculty members, and 350 students.

The IT Director has shared the following requirements:

— Administration staff handle sensitive financial and personnel records. Their systems must not be accessible to students or faculty.
— Faculty members need access to academic resources, the learning management system, and the Internet. They should not have access to administrative systems.
— Students need Internet access, access to the student portal and library system, and Wi-Fi throughout the campus. They must not access administrative or faculty systems.
— Computer labs require high-speed, reliable wired connections for 30 workstations per lab.
— The server room in the Technology Building houses the file server, web server, DNS server, and DHCP server. Servers must be accessible only to authorized departments.
— Wireless access is required in every building for student laptops and faculty mobile devices.
— The campus needs a reliable, secure connection to the Internet.

Your task is to design a network architecture that meets all these requirements.`,

  requirements: [
    {
      id: 'req-admin-isolated',
      text: 'Administration systems must be isolated from student and general faculty access.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL'],
      validationRule: 'admin-isolated',
      severity: 'critical',
    },
    {
      id: 'req-students-connected',
      text: 'All 350 students need network access and Internet connectivity.',
      category: 'connectivity',
      impliedConcepts: ['Switching', 'DHCP', 'Router', 'NAT'],
      validationRule: 'students-connected',
    },
    {
      id: 'req-wireless-coverage',
      text: 'Wireless Wi-Fi access is required throughout all three buildings.',
      category: 'connectivity',
      impliedConcepts: ['AccessPoint', 'SSID', 'Wireless'],
      validationRule: 'wireless-present',
    },
    {
      id: 'req-servers-protected',
      text: 'The server room must be a protected, isolated segment accessible only to authorized users.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL', 'Firewall'],
      validationRule: 'server-vlan-isolated',
      severity: 'critical',
    },
    {
      id: 'req-internet-access',
      text: 'All campus users need Internet access.',
      category: 'connectivity',
      impliedConcepts: ['Router', 'NAT', 'Firewall', 'Internet'],
      validationRule: 'internet-reachable',
    },
    {
      id: 'req-dhcp-dns',
      text: 'IP addresses must be assigned automatically. Internal services must be accessible by name.',
      category: 'services',
      impliedConcepts: ['DHCP', 'DNS'],
      validationRule: 'dhcp-dns-present',
    },
    {
      id: 'req-hierarchical',
      text: 'The network must be scalable and maintainable as the college grows.',
      category: 'scalability',
      impliedConcepts: ['HierarchicalDesign', 'L3Switch'],
      validationRule: 'hierarchical-design',
    },
    {
      id: 'req-perimeter-security',
      text: 'The campus network must be protected from the Internet.',
      category: 'security',
      impliedConcepts: ['Firewall', 'ACL'],
      validationRule: 'firewall-at-perimeter',
    },
  ],

  resourcePool: {
    router: 2,
    l2Switch: 8,
    l3Switch: 2,
    firewall: 1,
    server: 3,
    accessPoint: 6,
    pc: 40,
    laptop: 12,
    cloud: 1,
    wirelessController: 1,
  },

  planningQuiz: [
    {
      id: 'q-devices',
      type: 'multi-select',
      question: 'Which device types will this campus network need? (Select all that apply)',
      options: [
        { id: 'router', label: 'Router', correct: true },
        { id: 'l2Switch', label: 'L2 Switch', correct: true },
        { id: 'l3Switch', label: 'L3 Switch', correct: true },
        { id: 'firewall', label: 'Firewall', correct: true },
        { id: 'server', label: 'Servers', correct: true },
        { id: 'accessPoint', label: 'Access Points', correct: true },
        { id: 'pc', label: 'PCs (computer labs)', correct: true },
        { id: 'laptop', label: 'Laptops', correct: true },
        { id: 'cloud', label: 'Internet / Cloud', correct: true },
      ],
      hint: 'hint-need-l3-device',
      explanation: 'This scenario needs every device type. L3 Switches handle inter-VLAN routing between campus segments. Wireless coverage requires Access Points. Three server types (DHCP, DNS, web) are needed.',
    },
    {
      id: 'q-topology',
      type: 'single-select',
      question: 'Which network topology best suits a multi-building campus with 500+ users?',
      options: [
        { id: 'flat', label: 'Flat — all devices on one big switch', correct: false },
        { id: 'hierarchical', label: 'Hierarchical — access → distribution → core layers', correct: true },
        { id: 'ring', label: 'Ring topology', correct: false },
        { id: 'mesh', label: 'Full mesh', correct: false },
      ],
      hint: 'hint-topology-flat',
      explanation: 'Hierarchical design is the industry standard for campus networks. Access switches serve end devices, distribution switches aggregate and apply policy, and the core provides high-speed inter-building connectivity.',
    },
    {
      id: 'q-segmentation',
      type: 'multi-select',
      question: 'The requirement says "administration systems must not be accessible to students." Which concepts could help achieve this?',
      options: [
        { id: 'vlan', label: 'VLAN (Virtual LAN)', correct: true },
        { id: 'acl', label: 'ACL (Access Control List)', correct: true },
        { id: 'stp', label: 'STP (Spanning Tree Protocol)', correct: false },
        { id: 'nat', label: 'NAT', correct: false },
        { id: 'firewall', label: 'Firewall rules', correct: true },
        { id: 'dhcp', label: 'DHCP', correct: false },
      ],
      hint: 'hint-need-segmentation',
      explanation: 'VLANs logically separate administration and student traffic on shared switches. ACLs enforce at Layer 3 that students cannot route to the administration VLAN even if they tried. Firewall rules add a perimeter security layer.',
    },
    {
      id: 'q-wireless',
      type: 'single-select',
      question: '"Wireless access is required throughout all three buildings." What device provides Wi-Fi to end users?',
      options: [
        { id: 'router', label: 'Router', correct: false },
        { id: 'l3Switch', label: 'L3 Switch', correct: false },
        { id: 'accessPoint', label: 'Access Point (AP)', correct: true },
        { id: 'server', label: 'Server', correct: false },
      ],
      hint: 'hint-need-access-points',
      explanation: 'Access Points (APs) are the devices that broadcast Wi-Fi SSIDs and connect wireless clients. In an enterprise environment, APs are managed centrally by a Wireless LAN Controller (WLC) for consistent policy and roaming.',
    },
    {
      id: 'q-services',
      type: 'multi-select',
      question: 'Which services should the campus network include?',
      options: [
        { id: 'dhcp', label: 'DHCP (automatic IP assignment)', correct: true },
        { id: 'dns', label: 'DNS (name resolution)', correct: true },
        { id: 'ntp', label: 'NTP (time synchronization)', correct: false },
        { id: 'acl', label: 'ACLs (traffic filtering)', correct: true },
        { id: 'interVlanRouting', label: 'Inter-VLAN routing', correct: true },
        { id: 'bgp', label: 'BGP routing protocol', correct: false },
      ],
      hint: 'hint-need-dhcp',
      explanation: 'DHCP and DNS are essential. ACLs enforce the access policies between VLANs. Inter-VLAN routing allows controlled communication between VLANs (e.g., students → servers). BGP is used for large ISP routing, not campus networks.',
    },
  ],

  validationRules: [
    {
      id: 'admin-isolated',
      check: 'groups-segmented',
      groups: ['pc-admin', 'pc-student'],
      requiresVLAN: true,
      weight: 20,
    },
    {
      id: 'students-connected',
      check: 'type-connected',
      deviceType: 'pc',
      weight: 15,
    },
    {
      id: 'wireless-present',
      check: 'type-present',
      deviceType: 'accessPoint',
      minCount: 2,
      weight: 15,
    },
    {
      id: 'server-vlan-isolated',
      check: 'server-in-protected-segment',
      requiresFirewallOrACL: true,
      weight: 15,
    },
    {
      id: 'internet-reachable',
      check: 'path-exists',
      pathBetween: ['pc', 'cloud'],
      requiresL3: true,
      weight: 10,
    },
    {
      id: 'dhcp-dns-present',
      check: 'servers-present',
      minCount: 1,
      weight: 10,
    },
    {
      id: 'hierarchical-design',
      check: 'has-distribution-layer',
      requiresL3Switch: true,
      weight: 10,
    },
    {
      id: 'firewall-at-perimeter',
      check: 'firewall-between',
      between: ['cloud', 'l2Switch'],
      weight: 5,
    },
  ],

  sdnOpportunities: [
    {
      id: 'sdn-centralized-policy',
      label: 'Centralized VLAN policy management',
      description: 'Replace per-switch VLAN/ACL configuration with an SDN controller that programs all switches centrally.',
    },
    {
      id: 'sdn-dynamic-routing',
      label: 'Dynamic path computation',
      description: 'The SDN controller computes optimal paths and can reroute traffic instantly when a link fails.',
    },
  ],

  vnfOpportunities: [
    {
      id: 'vnf-firewall',
      replaces: 'firewall',
      label: 'vFirewall',
      description: 'Replace the physical firewall with a software vFirewall VNF that can be scaled during peak periods.',
    },
    {
      id: 'vnf-dhcp',
      replaces: 'dhcp-server',
      label: 'vDHCP',
      description: 'Run DHCP as a VNF on the campus server cluster.',
    },
  ],

  simulationEvents: [
    {
      id: 'evt-exam-traffic',
      label: 'Exam Day Traffic Surge',
      description: 'All 350 students simultaneously access the student portal and learning management system.',
    },
    {
      id: 'evt-switch-failure',
      label: 'Distribution Switch Failure',
      description: 'The main distribution switch in the Academic Building goes offline.',
    },
    {
      id: 'evt-security-incident',
      label: 'Unauthorized Access Attempt',
      description: 'A device on the student VLAN is attempting to reach the administration server.',
    },
    {
      id: 'evt-wifi-overload',
      label: 'Wi-Fi Congestion',
      description: 'A lecture theater with 200 students overwhelms a single access point.',
    },
  ],

  referenceArchitecture: {
    description: 'Three-tier hierarchical campus design: Access switches per department → L3 Distribution switches → Core → Firewall → Router → Internet.',
    vlans: [
      { id: 10, name: 'Administration', color: '#ef4444' },
      { id: 20, name: 'Faculty', color: '#f59e0b' },
      { id: 30, name: 'Students', color: '#3b82f6' },
      { id: 40, name: 'Servers', color: '#10b981' },
      { id: 50, name: 'Wireless', color: '#8b5cf6' },
      { id: 60, name: 'Management', color: '#64748b' },
    ],
    keyInsights: [
      'VLANs provide logical isolation on shared physical switches.',
      'The L3 switch performs inter-VLAN routing with ACLs controlling which VLANs can communicate.',
      'Servers are in a dedicated VLAN (40) accessible only through controlled routes.',
      'Firewall sits at the Internet perimeter — not between internal VLANs (ACLs handle that).',
      'Wireless Controller manages all APs for consistent SSID and VLAN policy.',
    ],
  },
};
