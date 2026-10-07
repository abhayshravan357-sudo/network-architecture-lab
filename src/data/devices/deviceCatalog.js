/**
 * Device catalog — defines every device type available in the simulator.
 *
 * Each entry describes the device's networking role, capabilities,
 * allowed connections, and default configuration. This drives:
 *  - The device palette in the builder
 *  - Connection rule enforcement on the canvas
 *  - Validation engine scoring
 *  - The WHY explanations
 */

export const DEVICE_TYPES = {
  ROUTER: 'router',
  L2_SWITCH: 'l2Switch',
  L3_SWITCH: 'l3Switch',
  FIREWALL: 'firewall',
  SERVER: 'server',
  ACCESS_POINT: 'accessPoint',
  PC: 'pc',
  LAPTOP: 'laptop',
  CLOUD: 'cloud',
  WIRELESS_CONTROLLER: 'wirelessController',
};

export const CONNECTION_TYPES = {
  ETHERNET: 'ethernet',
  FIBER: 'fiber',
  WIRELESS: 'wireless',
  SERIAL: 'serial',
  WAN: 'wan',
};

const deviceCatalog = [
  {
    id: DEVICE_TYPES.ROUTER,
    name: 'Router',
    shortName: 'RTR',
    layer: 3,
    role: 'gateway',
    description: 'Connects different networks and routes packets between them using IP addresses.',
    capabilities: ['routing', 'nat', 'acl', 'dhcp-relay', 'wan-connectivity'],
    allowedConnectionTypes: [
      CONNECTION_TYPES.ETHERNET,
      CONNECTION_TYPES.FIBER,
      CONNECTION_TYPES.SERIAL,
      CONNECTION_TYPES.WAN,
    ],
    allowedConnections: [
      DEVICE_TYPES.ROUTER,
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.FIREWALL,
      DEVICE_TYPES.SERVER,
      DEVICE_TYPES.CLOUD,
    ],
    defaultConfig: {
      name: 'Router',
      interfaces: [],
      routingProtocol: 'static',
      natEnabled: false,
    },
    color: '#3b82f6',
    category: 'core',
  },
  {
    id: DEVICE_TYPES.L2_SWITCH,
    name: 'L2 Switch',
    shortName: 'SW',
    layer: 2,
    role: 'access',
    description: 'Connects devices on the same LAN. Uses MAC addresses. Cannot route between networks.',
    capabilities: ['switching', 'vlan', 'stp', 'port-security'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET, CONNECTION_TYPES.FIBER],
    allowedConnections: [
      DEVICE_TYPES.ROUTER,
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.FIREWALL,
      DEVICE_TYPES.SERVER,
      DEVICE_TYPES.ACCESS_POINT,
      DEVICE_TYPES.PC,
      DEVICE_TYPES.LAPTOP,
      DEVICE_TYPES.WIRELESS_CONTROLLER,
    ],
    defaultConfig: {
      name: 'Switch',
      vlans: [],
      stpEnabled: true,
    },
    color: '#10b981',
    category: 'access',
  },
  {
    id: DEVICE_TYPES.L3_SWITCH,
    name: 'L3 Switch',
    shortName: 'L3SW',
    layer: 3,
    role: 'distribution',
    description:
      'A switch with built-in routing capability. Handles inter-VLAN routing without a dedicated router.',
    capabilities: ['switching', 'routing', 'vlan', 'inter-vlan-routing', 'stp', 'acl'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET, CONNECTION_TYPES.FIBER],
    allowedConnections: [
      DEVICE_TYPES.ROUTER,
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.FIREWALL,
      DEVICE_TYPES.SERVER,
      DEVICE_TYPES.ACCESS_POINT,
      DEVICE_TYPES.PC,
      DEVICE_TYPES.LAPTOP,
      DEVICE_TYPES.WIRELESS_CONTROLLER,
    ],
    defaultConfig: {
      name: 'Core Switch',
      vlans: [],
      routingEnabled: false,
      stpEnabled: true,
    },
    color: '#6366f1',
    category: 'distribution',
  },
  {
    id: DEVICE_TYPES.FIREWALL,
    name: 'Firewall',
    shortName: 'FW',
    layer: 3,
    role: 'security',
    description:
      'Inspects and filters network traffic based on security rules. Guards boundaries between trusted and untrusted networks.',
    capabilities: ['packet-filtering', 'stateful-inspection', 'nat', 'vpn', 'acl'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET, CONNECTION_TYPES.FIBER],
    allowedConnections: [
      DEVICE_TYPES.ROUTER,
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.SERVER,
      DEVICE_TYPES.CLOUD,
    ],
    defaultConfig: {
      name: 'Firewall',
      rules: [],
      defaultAction: 'deny',
    },
    color: '#ef4444',
    category: 'security',
  },
  {
    id: DEVICE_TYPES.SERVER,
    name: 'Server',
    shortName: 'SRV',
    layer: 7,
    role: 'service',
    description: 'Provides network services such as DHCP, DNS, web, or file sharing.',
    capabilities: ['dhcp', 'dns', 'http', 'ftp', 'file-share'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET, CONNECTION_TYPES.FIBER],
    allowedConnections: [
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.FIREWALL,
      DEVICE_TYPES.ROUTER,
    ],
    defaultConfig: {
      name: 'Server',
      services: [],
      ip: '',
    },
    color: '#f59e0b',
    category: 'endpoint',
  },
  {
    id: DEVICE_TYPES.ACCESS_POINT,
    name: 'Access Point',
    shortName: 'AP',
    layer: 2,
    role: 'wireless-access',
    description: 'Provides wireless (Wi-Fi) connectivity for laptops, phones, and other wireless clients.',
    capabilities: ['wifi', 'vlan-tagging', 'ssid'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET, CONNECTION_TYPES.WIRELESS],
    allowedConnections: [
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.WIRELESS_CONTROLLER,
      DEVICE_TYPES.LAPTOP,
      DEVICE_TYPES.PC,
    ],
    defaultConfig: {
      name: 'Access Point',
      ssid: '',
      frequency: '2.4GHz',
    },
    color: '#14b8a6',
    category: 'wireless',
  },
  {
    id: DEVICE_TYPES.PC,
    name: 'PC',
    shortName: 'PC',
    layer: 7,
    role: 'end-device',
    description: 'A desktop computer. Connects via Ethernet to a switch.',
    capabilities: ['http-client', 'ssh-client', 'file-access'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET],
    allowedConnections: [
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.ACCESS_POINT,
    ],
    defaultConfig: {
      name: 'PC',
      ip: '',
      vlan: null,
    },
    color: '#64748b',
    category: 'endpoint',
  },
  {
    id: DEVICE_TYPES.LAPTOP,
    name: 'Laptop',
    shortName: 'LPT',
    layer: 7,
    role: 'end-device',
    description: 'A portable computer. Can connect via Ethernet or wirelessly through an access point.',
    capabilities: ['http-client', 'wifi', 'ssh-client'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET, CONNECTION_TYPES.WIRELESS],
    allowedConnections: [
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.ACCESS_POINT,
    ],
    defaultConfig: {
      name: 'Laptop',
      ip: '',
      vlan: null,
    },
    color: '#64748b',
    category: 'endpoint',
  },
  {
    id: DEVICE_TYPES.CLOUD,
    name: 'Internet / Cloud',
    shortName: 'NET',
    layer: 3,
    role: 'external',
    description:
      'Represents external Internet connectivity or a cloud provider. Always connects through a router or firewall.',
    capabilities: ['internet'],
    allowedConnectionTypes: [
      CONNECTION_TYPES.WAN,
      CONNECTION_TYPES.SERIAL,
      CONNECTION_TYPES.FIBER,
    ],
    allowedConnections: [DEVICE_TYPES.ROUTER, DEVICE_TYPES.FIREWALL],
    defaultConfig: { name: 'Internet' },
    color: '#8b5cf6',
    category: 'external',
  },
  {
    id: DEVICE_TYPES.WIRELESS_CONTROLLER,
    name: 'Wireless Controller',
    shortName: 'WLC',
    layer: 3,
    role: 'wireless-management',
    description:
      'Centrally manages multiple access points. Required for enterprise-scale wireless deployments.',
    capabilities: ['ap-management', 'roaming', 'vlan', 'qos'],
    allowedConnectionTypes: [CONNECTION_TYPES.ETHERNET, CONNECTION_TYPES.FIBER],
    allowedConnections: [
      DEVICE_TYPES.L2_SWITCH,
      DEVICE_TYPES.L3_SWITCH,
      DEVICE_TYPES.ACCESS_POINT,
    ],
    defaultConfig: { name: 'WLC' },
    color: '#0ea5e9',
    category: 'wireless',
  },
];

/** Map for O(1) lookup by device type ID */
export const DEVICE_CATALOG_MAP = Object.fromEntries(
  deviceCatalog.map((d) => [d.id, d])
);

/** Lookup helper: device definition by type id (null if unknown) */
export function getDeviceDef(typeId) {
  return DEVICE_CATALOG_MAP[typeId] ?? null;
}

export default deviceCatalog;
