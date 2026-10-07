/**
 * Scenario: Multi-Branch Enterprise
 *
 * Teaches: WAN connectivity, inter-site routing, centralized vs.
 * distributed services, branch isolation, site-boundary security,
 * and SD-WAN / vRouter concepts.
 *
 * IMPORTANT: The scenario does NOT prescribe WAN technology choices.
 * It presents connectivity requirements that force the student to
 * reason about routing between geographically distributed sites.
 */

export const multiBranch = {
  id: 'multi-branch',
  name: 'Multi-Branch Enterprise',
  tagline: 'Connect four geographically distributed sites into one coherent, secure enterprise network.',
  difficulty: 4,
  estimatedMinutes: 50,
  icon: 'enterprise',
  coverGradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
  accentColor: '#f59e0b',
  tags: ['WAN', 'Inter-Site Routing', 'SD-WAN', 'VPN', 'Branch Design', 'Centralized Services'],

  story: `Nexus Corporation is a mid-sized technology consulting firm with its Head Office (HQ) in the city center and three branch offices — Branch A in the northern suburbs, Branch B in the eastern industrial district, and Branch C in a satellite town 80 kilometers away. The HQ campus houses approximately 150 employees across four departments: Human Resources (HR), Finance, Engineering, and IT Operations. Branch A has 50 employees in sales and client services, Branch B has 35 employees in project delivery, and Branch C has 20 employees in regional support.

The HQ data center is the backbone of Nexus Corp's operations. It houses the central file server, the HR information system (HRIS), the finance ERP platform, a shared development server for the Engineering team, and the company's DNS and DHCP infrastructure. Every employee in every branch must be able to reach these centralized services — as if they were on the same network as HQ — but the branches themselves must not be able to see or reach each other's traffic directly. Branch A's sales data, Branch B's project files, and Branch C's support tickets are all confidential within their respective offices.

The company's CTO, Marcus Webb, has defined three non-negotiable principles: first, every site — including each branch — must have its own Internet access for general web browsing and cloud tools, but this Internet traffic must be filtered at the site boundary. Second, the WAN links connecting branches to HQ are the company's most critical infrastructure; if Branch C loses its WAN connection to HQ, its employees are essentially cut off from all central services. Third, the company is growing — a fourth branch is planned for next year, and the network design must be able to accommodate it without a complete redesign.

Your task is to design the complete Nexus Corp network, from the HQ data center to each branch edge router, ensuring that all branches can reach central services, that branch-to-branch traffic is controlled, that each site has Internet access and a security boundary, and that the design can scale.`,

  requirements: [
    {
      id: 'req-wan-connectivity',
      text: 'All three branch offices must have WAN connectivity to HQ to reach centralized services (HRIS, ERP, file server, DNS).',
      category: 'connectivity',
      impliedConcepts: ['Router', 'WAN', 'Routing', 'BGP', 'OSPF'],
      validationRule: 'all-branches-connected',
      severity: 'critical',
    },
    {
      id: 'req-centralized-services',
      text: 'Centralized services at HQ (file server, HRIS, ERP, DNS) must be accessible from all branch locations with acceptable performance.',
      category: 'services',
      impliedConcepts: ['Routing', 'DNS', 'Server', 'QoS'],
      validationRule: 'services-reachable',
      severity: 'critical',
    },
    {
      id: 'req-branch-isolation',
      text: 'Branches must not be able to access each other\'s internal networks directly. Branch-to-branch traffic must transit through HQ with policy enforcement.',
      category: 'security',
      impliedConcepts: ['Routing', 'ACL', 'Firewall', 'VPN'],
      validationRule: 'branch-isolation',
    },
    {
      id: 'req-internet-per-site',
      text: 'Each site (HQ and all three branches) must have its own Internet access for web browsing, cloud applications, and Software-as-a-Service tools.',
      category: 'connectivity',
      impliedConcepts: ['Router', 'NAT', 'Firewall', 'Internet'],
      validationRule: 'internet-per-site',
    },
    {
      id: 'req-site-security',
      text: 'Each site must have a security boundary device to filter inbound and outbound traffic. A branch compromise must not automatically spread to HQ or other branches.',
      category: 'security',
      impliedConcepts: ['Firewall', 'ACL', 'Perimeter'],
      validationRule: 'firewall-per-site',
    },
    {
      id: 'req-scalability',
      text: 'Adding a fourth branch should require only adding routing configuration for the new site, not redesigning the core HQ or existing branch networks.',
      category: 'scalability',
      impliedConcepts: ['HierarchicalRouting', 'ScalableDesign', 'RouterConfig'],
      validationRule: 'scalable-design',
    },
  ],

  resourcePool: {
    router: 5,
    l2Switch: 8,
    l3Switch: 4,
    firewall: 4,
    server: 4,
    accessPoint: 8,
    pc: 60,
    laptop: 20,
    cloud: 2,
    wirelessController: 0,
  },

  planningQuiz: [
    {
      id: 'q-wan-connectivity',
      type: 'single-select',
      question: 'Branch C is 80 km away from HQ. Its employees need to access the central HRIS and ERP servers at HQ as part of their daily work. What type of infrastructure is required to make this possible — and what device at each end connects the sites?',
      options: [
        { id: 'vpn-only', label: 'A software VPN client on each employee laptop — no extra hardware needed', correct: false },
        { id: 'wan-link-router', label: 'A WAN link (leased line, MPLS, or Internet-based VPN) between the sites, with a router at each end to connect the site LAN to the WAN', correct: true },
        { id: 'cloud-relay', label: 'Route all branch traffic through a cloud provider — no direct WAN link required', correct: false },
        { id: 'l3switch-wan', label: 'An L3 switch at Branch C that routes directly to HQ over the Internet', correct: false },
      ],
      hint: 'hint-wan-router',
      explanation: 'WAN connectivity requires a physical or virtual link between sites (leased line, MPLS circuit, or Internet-based tunnel) and a router at each end that understands how to forward packets between the site\'s LAN and the WAN. An L3 switch handles LAN routing but is not designed for WAN interfaces. A VPN client alone does not connect the entire branch office.',
    },
    {
      id: 'q-branch-isolation',
      type: 'single-select',
      question: 'Branch A\'s sales team and Branch B\'s project delivery team work on separate, confidential client engagements. They should not be able to reach each other\'s file shares or internal systems. However, both branches need to access HQ\'s central servers. How do you achieve this?',
      options: [
        { id: 'separate-internet', label: 'Give each branch a separate Internet connection — this naturally isolates them from each other', correct: false },
        { id: 'hq-policy', label: 'Route all branch-to-branch traffic through HQ, where ACLs or firewall rules deny direct branch-to-branch communication, while permitting branch-to-HQ-server access', correct: true },
        { id: 'no-routing', label: 'Don\'t configure any routing between branches — only configure routing from each branch to HQ', correct: false },
        { id: 'same-vlan', label: 'Put all branches on the same VLAN at HQ so they can all reach central services', correct: false },
      ],
      hint: 'hint-branch-isolation-routing',
      explanation: 'Routing all inter-branch traffic through HQ is the standard hub-and-spoke WAN model. Each branch has a route to HQ\'s server subnets (permitted), but no direct route to other branches\' subnets. If a branch tries to reach another branch, the traffic reaches HQ where it can be inspected and denied by ACL or firewall policy.',
    },
    {
      id: 'q-centralized-vs-distributed',
      type: 'multi-select',
      question: 'Nexus Corp is considering whether to keep DNS and DHCP only at HQ or to run local copies at each branch. What are the trade-offs? (Select all that apply)',
      options: [
        { id: 'central-simple', label: 'Centralized DNS/DHCP is simpler to manage — one place to update records', correct: true },
        { id: 'central-wan-dep', label: 'Centralized DNS/DHCP creates WAN dependency — if the WAN link fails, branch devices cannot get IP addresses or resolve names', correct: true },
        { id: 'local-resilient', label: 'Local DNS/DHCP at each branch provides resilience — branches function independently if the WAN fails', correct: true },
        { id: 'local-complex', label: 'Local DNS/DHCP requires synchronization and more management overhead', correct: true },
        { id: 'local-security', label: 'Local DHCP at branches is always less secure than centralized DHCP', correct: false },
      ],
      hint: 'hint-centralized-distributed',
      explanation: 'This is a genuine trade-off. Centralized services are simpler to manage but create WAN dependency — a branch loses IP assignment and name resolution if its WAN link drops. Local services at branches add resilience but require synchronization and management. The best design often uses local DHCP relays and DNS forwarders pointing to HQ, with local caching.',
    },
    {
      id: 'q-site-security',
      type: 'single-select',
      question: 'An employee at Branch B accidentally downloads malware, which begins scanning the network and attempting to spread laterally. Why is it important to have a security device at the Branch B perimeter — and not just at HQ?',
      options: [
        { id: 'hq-enough', label: 'HQ\'s firewall is sufficient — all branch traffic passes through HQ anyway', correct: false },
        { id: 'branch-perimeter', label: 'A branch perimeter firewall can contain the incident locally — the malware cannot spread to HQ or other branches over the WAN before the branch firewall detects and blocks it', correct: true },
        { id: 'internet-only', label: 'The branch perimeter device only filters Internet traffic, not internal LAN spread', correct: false },
        { id: 'performance', label: 'It is only for performance optimization, not security', correct: false },
      ],
      hint: 'hint-branch-perimeter',
      explanation: 'Defense in depth requires security at every site boundary. If Branch B only relies on HQ\'s firewall, malware at Branch B can spread freely within Branch B\'s LAN and potentially traverse the WAN to HQ before HQ\'s firewall can act. A Branch B perimeter firewall can quarantine the infected segment before the malware reaches the WAN link.',
    },
    {
      id: 'q-routing-protocol',
      type: 'single-select',
      question: 'Nexus Corp plans to add a fourth branch next year. Currently, routes between sites are configured statically. What is the main risk of static routing in a multi-site network, and what approach scales better as the network grows?',
      options: [
        { id: 'static-ok', label: 'Static routing is fine — just add a new static route entry on every router when Branch D is added', correct: false },
        { id: 'static-error-prone', label: 'Static routing becomes error-prone and time-consuming as sites multiply — a dynamic routing protocol (like OSPF or BGP) automatically propagates new routes when sites are added', correct: true },
        { id: 'dns-routing', label: 'DNS can handle routing between sites — no routing protocol needed', correct: false },
        { id: 'hub-routing', label: 'Hub-and-spoke routing means only HQ needs routing updates — branches never need updates', correct: false },
      ],
      hint: 'hint-dynamic-routing',
      explanation: 'In a static routing model, adding Branch D requires adding a route to Branch D\'s subnet on every router in the network — this is error-prone and grows quadratically. A dynamic routing protocol (OSPF within a site, BGP or OSPF between sites) automatically advertises new prefixes, and all routers converge on the new topology without manual updates on each router.',
    },
  ],

  validationRules: [
    {
      id: 'all-branches-connected',
      check: 'sites-connected-to-hub',
      hubSite: 'hq',
      branchSites: ['branch-a', 'branch-b', 'branch-c'],
      requiresRouter: true,
      weight: 25,
    },
    {
      id: 'services-reachable',
      check: 'path-exists',
      pathBetween: ['pc-branch', 'server-hq'],
      requiresL3: true,
      weight: 20,
    },
    {
      id: 'branch-isolation',
      check: 'groups-segmented',
      groups: ['pc-branch-a', 'pc-branch-b'],
      requiresACL: true,
      weight: 15,
    },
    {
      id: 'internet-per-site',
      check: 'path-exists-per-site',
      pathBetween: ['pc', 'cloud'],
      requiresL3: true,
      weight: 15,
    },
    {
      id: 'firewall-per-site',
      check: 'firewall-at-each-site',
      minCount: 4,
      weight: 15,
    },
    {
      id: 'scalable-design',
      check: 'has-dynamic-routing-or-hub-spoke',
      weight: 10,
    },
  ],

  sdnOpportunities: [
    {
      id: 'sdn-sdwan',
      label: 'SD-WAN centralized control',
      description: 'Replace traditional WAN routers with SD-WAN edge devices controlled by a central orchestrator. The controller dynamically selects the best path for each application — MPLS for sensitive ERP traffic, broadband Internet for video calls — without manual reconfiguration at each branch.',
    },
    {
      id: 'sdn-dynamic-path',
      label: 'Dynamic path selection and failover',
      description: 'An SD-WAN controller monitors WAN link quality in real time. If Branch C\'s primary MPLS link degrades, the controller automatically reroutes ERP and HRIS traffic over a backup Internet VPN within seconds — invisible to end users.',
    },
    {
      id: 'sdn-policy-push',
      label: 'Centralized branch policy deployment',
      description: 'When a new security policy is required (e.g., blocking a new class of threat), the SDN controller pushes the ACL update to all four site firewalls simultaneously — eliminating the need to log in to each branch device manually.',
    },
  ],

  vnfOpportunities: [
    {
      id: 'vnf-vrouter',
      replaces: 'router',
      label: 'vRouter at branches',
      description: 'Replace physical branch routers with software vRouter VNFs running on a small server at each branch. Adding Branch D requires provisioning a vRouter instance, not shipping and racking hardware — the entire branch WAN configuration can be templated.',
    },
    {
      id: 'vnf-vfirewall',
      replaces: 'firewall',
      label: 'vFirewall at each site',
      description: 'A software vFirewall at each branch can be instantiated, updated, and scaled without physical hardware changes. During a security incident, the vFirewall policy at a compromised branch can be tightened remotely within seconds.',
    },
    {
      id: 'vnf-vpn-gateway',
      replaces: 'vpn-appliance',
      label: 'vVPN Gateway',
      description: 'Replace dedicated VPN hardware at HQ with a clustered vVPN gateway running as a VNF. As more branches are added, the VPN gateway scales horizontally by adding VNF instances, not by purchasing larger hardware.',
    },
  ],

  simulationEvents: [
    {
      id: 'evt-wan-failure',
      label: 'WAN Link Failure — Branch C Cut Off',
      description: 'The 80 km WAN link from Branch C to HQ fails during business hours. Branch C\'s 20 employees cannot access the HRIS, ERP, or central file server. Evaluate whether your design included any failover path for Branch C, and what happens to in-progress transactions.',
    },
    {
      id: 'evt-hq-dc-overload',
      label: 'HQ Data Center Overload',
      description: 'Month-end financial close causes all three branches to simultaneously generate heavy ERP and file server traffic. The HQ data center LAN and WAN uplinks become saturated. Examine where the bottlenecks are in your design and what QoS or capacity planning could prevent this.',
    },
    {
      id: 'evt-branch-security-incident',
      label: 'Branch B Security Incident',
      description: 'A phishing attack at Branch B results in a compromised PC attempting to exfiltrate data over the WAN to HQ and scan Branch A\'s subnet. Test whether your branch perimeter security and branch isolation policies contain the incident to Branch B.',
    },
  ],

  referenceArchitecture: {
    description: 'Hub-and-spoke WAN: HQ acts as the hub with the central data center. Each branch has its own router, firewall, and L3 switch. All inter-branch traffic transits HQ. Each site has independent Internet access through its local firewall.',
    vlans: [
      { id: 10, name: 'HQ-Engineering', color: '#f59e0b' },
      { id: 20, name: 'HQ-Finance', color: '#10b981' },
      { id: 30, name: 'HQ-HR', color: '#3b82f6' },
      { id: 40, name: 'HQ-Servers', color: '#ef4444' },
      { id: 50, name: 'Branch-Users', color: '#8b5cf6' },
      { id: 60, name: 'Management', color: '#64748b' },
      { id: 70, name: 'WAN-Transit', color: '#f97316' },
    ],
    keyInsights: [
      'Hub-and-spoke WAN topology: branches connect to HQ, never directly to each other.',
      'Each branch has its own subnet routable to HQ\'s server VLANs, but not to other branch subnets.',
      'A router and firewall at each branch site enforce the Internet perimeter and WAN boundary.',
      'HQ uses L3 switches at its core to route between department VLANs and the WAN-facing router.',
      'ACLs at HQ\'s core switch block branch-to-branch routing while permitting branch-to-server routing.',
      'Adding Branch D requires: a new WAN link, a branch router/firewall, and a new subnet advertised to HQ — no existing device needs redesigning.',
      'SD-WAN can replace the traditional hub-and-spoke model: each branch edge device is centrally managed, and paths between sites are selected dynamically based on application policy.',
    ],
  },
};
