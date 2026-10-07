/**
 * Scenario: Small Office
 *
 * Entry-level scenario. Teaches LAN fundamentals:
 * basic topology, DHCP, IP addressing, switches,
 * router, Internet, and a simple security boundary.
 */

export const smallOffice = {
  id: 'small-office',
  name: 'Small Office',
  tagline: 'Build your first office network from scratch.',
  difficulty: 1,
  estimatedMinutes: 15,
  icon: 'office',
  coverGradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f2844 100%)',
  accentColor: '#38bdf8',
  tags: ['LAN', 'DHCP', 'Routing', 'Firewall'],

  story: `A local accounting firm, Apex Accounting, has just moved into a new office space. They have 12 employees across two departments — Finance and Operations — all working in a single floor.

Every employee uses a desktop PC. They need to share a central file server, access the company email system, and have reliable access to the Internet for client work.

The IT manager has asked you to design the network for this new office. The goal is simple: get everyone connected, keep costs reasonable, and make sure the network is secure enough that random Internet traffic cannot reach internal systems.`,

  requirements: [
    {
      id: 'req-all-connected',
      text: 'All employee workstations must be connected to the local network.',
      category: 'connectivity',
      impliedConcepts: ['Ethernet', 'Switching'],
      validationRule: 'all-pcs-connected',
    },
    {
      id: 'req-internet-access',
      text: 'All employees need Internet access.',
      category: 'connectivity',
      impliedConcepts: ['Router', 'NAT', 'Internet'],
      validationRule: 'internet-reachable',
    },
    {
      id: 'req-file-server',
      text: 'A file server must be accessible to all employees.',
      category: 'services',
      impliedConcepts: ['Server', 'DNS'],
      validationRule: 'server-reachable',
    },
    {
      id: 'req-dhcp',
      text: 'Employee workstations should receive IP addresses automatically.',
      category: 'services',
      impliedConcepts: ['DHCP'],
      validationRule: 'dhcp-present',
    },
    {
      id: 'req-security',
      text: 'The internal network must be protected from the Internet.',
      category: 'security',
      impliedConcepts: ['Firewall', 'NAT'],
      validationRule: 'internet-boundary-secured',
    },
  ],

  resourcePool: {
    router: 1,
    l2Switch: 2,
    l3Switch: 0,
    firewall: 1,
    server: 1,
    accessPoint: 0,
    pc: 12,
    laptop: 0,
    cloud: 1,
    wirelessController: 0,
  },

  planningQuiz: [
    {
      id: 'q-devices',
      type: 'multi-select',
      question: 'Which device types does this network likely need?',
      options: [
        { id: 'router', label: 'Router', correct: true },
        { id: 'l2Switch', label: 'L2 Switch', correct: true },
        { id: 'l3Switch', label: 'L3 Switch', correct: false },
        { id: 'firewall', label: 'Firewall', correct: true },
        { id: 'server', label: 'Server', correct: true },
        { id: 'accessPoint', label: 'Access Point', correct: false },
        { id: 'pc', label: 'PCs', correct: true },
        { id: 'cloud', label: 'Internet/Cloud', correct: true },
      ],
      hint: 'hint-device-wrong-type',
      explanation: 'A router connects the office to the Internet. A switch connects all PCs to the LAN. A firewall protects the boundary. A server provides shared files and DHCP/DNS services.',
    },
    {
      id: 'q-topology',
      type: 'single-select',
      question: 'What network topology is most appropriate for a small office?',
      options: [
        { id: 'bus', label: 'Bus topology', correct: false },
        { id: 'star', label: 'Star topology (all devices connect to a central switch)', correct: true },
        { id: 'ring', label: 'Ring topology', correct: false },
        { id: 'mesh', label: 'Full mesh topology', correct: false },
      ],
      hint: null,
      explanation: 'Star topology with a central switch is the standard for modern LANs. It is reliable (one cable failure only affects one device), easy to manage, and scalable.',
    },
    {
      id: 'q-services',
      type: 'multi-select',
      question: 'Which services/concepts are relevant for this office network?',
      options: [
        { id: 'dhcp', label: 'DHCP', correct: true },
        { id: 'dns', label: 'DNS', correct: true },
        { id: 'vlan', label: 'VLAN', correct: false },
        { id: 'nat', label: 'NAT', correct: true },
        { id: 'bgp', label: 'BGP', correct: false },
        { id: 'firewall', label: 'Firewall rules', correct: true },
      ],
      hint: 'hint-need-dhcp',
      explanation: 'DHCP assigns IP addresses automatically. DNS resolves names to IPs. NAT allows the entire office to share one public IP. Firewall rules protect the perimeter. VLANs and BGP are not needed at this scale.',
    },
  ],

  validationRules: [
    {
      id: 'all-pcs-connected',
      check: 'pcs-reachable-from-switch',
      requiredDeviceTypes: ['pc'],
      requiredConnections: [['pc', 'l2Switch']],
      weight: 25,
    },
    {
      id: 'internet-reachable',
      check: 'path-exists',
      pathBetween: ['pc', 'cloud'],
      requiresL3: true,
      weight: 25,
    },
    {
      id: 'server-reachable',
      check: 'server-connected',
      requiredDeviceTypes: ['server'],
      weight: 20,
    },
    {
      id: 'dhcp-present',
      check: 'server-has-service',
      service: 'dhcp',
      weight: 15,
    },
    {
      id: 'internet-boundary-secured',
      check: 'firewall-between',
      between: ['cloud', 'l2Switch'],
      weight: 15,
    },
  ],

  sdnOpportunities: [],
  vnfOpportunities: [],
  simulationEvents: [
    {
      id: 'evt-link-failure',
      label: 'Switch port failure',
      description: 'One of the switch ports fails. Three workstations lose connectivity.',
    },
    {
      id: 'evt-traffic-spike',
      label: 'Large file transfer',
      description: 'All employees simultaneously access the file server for a large backup.',
    },
  ],

  referenceArchitecture: {
    description: 'Internet → Firewall → Router → L2 Switch → PCs + Server. Simple star topology with perimeter security.',
    keyInsights: [
      'The firewall sits at the Internet boundary.',
      'The router performs NAT and connects to the ISP.',
      'A single switch is sufficient for 12 users.',
      'The server provides DHCP and DNS for the office.',
    ],
  },
};
