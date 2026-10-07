/**
 * Networking concept library.
 *
 * Every concept has:
 *  - what:  A clear definition
 *  - why:   The problem it solves (the architectural reason)
 *  - when:  When to choose it
 *  - example: A concrete, memorable example
 *  - scenarioApplication: How it appears in each scenario
 *
 * These are rendered in the WHY explainer stage and inline
 * in validation feedback.
 */

const conceptLibrary = {
  VLAN: {
    id: 'VLAN',
    name: 'VLAN (Virtual LAN)',
    icon: 'vlan',
    tags: ['segmentation', 'layer2', 'switching'],
    what: 'A VLAN (Virtual Local Area Network) is a logical group of network devices that behave as if they are on the same physical network — even when they are not. VLANs divide a single physical switch into multiple isolated broadcast domains.',
    why: 'Without VLANs, every device on a switch shares the same broadcast domain. This means every device receives every broadcast packet (like ARP requests), which wastes bandwidth, increases security risk, and makes it impossible to logically isolate groups like students and administrators even if they share the same physical switch.',
    when: 'Use VLANs when you need to logically separate groups of users or devices that share physical infrastructure — for example, separating administration from students, or guest Wi-Fi from staff networks. If groups need to communicate, add inter-VLAN routing.',
    example: 'A school has one switch in each classroom. Students and teachers plug into the same switch, but VLAN 10 carries only teacher traffic and VLAN 20 carries only student traffic. They share the cable but remain logically isolated.',
    scenarioApplication: {
      'college-campus': 'The campus requires that administration data cannot be accessed by students. On the shared distribution switches, VLAN 10 (Administration), VLAN 20 (Faculty), VLAN 30 (Students), and VLAN 40 (Servers) separate the groups logically.',
      'hospital': 'Clinical systems (VLAN 10), administrative records (VLAN 20), guest Wi-Fi (VLAN 30), and medical devices (VLAN 40) are isolated on separate VLANs to enforce strict access control.',
      'hotel': 'Guest Wi-Fi (VLAN 10) is completely separated from staff (VLAN 20) and management (VLAN 30) traffic.',
      'small-office': 'A small office may use one or two VLANs to separate general staff from servers.',
      'multi-branch': 'Each branch uses VLANs to separate internal departments before traffic traverses the WAN.',
    },
  },

  INTER_VLAN_ROUTING: {
    id: 'INTER_VLAN_ROUTING',
    name: 'Inter-VLAN Routing',
    icon: 'routing',
    tags: ['routing', 'layer3', 'vlan'],
    what: 'Inter-VLAN routing allows traffic to pass between different VLANs. Since VLANs are isolated by design, a Layer-3 device (router or L3 switch) is required to route between them.',
    why: 'VLANs isolate traffic, but groups still need controlled communication. For example, students may need to access a shared server on the server VLAN. Without inter-VLAN routing, this is impossible. The router or L3 switch enforces which VLANs can communicate and which cannot.',
    when: 'Use inter-VLAN routing whenever you have multiple VLANs and need controlled communication between them. A router-on-a-stick (subinterfaces) is the classic approach; an L3 switch with SVIs (Switched Virtual Interfaces) is more efficient for higher-traffic networks.',
    example: 'Students on VLAN 30 can reach the server on VLAN 40 because the L3 switch has an SVI for each VLAN and routes packets between them. They cannot reach VLAN 10 (Administration) because there is no route entry (or an ACL blocks it).',
    scenarioApplication: {
      'college-campus': 'The L3 core switch routes between Student VLAN, Server VLAN, and Faculty VLAN while blocking direct Student → Administration traffic.',
      'hospital': 'Clinical workstations can reach the central EMR server VLAN, but guest Wi-Fi cannot reach any clinical or administrative VLAN.',
      'hotel': 'Staff can reach the server VLAN for PMS access; guest VLAN can only reach the Internet gateway.',
      'small-office': 'A router provides basic routing between the office LAN and the Internet.',
      'multi-branch': 'Branch routers connect branch VLANs to the WAN link back to head office.',
    },
  },

  DHCP: {
    id: 'DHCP',
    name: 'DHCP (Dynamic Host Configuration Protocol)',
    icon: 'dhcp',
    tags: ['services', 'layer7', 'ip-management'],
    what: 'DHCP automatically assigns IP addresses, subnet masks, default gateways, and DNS server addresses to devices when they connect to the network. Without DHCP, every device would need a manually configured IP address.',
    why: 'In a network with tens or hundreds of devices, manually assigning IP addresses is error-prone and unmanageable. DHCP centralizes IP management, prevents duplicate addresses, and allows devices to receive configuration automatically — including laptops that move between locations.',
    when: 'Use DHCP in any network with more than a handful of devices, or any network with mobile/wireless devices. DHCP scopes should be defined per VLAN or subnet. Use DHCP reservations for servers and printers that need consistent IP addresses.',
    example: 'A student opens their laptop and connects to campus Wi-Fi. The DHCP server automatically assigns IP 192.168.30.45/24, gateway 192.168.30.1, and DNS 10.0.0.10. The student does not configure anything.',
    scenarioApplication: {
      'college-campus': 'A central DHCP server (on the server VLAN) serves separate DHCP scopes for each VLAN. DHCP relay on the L3 switch forwards DHCP broadcasts from VLANs 10–40 to the server.',
      'hospital': 'Each department VLAN has its own DHCP scope. Medical devices may use DHCP with reservations for consistent addressing.',
      'hotel': 'Guest VLAN uses a DHCP scope with short lease times (4 hours) and Internet-only access. Staff VLAN uses longer leases and internal gateway access.',
      'small-office': 'The router acts as DHCP server for the office LAN, typically assigning 192.168.1.x addresses.',
      'multi-branch': 'Each branch may have a local DHCP server or use a WAN-connected central DHCP with relay agents.',
    },
  },

  DNS: {
    id: 'DNS',
    name: 'DNS (Domain Name System)',
    icon: 'dns',
    tags: ['services', 'layer7', 'naming'],
    what: 'DNS translates human-readable names (like www.college.edu) into IP addresses (like 203.0.113.10). It is the phone book of the Internet and of internal networks.',
    why: 'IP addresses are numbers that humans cannot easily remember or work with. DNS allows users and applications to use names. Without DNS, every internal service would need to be accessed by IP address, which breaks whenever an IP changes.',
    when: 'Use DNS for any network that has named services — websites, email servers, file servers, printers. In a campus or enterprise network, a local DNS server resolves internal hostnames and forwards external requests to an ISP or public DNS server.',
    example: 'A student types "library.college.edu" in a browser. The campus DNS server resolves it to 10.40.1.5 (the library server). The student never needs to know the IP address.',
    scenarioApplication: {
      'college-campus': 'A DNS server sits in the server VLAN. It resolves internal names (library.campus.edu, portal.campus.edu) and forwards public names to the ISP DNS upstream.',
      'hospital': 'An internal DNS server resolves EMR system hostnames. External lookups forwarded upstream.',
      'hotel': 'Guest VLAN DNS forwards to ISP. Internal staff DNS resolves hotel PMS hostnames.',
      'small-office': 'The router or a simple server handles DNS, forwarding to ISP for external names.',
      'multi-branch': 'A central DNS server at head office resolves enterprise names for all branches over the WAN.',
    },
  },

  ACL: {
    id: 'ACL',
    name: 'ACL (Access Control List)',
    icon: 'acl',
    tags: ['security', 'layer3', 'traffic-filtering'],
    what: 'An ACL is a list of rules applied to a network interface that permits or denies traffic based on source/destination IP, protocol, and port. ACLs implement access policies at the network layer.',
    why: 'Even with VLANs and routing, a router or L3 switch will route traffic between VLANs by default. ACLs are what enforce "students can reach the server VLAN but not the administration VLAN." Without ACLs, segmentation is physical but not enforced at Layer 3.',
    when: 'Apply ACLs on routers and L3 switches to enforce access policies between VLANs or between the network and the Internet. Common uses: block student VLAN from administration VLAN, allow server VLAN only on specific ports, restrict management access.',
    example: 'ACL rule: DENY ip 192.168.30.0/24 (Students) 192.168.10.0/24 (Administration). Students can reach the server VLAN (PERMIT) but are blocked from administration.',
    scenarioApplication: {
      'college-campus': 'ACLs on the L3 switch enforce: Students → Servers PERMIT, Students → Administration DENY, Faculty → Administration PERMIT.',
      'hospital': 'ACLs strictly isolate the medical device VLAN. Guest VLAN has only Internet access (PERMIT any → Internet, DENY any → any_internal).',
      'hotel': 'Guest ACL: PERMIT Internet, DENY internal. Staff ACL: PERMIT specific services.',
      'small-office': 'Simple ACL on the router blocks inbound Internet traffic not matching established sessions.',
      'multi-branch': 'ACLs on branch routers restrict which branch traffic can reach which head-office systems.',
    },
  },

  FIREWALL: {
    id: 'FIREWALL',
    name: 'Firewall',
    icon: 'firewall',
    tags: ['security', 'layer3', 'perimeter'],
    what: 'A firewall is a security device that monitors and controls incoming and outgoing network traffic based on predefined security rules. Unlike ACLs, stateful firewalls track connection state and can make more sophisticated decisions.',
    why: 'The Internet is untrusted. Without a firewall, any external system could attempt to connect to internal servers, devices, or management interfaces. A firewall enforces a security perimeter — the boundary between trusted internal networks and untrusted external networks.',
    when: 'Always place a firewall at the boundary between the Internet and your internal network. In high-security environments (hospital, government), use a firewall also at internal boundaries (e.g., between guest and clinical networks).',
    example: 'All traffic from the Internet must pass through the firewall. The firewall allows HTTP/HTTPS responses to requests initiated from inside, but blocks all unsolicited inbound connections. Port 80 to the web server is explicitly permitted.',
    scenarioApplication: {
      'college-campus': 'A firewall sits between the router (Internet) and the core distribution layer. It inspects all inbound traffic and prevents direct Internet-to-server access.',
      'hospital': 'A firewall at the Internet boundary. Potentially a second internal firewall isolates clinical and administrative segments.',
      'hotel': 'Firewall at Internet boundary. Guest VLAN is double-isolated: firewall + ACL ensures guests cannot reach internal hotel systems.',
      'small-office': 'A perimeter firewall (or router with firewall capability) sits between the ISP connection and the office LAN.',
      'multi-branch': 'Each branch has a firewall/router securing the WAN connection. Central firewall at head office protects the data center.',
    },
  },

  NAT: {
    id: 'NAT',
    name: 'NAT (Network Address Translation)',
    icon: 'nat',
    tags: ['routing', 'layer3', 'internet'],
    what: 'NAT translates private IP addresses used inside a network to a public IP address used on the Internet. This allows many devices with private addresses to share a single public IP address.',
    why: 'IPv4 addresses are scarce. Private address ranges (192.168.x.x, 10.x.x.x) are not routable on the Internet. NAT on the router translates these private addresses to the router\'s public IP when traffic leaves, and maps replies back to the correct internal device.',
    when: 'Use NAT on any router that connects a private network to the Internet. In small offices and home networks, PAT (Port Address Translation) is the most common form — many internal IPs share one public IP, distinguished by port numbers.',
    example: 'PC at 192.168.1.50 sends a web request. The router translates source to 203.0.113.5:4521 (public IP + unique port) before forwarding to the Internet. The web server replies to 203.0.113.5:4521. The router translates back to 192.168.1.50 and delivers the response.',
    scenarioApplication: {
      'college-campus': 'NAT on the campus router translates all internal campus addresses to the ISP-assigned public IP before Internet traffic leaves.',
      'hospital': 'NAT on the perimeter router/firewall. Internal clinical systems are never directly exposed by public IPs.',
      'hotel': 'NAT on the gateway router allows guest devices (private 10.x.x.x) to access the Internet through the hotel\'s single public IP.',
      'small-office': 'PAT on the router allows all office devices to share the ISP-assigned IP address.',
      'multi-branch': 'Each branch uses NAT on its WAN router for Internet access. Site-to-site VPN traffic typically bypasses NAT.',
    },
  },

  HIERARCHICAL_TOPOLOGY: {
    id: 'HIERARCHICAL_TOPOLOGY',
    name: 'Hierarchical Network Design',
    icon: 'hierarchy',
    tags: ['topology', 'design', 'scalability'],
    what: 'Hierarchical network design organizes a network into three layers: Access (connects end devices), Distribution (aggregates access switches and applies policies), and Core (high-speed backbone between distribution layers). This is the most common model for campus and enterprise networks.',
    why: 'Flat networks (where everything connects to one switch) do not scale. Every broadcast reaches every device. Failures affect everyone. A hierarchical design contains broadcasts to access-layer domains, isolates failures, allows policy enforcement at the distribution layer, and provides a fast core backbone. It also makes troubleshooting predictable.',
    when: 'Use hierarchical design for any network with multiple buildings, departments, or more than ~50 devices. For small offices (< 20 devices), a flat design with one switch and one router may be sufficient.',
    example: 'A university building: PCs plug into floor-level access switches (L2). Floor switches uplink to a building distribution switch (L3, handles VLANs and routing). Building switches uplink to the campus core switches (high-speed, no end devices).',
    scenarioApplication: {
      'college-campus': 'Three-tier design: access switches per department/building → distribution L3 switches per zone → core backbone connecting buildings. This is the reference architecture for the campus scenario.',
      'hospital': 'Access switches per ward/department → distribution L3 switch per floor → hospital core. Medical device VLAN isolated at the distribution layer.',
      'hotel': 'Access switches per floor → distribution switches per wing → core router/firewall stack.',
      'small-office': 'A small office may use only the access layer (one switch + router). Hierarchy is not needed unless growth is expected.',
      'multi-branch': 'Each branch has its own simplified hierarchy. The WAN link connects branch distribution layers to head office.',
    },
  },

  SDN: {
    id: 'SDN',
    name: 'SDN (Software Defined Networking)',
    icon: 'sdn',
    tags: ['sdn', 'control-plane', 'programmability'],
    what: 'SDN separates the network control plane (decisions about where traffic goes) from the data plane (the actual forwarding of traffic). A centralized SDN controller programs flow rules into network switches, replacing the distributed, device-by-device configuration model.',
    why: 'Traditional networks are managed device-by-device. Every switch and router runs its own control logic. This makes changes slow, error-prone, and difficult to reason about globally. SDN moves control to a central controller that has a complete view of the network and can program all devices simultaneously. Policy changes happen in one place.',
    when: 'SDN is most beneficial in large data centers, dynamic cloud environments, and networks that need rapid programmable changes — such as those serving multiple tenants or requiring automated traffic engineering.',
    example: 'In an SDN campus, when a student connects in Building A, the SDN controller instantly programs all switches on the path to apply VLAN and ACL policies. When the student moves to Building B, the controller updates flow rules across all affected switches — no manual reconfiguration required.',
    scenarioApplication: {
      'college-campus': 'Replacing the static VLAN/ACL configuration with an SDN controller that centrally manages all switch flow rules. When student device moves between buildings, the controller automatically updates policies.',
    },
  },

  NFV: {
    id: 'NFV',
    name: 'NFV (Network Function Virtualization)',
    icon: 'nfv',
    tags: ['nfv', 'virtualization', 'vnf'],
    what: 'NFV replaces dedicated physical network appliances (routers, firewalls, load balancers) with software running on standard servers. Each virtualized function is called a VNF (Virtual Network Function).',
    why: 'Physical network appliances are expensive, inflexible, and slow to deploy. A hardware firewall takes weeks to procure and cannot be scaled instantly. A vFirewall (software) can be deployed in minutes, scaled by adding instances, and migrated without touching physical hardware.',
    when: 'NFV is valuable when you need rapid deployment, dynamic scaling, or multi-tenancy. It is fundamental to modern telco networks, cloud environments, and any network that experiences variable load.',
    example: 'During a campus exam period, student network traffic doubles. Instead of buying another firewall, the network team spins up a second vFirewall instance in 5 minutes and load-balances traffic across both.',
    scenarioApplication: {
      'college-campus': 'The physical firewall is replaced by a vFirewall VNF. During peak exam periods, a second vFirewall instance is spun up. The vRouter handles routing between VLANs. All VNFs run on a shared server cluster.',
    },
  },
};

export default conceptLibrary;

/** Get a concept by its ID */
export function getConcept(id) {
  return conceptLibrary[id] ?? null;
}

/** Get all concepts as an array */
export function getAllConcepts() {
  return Object.values(conceptLibrary);
}

/** Get concepts relevant to a specific scenario */
export function getConceptsForScenario(scenarioId) {
  return getAllConcepts().filter(
    (c) => c.scenarioApplication && scenarioId in c.scenarioApplication
  );
}
