/**
 * Scenario: Hospital
 *
 * Teaches: critical network segmentation for patient safety,
 * medical device isolation, redundancy planning, guest vs. clinical
 * separation, firewall layering, and high-availability design.
 *
 * IMPORTANT: The scenario does NOT tell the student to "use VLAN."
 * It presents requirements that IMPLY the need for strict isolation.
 * The student must reason from life-critical requirements to solution.
 */

export const hospital = {
  id: 'hospital',
  name: 'Hospital',
  tagline: 'Design a life-critical network where a configuration mistake can cost lives.',
  difficulty: 3,
  estimatedMinutes: 40,
  icon: 'hospital',
  coverGradient: 'linear-gradient(135deg, #0c1a2e 0%, #0f3460 100%)',
  accentColor: '#22d3ee',
  tags: ['Critical Isolation', 'Redundancy', 'Medical Devices', 'VLAN', 'Firewall', 'High Availability'],

  story: `St. Meredith Regional Hospital serves a population of 200,000 people across its emergency department, three surgical wards, intensive care unit (ICU), radiology department, and outpatient clinic. The hospital employs 80 doctors, 200 nurses, 150 administrative staff, and an IT team of 10. On any given day, over 300 patients are present on the premises.

The hospital's Clinical Engineering department manages a fleet of 120 networked medical devices — ventilators, patient monitors, infusion pumps, and imaging equipment — that transmit live patient data to the nursing stations and to the Electronic Medical Records (EMR) system. These devices operate on a strict vendor-mandated network configuration: they must be reachable only by clinical systems, and any disruption or unauthorized access to these devices is considered a patient safety incident.

The IT Director, Dr. Priya Nair, has summarized the hospital's network requirements: administrative staff process billing, HR records, and insurance claims on their workstations and must never be able to access clinical systems directly. Patients and visitors can connect to a guest Wi-Fi network for Internet browsing, but this network must be completely air-gapped from every clinical, administrative, and device network. The hospital's central EMR server, imaging archive (PACS), and pharmaceutical database are housed in the on-site data center and are the most sensitive assets — access must be tightly controlled and logged. Finally, the hospital cannot tolerate network downtime: a failure in connectivity to ICU monitors or to the EMR system could endanger patient lives, so every critical link and device must have a redundant path or backup.

Your task is to design a hospital network architecture that meets every one of these requirements. Think carefully about which categories of users and devices must be kept completely separate, where your boundary devices should be placed, and how you will ensure that no single point of failure can take down a life-critical system.`,

  requirements: [
    {
      id: 'req-clinical-isolation',
      text: 'Medical device network (ventilators, monitors, infusion pumps) must be completely isolated from all other networks. No unauthorized system may reach a medical device.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL', 'Firewall'],
      validationRule: 'clinical-isolated',
      severity: 'critical',
    },
    {
      id: 'req-guest-isolation',
      text: 'Guest Wi-Fi must be completely isolated from all clinical, administrative, and server networks.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL', 'Firewall'],
      validationRule: 'guest-isolated',
      severity: 'critical',
    },
    {
      id: 'req-admin-secure',
      text: 'Administrative systems (billing, HR, insurance) must be isolated from clinical systems and medical devices.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL'],
      validationRule: 'admin-segmented',
    },
    {
      id: 'req-server-protection',
      text: 'EMR server, PACS imaging archive, and pharmaceutical database must be in a protected server segment accessible only by authorized clinical and administrative users.',
      category: 'security',
      impliedConcepts: ['VLAN', 'ACL', 'Firewall'],
      validationRule: 'server-protected',
      severity: 'critical',
    },
    {
      id: 'req-redundancy',
      text: 'Critical network paths (to ICU, EMR, and medical device segments) must have no single point of failure. Redundant links and devices are required.',
      category: 'availability',
      impliedConcepts: ['Redundancy', 'L3Switch', 'STP', 'HighAvailability'],
      validationRule: 'redundant-core',
      severity: 'critical',
    },
    {
      id: 'req-internet-access',
      text: 'Clinical and administrative staff need Internet access for research, telemedicine, and vendor updates. Guest users need Internet for personal browsing.',
      category: 'connectivity',
      impliedConcepts: ['Router', 'NAT', 'Firewall'],
      validationRule: 'internet-reachable',
    },
    {
      id: 'req-wireless-coverage',
      text: 'Wireless Wi-Fi coverage is required in all wards, the outpatient clinic, waiting areas, and administrative zones.',
      category: 'connectivity',
      impliedConcepts: ['AccessPoint', 'WirelessController', 'SSID'],
      validationRule: 'wireless-present',
    },
  ],

  resourcePool: {
    router: 2,
    l2Switch: 6,
    l3Switch: 2,
    firewall: 2,
    server: 4,
    accessPoint: 8,
    pc: 30,
    laptop: 15,
    cloud: 1,
    wirelessController: 1,
  },

  planningQuiz: [
    {
      id: 'q-critical-isolation',
      type: 'single-select',
      question: 'A ventilator transmits patient data over the network. If a nurse\'s laptop on the same network segment gets a virus, what risk does this create — and what does that imply about how the medical device network should be designed?',
      options: [
        { id: 'same-network', label: 'There is no risk — medical devices use their own protocols', correct: false },
        { id: 'password', label: 'Password-protect the devices so only authorized users can log in', correct: false },
        { id: 'isolate', label: 'The infected laptop could interfere with or reach device traffic, so the medical device network must be completely separated at the network layer', correct: true },
        { id: 'firewall-only', label: 'A firewall rule on the Internet boundary is sufficient protection', correct: false },
      ],
      hint: 'hint-medical-device-isolation',
      explanation: 'Medical devices must be on a completely isolated network segment. A compromised device on a shared network can send malicious traffic, disrupt device communications, or attempt unauthorized access — all patient safety risks. The isolation must be enforced at Layer 2 (separate segment) and Layer 3 (no routing allowed without explicit, audited policy).',
    },
    {
      id: 'q-guest-wifi',
      type: 'single-select',
      question: 'A patient connects their smartphone to the hospital\'s "Guest Wi-Fi" and accidentally runs a port scanner. What should happen — and what design decision ensures this outcome?',
      options: [
        { id: 'blocked-firewall', label: 'The scan traffic reaches clinical servers but is logged by the firewall', correct: false },
        { id: 'blocked-isolation', label: 'The scan goes nowhere near clinical or administrative systems because the guest network is completely isolated from them at the network layer', correct: true },
        { id: 'blocked-password', label: 'The EMR server password prevents unauthorized login, so no special network design is needed', correct: false },
        { id: 'vpn', label: 'Patients should be required to use a VPN before accessing guest Wi-Fi', correct: false },
      ],
      hint: 'hint-guest-isolation',
      explanation: 'Guest network isolation means that even if a guest device is malicious, there is no network path — not even a blocked one — between the guest segment and clinical, device, or administrative segments. This is achieved by placing the guest network in a completely separate logical segment with no routing to internal networks, only to the Internet.',
    },
    {
      id: 'q-redundancy',
      type: 'multi-select',
      question: 'The ICU patient monitoring system cannot lose network connectivity, even for 30 seconds. Which of the following design approaches help ensure this? (Select all that apply)',
      options: [
        { id: 'dual-links', label: 'Dual uplinks between critical switches so one link failure does not cut off a segment', correct: true },
        { id: 'dual-l3', label: 'Two L3 switches at the core so one device failure does not bring down routing', correct: true },
        { id: 'dual-fw', label: 'Redundant firewall pair in active-passive mode', correct: true },
        { id: 'more-aps', label: 'Adding more access points throughout the building', correct: false },
        { id: 'ups', label: 'Uninterruptible power supplies (UPS) on networking equipment', correct: false },
      ],
      hint: 'hint-redundancy-links',
      explanation: 'Redundancy means eliminating single points of failure. Dual links between switches, dual L3 switches at the core, and redundant firewalls ensure that no single device or cable failure breaks critical paths. Additional APs improve Wi-Fi coverage but do not address core wired redundancy. UPS addresses power, not network topology.',
    },
    {
      id: 'q-device-selection',
      type: 'multi-select',
      question: 'This hospital has six different user/device categories (clinical staff, admin staff, medical devices, servers, guests, IT management), multiple buildings, and a redundancy requirement. Which device types will you need in your design?',
      options: [
        { id: 'router', label: 'Router (Internet connectivity)', correct: true },
        { id: 'l2Switch', label: 'L2 Switch (access-layer connectivity for end devices)', correct: true },
        { id: 'l3Switch', label: 'L3 Switch (inter-segment routing with policy control)', correct: true },
        { id: 'firewall', label: 'Firewall (perimeter security and segment boundary enforcement)', correct: true },
        { id: 'server', label: 'Servers (EMR, PACS, DHCP, DNS)', correct: true },
        { id: 'accessPoint', label: 'Access Points (wireless for staff and guest)', correct: true },
        { id: 'wirelessController', label: 'Wireless Controller (centralized AP management)', correct: true },
        { id: 'hub', label: 'Hub (shared-medium device)', correct: false },
      ],
      hint: 'hint-device-selection-hospital',
      explanation: 'Every listed device type except a hub is needed. L3 switches perform inter-VLAN routing with ACL enforcement. Two firewalls provide redundancy at the perimeter. A wireless controller manages all APs centrally to ensure consistent SSID-to-VLAN mapping. Hubs are never appropriate — they broadcast all traffic to all ports, a major security risk.',
    },
    {
      id: 'q-server-placement',
      type: 'single-select',
      question: 'Where should the EMR server and PACS imaging archive be placed in the network, and why?',
      options: [
        { id: 'admin-vlan', label: 'On the same network segment as administrative PCs, since admin staff use them most', correct: false },
        { id: 'clinical-vlan', label: 'On the same segment as nursing stations since nurses access them constantly', correct: false },
        { id: 'dedicated-segment', label: 'In their own dedicated, protected server segment — access controlled through explicit policy, not by placement near users', correct: true },
        { id: 'cloud', label: 'In the cloud, outside the hospital network entirely', correct: false },
      ],
      hint: 'hint-server-placement',
      explanation: 'Servers should never be "adjacent" to any user group — that implies users on that segment have unrestricted access. A dedicated server segment (protected VLAN) means access must be explicitly permitted through routing and firewall policy, regardless of which user type is asking. This also makes it easier to audit who is accessing sensitive patient data.',
    },
  ],

  validationRules: [
    {
      id: 'clinical-isolated',
      check: 'groups-segmented',
      groups: ['medical-device', 'pc-guest'],
      requiresVLAN: true,
      weight: 25,
    },
    {
      id: 'guest-isolated',
      check: 'groups-segmented',
      groups: ['accessPoint-guest', 'server'],
      requiresVLAN: true,
      weight: 20,
    },
    {
      id: 'admin-segmented',
      check: 'groups-segmented',
      groups: ['pc-admin', 'pc-clinical'],
      requiresVLAN: true,
      weight: 15,
    },
    {
      id: 'server-protected',
      check: 'server-in-protected-segment',
      requiresFirewallOrACL: true,
      weight: 15,
    },
    {
      id: 'redundant-core',
      check: 'has-redundant-paths',
      requiresL3Switch: true,
      minL3SwitchCount: 2,
      weight: 10,
    },
    {
      id: 'internet-reachable',
      check: 'path-exists',
      pathBetween: ['pc', 'cloud'],
      requiresL3: true,
      weight: 10,
    },
    {
      id: 'wireless-present',
      check: 'type-present',
      deviceType: 'accessPoint',
      minCount: 3,
      weight: 5,
    },
  ],

  sdnOpportunities: [
    {
      id: 'sdn-policy-enforcement',
      label: 'Centralized clinical policy enforcement',
      description: 'An SDN controller can program isolation rules across all switches from one place, ensuring medical device segment isolation is consistent and cannot be accidentally misconfigured at an individual switch.',
    },
    {
      id: 'sdn-anomaly-detection',
      label: 'Real-time traffic anomaly detection',
      description: 'The SDN controller monitors all flows and can instantly quarantine a device showing abnormal communication patterns — critical for detecting ransomware or unauthorized medical device access in real time.',
    },
    {
      id: 'sdn-failover',
      label: 'Automated failover path computation',
      description: 'When a core link fails, the SDN controller recomputes paths in milliseconds and reprograms switches — far faster than STP convergence, critical for ICU monitoring continuity.',
    },
  ],

  vnfOpportunities: [
    {
      id: 'vnf-firewall',
      replaces: 'firewall',
      label: 'vFirewall',
      description: 'Replace one or both physical firewalls with software vFirewall VNFs running on the hospital\'s server cluster. Failover between instances is instant, and new rule sets can be deployed without hardware replacement.',
    },
    {
      id: 'vnf-ids',
      replaces: 'ids',
      label: 'vIDS/IPS',
      description: 'A virtual Intrusion Detection/Prevention System can be inserted inline on the medical device segment to monitor for unusual traffic without requiring dedicated physical appliances.',
    },
    {
      id: 'vnf-dhcp-dns',
      replaces: 'dhcp-server',
      label: 'vDHCP / vDNS',
      description: 'Run DHCP and DNS as VNFs on the hospital server cluster with automatic failover, eliminating a physical single-point-of-failure for IP assignment and name resolution.',
    },
  ],

  simulationEvents: [
    {
      id: 'evt-data-breach-attempt',
      label: 'Patient Data Breach Attempt',
      description: 'A laptop on the guest Wi-Fi network attempts to connect to the EMR server on port 443. Test whether your isolation policy blocks this attempt before it reaches the server segment.',
    },
    {
      id: 'evt-emergency-overload',
      label: 'Network Overload During Mass Casualty Event',
      description: 'A mass casualty incident causes all ICU monitors, 30 nursing station PCs, and the PACS imaging system to simultaneously transmit high-bandwidth data. Evaluate whether your core design has sufficient capacity and redundancy.',
    },
    {
      id: 'evt-medical-device-offline',
      label: 'Medical Device Network Segment Offline',
      description: 'The access switch serving the ICU\'s ventilators and monitors loses power. Test whether your redundant design provides an alternate path to keep device data flowing to nursing stations.',
    },
    {
      id: 'evt-ransomware',
      label: 'Ransomware on Administrative PC',
      description: 'A ransomware payload executes on an administrative PC and attempts to spread laterally to the EMR server and medical device network. Validate that your segmentation stops lateral movement.',
    },
  ],

  referenceArchitecture: {
    description: 'Dual-firewall perimeter → Redundant L3 switch core → Dedicated access switches per segment → Isolated VLANs for Clinical, Admin, Medical Devices, Servers, Guest, and Management traffic.',
    vlans: [
      { id: 10, name: 'Clinical', color: '#22d3ee' },
      { id: 20, name: 'Admin', color: '#f59e0b' },
      { id: 30, name: 'MedicalDevices', color: '#ef4444' },
      { id: 40, name: 'Servers', color: '#10b981' },
      { id: 50, name: 'Guest', color: '#8b5cf6' },
      { id: 60, name: 'Management', color: '#64748b' },
    ],
    keyInsights: [
      'Medical device VLAN (30) has NO routing to any other internal VLAN — isolation is absolute.',
      'Guest VLAN (50) routes only to the Internet via the firewall, never to internal segments.',
      'Redundant L3 switches at the core eliminate the single point of failure for inter-VLAN routing.',
      'Two firewalls in active-passive mode protect the Internet perimeter without a single point of failure.',
      'Server VLAN (40) is accessible only through explicit ACL permits on the L3 switch — deny-by-default.',
      'The Wireless Controller maps SSIDs to VLANs: "HospitalStaff" → VLAN 10/20, "HospitalGuest" → VLAN 50.',
    ],
  },
};
