/**
 * Hint library — Socratic hint chains.
 *
 * Each hint has a trigger condition and a sequence of progressively
 * more explicit steps. The student is shown one step at a time.
 *
 * The hint system never says "WRONG." It guides the student to
 * reason toward the correct answer.
 */

const hintLibrary = {
  'hint-need-segmentation': {
    id: 'hint-need-segmentation',
    trigger: 'missed-vlan',
    conceptId: 'VLAN',
    title: 'Think about separation',
    steps: [
      "Good attempt. One of the requirements says that administration and student systems should be isolated from each other. How might that be achieved on the same physical switch?",
      "Think about a technology that creates logical groups on a switch — each group behaves as its own separate network, even though they share the same physical hardware.",
      "Hint: This technology uses numerical IDs (like VLAN 10, VLAN 20) to tag and separate traffic on shared switches. What is it called?",
    ],
  },

  'hint-need-l3-device': {
    id: 'hint-need-l3-device',
    trigger: 'no-l3-device',
    conceptId: 'INTER_VLAN_ROUTING',
    title: 'Think about routing',
    steps: [
      "If groups are isolated into separate VLANs, how does traffic get from one VLAN to another when it needs to? For example, how does a student device reach a server on a different VLAN?",
      "Routing between VLANs requires a Layer-3 device. A standard L2 switch cannot route. What device types can perform Layer-3 routing?",
      "Hint: Either a Router or an L3 Switch can perform inter-VLAN routing. In a campus network with many VLANs, an L3 Switch (using SVIs) is typically more efficient.",
    ],
  },

  'hint-need-firewall': {
    id: 'hint-need-firewall',
    trigger: 'no-firewall-internet',
    conceptId: 'FIREWALL',
    title: 'Think about the Internet boundary',
    steps: [
      "The network connects to the Internet. What happens if someone on the Internet tries to directly connect to an internal server?",
      "You need a security device at the boundary between the Internet (untrusted) and your internal network (trusted). What type of device inspects and filters traffic at this boundary?",
      "Hint: A Firewall sits at the perimeter and controls which connections are allowed in and out. Without it, your internal network is exposed to the Internet.",
    ],
  },

  'hint-need-access-points': {
    id: 'hint-need-access-points',
    trigger: 'no-wireless',
    conceptId: 'WIRELESS',
    title: 'Think about wireless connectivity',
    steps: [
      "The scenario mentions that students use laptops throughout the campus. How do those laptops connect to the network when they move between rooms and buildings?",
      "Wired connections are fixed to a desk. For mobile devices, you need wireless coverage. What device provides Wi-Fi access?",
      "Hint: Access Points (APs) connect wirelessly to clients and uplink to a wired switch. In enterprise environments, multiple APs are often managed by a Wireless LAN Controller (WLC).",
    ],
  },

  'hint-topology-flat': {
    id: 'hint-topology-flat',
    trigger: 'flat-topology',
    conceptId: 'HIERARCHICAL_TOPOLOGY',
    title: 'Think about scalability',
    steps: [
      "The current architecture connects many devices directly to a single switch. What happens to that network if the switch fails, or if you need to add 200 more users?",
      "Large networks are typically organized into layers: devices at the bottom (access), aggregation in the middle (distribution), and a fast backbone at the top (core). This makes the network more resilient and easier to manage.",
      "Hint: This is called Hierarchical Network Design (three-tier: access → distribution → core). For a campus with multiple buildings, this design is strongly recommended.",
    ],
  },

  'hint-need-dhcp': {
    id: 'hint-need-dhcp',
    trigger: 'no-dhcp',
    conceptId: 'DHCP',
    title: 'Think about IP management',
    steps: [
      "The campus has 500+ users. How will each device get its IP address? Would you configure each device manually?",
      "Manually assigning IP addresses to hundreds of devices is unmanageable and error-prone. What service automatically assigns IP addresses to devices when they connect?",
      "Hint: DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses, subnet masks, gateway, and DNS settings. A DHCP server (or DHCP relay) should be part of the architecture.",
    ],
  },

  'hint-need-server-vlan': {
    id: 'hint-need-server-vlan',
    trigger: 'servers-not-isolated',
    conceptId: 'VLAN',
    title: 'Think about server placement',
    steps: [
      "Servers provide critical services to many parts of the network. Should they share the same VLAN as end users, or be placed in a dedicated, protected segment?",
      "Placing servers in their own VLAN (a DMZ or server VLAN) means you can apply specific security policies. Only the VLANs that need to access specific services can be routed to the server VLAN.",
      "Hint: Create a dedicated Server VLAN (e.g., VLAN 40) and connect all servers there. Configure inter-VLAN routing and ACLs to control which VLANs can reach which servers.",
    ],
  },

  'hint-device-wrong-type': {
    id: 'hint-device-wrong-type',
    trigger: 'wrong-device-type',
    conceptId: null,
    title: 'Think about device capabilities',
    steps: [
      "Is the device type you selected capable of performing the function you need? For example, a standard L2 Switch cannot route between different IP networks.",
      "Check the device's layer and capabilities. An L2 Switch operates at Layer 2 (MAC addresses). An L3 Switch or Router operates at Layer 3 (IP addresses) and can make routing decisions.",
      "Hint: For routing between VLANs or subnets, you need a Layer-3 device: either a Router or an L3 Switch. Review your selection and consider whether the right device type is being used.",
    ],
  },
};

export default hintLibrary;

/** Get a hint chain by ID */
export function getHint(id) {
  return hintLibrary[id] ?? null;
}

/** Get all hints as an array */
export function getAllHints() {
  return Object.values(hintLibrary);
}

/** Get hints relevant to a given concept ID */
export function getHintsForConcept(conceptId) {
  return getAllHints().filter((h) => h.conceptId === conceptId);
}
