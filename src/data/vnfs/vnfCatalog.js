/**
 * VNF Catalog — every virtual network function available in the NFV stage.
 *
 * Each entry follows spec/vnf-schema.json and adds UI metadata
 * (icon, description, replaces) used by the NFV stage screens.
 *
 * Resource units are logical: `cpu` and `memory` are allocation units,
 * `throughput` is the maximum concurrent-user load the VNF can serve
 * before it becomes overloaded (see orchestratorEngine.applyLoad).
 */

export const VNF_CATALOG = [
  {
    id: 'vFirewall',
    name: 'vFirewall',
    category: 'security',
    icon: '🛡️',
    cpu: 4,
    memory: 8,
    throughput: 1000,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'terminate'],
    replaces: 'firewall',
    description:
      'Virtualized packet-filtering firewall. Inspects traffic at segment boundaries and can be scaled horizontally during attack events or traffic surges.',
  },
  {
    id: 'vRouter',
    name: 'vRouter',
    category: 'routing',
    icon: '🔀',
    cpu: 2,
    memory: 4,
    throughput: 2000,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'migrate', 'terminate'],
    replaces: 'router',
    description:
      'Virtual router providing Layer-3 forwarding between segments. Runs on commodity server infrastructure instead of dedicated hardware.',
  },
  {
    id: 'vLoadBalancer',
    name: 'vLoadBalancer',
    category: 'traffic',
    icon: '⚖️',
    cpu: 3,
    memory: 6,
    throughput: 5000,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'terminate'],
    replaces: 'load-balancer',
    description:
      'Distributes client requests across server pools. Essential when a service must handle more concurrent users than a single server can.',
  },
  {
    id: 'vIDS',
    name: 'vIDS',
    category: 'security',
    icon: '🔍',
    cpu: 3,
    memory: 6,
    throughput: 800,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'terminate'],
    replaces: 'ids',
    description:
      'Virtual Intrusion Detection System. Monitors mirrored traffic for suspicious patterns and raises security events without blocking traffic.',
  },
  {
    id: 'vNAT',
    name: 'vNAT',
    category: 'routing',
    icon: '🌐',
    cpu: 2,
    memory: 4,
    throughput: 1500,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'terminate'],
    replaces: 'nat',
    description:
      'Virtual Network Address Translation. Maps private campus addresses to public addresses at the Internet edge.',
  },
  {
    id: 'vProxy',
    name: 'vProxy',
    category: 'traffic',
    icon: '🚪',
    cpu: 2,
    memory: 4,
    throughput: 1200,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'terminate'],
    replaces: 'proxy',
    description:
      'Virtual proxy that caches content and mediates client access to internal services, reducing load on backend servers.',
  },
  {
    id: 'vDHCP',
    name: 'vDHCP',
    category: 'service',
    icon: '🏷️',
    cpu: 2,
    memory: 4,
    throughput: 1200,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'terminate'],
    replaces: 'dhcp-server',
    description:
      'Virtual DHCP server. Hands out IP addresses to end devices and can be scaled when large client populations join at once.',
  },
  {
    id: 'vWAN',
    name: 'vWAN',
    category: 'wan',
    icon: '📡',
    cpu: 2,
    memory: 4,
    throughput: 900,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'migrate', 'terminate'],
    replaces: 'wan-optimizer',
    description:
      'Virtual WAN optimization function. Improves branch-office throughput by compressing and caching traffic over slow links.',
  },
  {
    id: 'vVPN',
    name: 'vVPN',
    category: 'security',
    icon: '🔐',
    cpu: 2,
    memory: 4,
    throughput: 1000,
    lifecycle: ['instantiate', 'configure', 'monitor', 'scale', 'terminate'],
    replaces: 'vpn-appliance',
    description:
      'Virtual VPN gateway. Terminates site-to-site tunnels in software and scales horizontally by adding instances as branches grow.',
  },
];

export const VNF_MAP = Object.fromEntries(VNF_CATALOG.map((v) => [v.id, v]));

export default VNF_CATALOG;
