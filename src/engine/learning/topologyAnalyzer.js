/**
 * Topology Analyzer — derives scores and insights from the
 * student's actual network topology for the WHY stage.
 *
 * All scores are derived from real topology properties:
 * device counts, connectivity, VLANs, routing, security devices,
 * hierarchy, and server placement.
 */

import { NetworkGraph } from '../graph/graphModel.js';

const L3_TYPES = ['router', 'l3Switch'];
const SWITCH_TYPES = ['l2Switch', 'l3Switch'];
const ENDPOINT_TYPES = ['pc', 'laptop', 'server', 'accessPoint'];
const SECURITY_TYPES = ['firewall'];

export function analyzeTopology(graphData) {
  const graph = NetworkGraph.fromJSON(graphData);
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  const counts = {
    total: nodes.length,
    routers: graph.countByType('router'),
    l2Switches: graph.countByType('l2Switch'),
    l3Switches: graph.countByType('l3Switch'),
    firewalls: graph.countByType('firewall'),
    servers: graph.countByType('server'),
    pcs: graph.countByType('pc'),
    laptops: graph.countByType('laptop'),
    accessPoints: graph.countByType('accessPoint'),
    clouds: graph.countByType('cloud'),
    wirelessControllers: graph.countByType('wirelessController'),
  };

  const vlans = graph.getAllVLANs();
  const routerInterfaces = graph.getRouterInterfaces();
  const subnets = routerInterfaces.map((r) => r.network);
  const components = graph.getConnectedComponents();

  // Connectivity: are most endpoints reachable?
  const unreachableEndpoints = ENDPOINT_TYPES.flatMap((t) =>
    graph.getNodesByType(t).filter((n) => graph.getReachableFrom(n.id).length <= 1)
  );
  const totalEndpoints = ENDPOINT_TYPES.reduce((sum, t) => sum + graph.countByType(t), 0);
  const connectivityRatio = totalEndpoints === 0 ? 1 : (totalEndpoints - unreachableEndpoints.length) / totalEndpoints;

  // Segmentation: VLAN count and coverage
  const segmentedNodes = nodes.filter((n) => (n.config?.vlans ?? []).length > 0);
  const segmentationRatio = nodes.length === 0 ? 0 : (segmentedNodes.length / nodes.length) * 100;

  // Routing: inter-subnet paths
  const hasRoutedPath = (() => {
    const pcs = graph.getNodesByType('pc');
    const servers = graph.getNodesByType('server');
    for (const pc of pcs) {
      for (const srv of servers) {
        if (graph.findRoutedPath(pc.id, srv.id)) return true;
      }
    }
    return false;
  })();

  // Security: firewall placement and protected segments
  const hasFirewallAtBoundary = (() => {
    const firewalls = graph.getNodesByType('firewall');
    if (firewalls.length === 0) return false;
    const clouds = graph.getNodesByType('cloud');
    for (const fw of firewalls) {
      for (const cl of clouds) {
        if (graph.findPath(fw.id, cl.id)) return true;
      }
    }
    return false;
  })();

  const hasProtectedSegments = (() => {
    const firewalls = graph.getNodesByType('firewall');
    const l3s = graph.getNodesByType('l3Switch');
    return firewalls.length > 0 || l3s.length > 0;
  })();

  // Scalability: hierarchical design
  const hasHierarchicalDesign = counts.l3Switches > 0 && counts.l2Switches > 0;
  const hasDistributionLayer = counts.l3Switches > 0;

  // Compute dimension scores
  const connectivityScore = Math.round(connectivityRatio * 100);
  const segmentationScore = Math.round(Math.min(100, segmentationRatio * 1.5));
  const routingScore = hasRoutedPath ? 100 : (counts.routers > 0 ? 40 : 0);
  const securityScore = Math.round(
    (hasFirewallAtBoundary ? 50 : 0) + (hasProtectedSegments ? 30 : 0) + (vlans.length >= 2 ? 20 : 0)
  );
  const scalabilityScore = Math.round(
    (hasHierarchicalDesign ? 60 : hasDistributionLayer ? 35 : 0) +
    (counts.l2Switches >= 2 ? 20 : 0) +
    (components.length <= 1 ? 20 : 0)
  );

  const overall = Math.round(
    connectivityScore * 0.2 +
    segmentationScore * 0.15 +
    routingScore * 0.2 +
    securityScore * 0.2 +
    scalabilityScore * 0.15 +
    Math.min(100, (counts.servers > 0 ? 10 : 0)) * 0.1
  );

  // Generate insights
  const whatYouBuilt = generateWhatYouBuilt(counts, edges, graph);
  const whyItWorks = generateWhyItWorks(counts, graph, connectivityScore, routingScore);
  const strengths = generateStrengths(counts, graph, { connectivityScore, segmentationScore, routingScore, securityScore, scalabilityScore });
  const missing = generateMissing(counts, graph, { connectivityScore, segmentationScore, routingScore, securityScore, scalabilityScore });
  const improvements = generateImprovements(counts, graph, { connectivityScore, segmentationScore, routingScore, securityScore, scalabilityScore });

  return {
    scores: {
      overall,
      connectivity: connectivityScore,
      segmentation: segmentationScore,
      routing: routingScore,
      security: securityScore,
      scalability: scalabilityScore,
    },
    counts,
    vlans,
    subnets,
    components: components.length,
    whatYouBuilt,
    whyItWorks,
    strengths,
    missing,
    improvements,
  };
}

function generateWhatYouBuilt(counts, edges, graph) {
  const parts = [];
  if (counts.clouds > 0) parts.push('an Internet/Cloud connection');
  if (counts.firewalls > 0) parts.push('a firewall security boundary');
  if (counts.routers > 0) parts.push('a router for network interconnection');
  if (counts.l3Switches > 0) parts.push('L3 switches for inter-VLAN routing');
  if (counts.l2Switches > 0) parts.push(`L2 switches (${counts.l2Switches}) for LAN segmentation`);
  if (counts.servers > 0) parts.push(`servers (${counts.servers}) for network services`);
  if (counts.pcs + counts.laptops > 0) parts.push(`end devices (${counts.pcs + counts.laptops} workstations)`);
  if (counts.accessPoints > 0) parts.push(`access points (${counts.accessPoints}) for wireless`);
  if (parts.length === 0) return 'An empty network topology. Add devices to analyze your design.';
  return `You built a network with ${parts.join(', ')}.`;
}

function generateWhyItWorks(counts, graph, connectivityScore, routingScore) {
  const reasons = [];
  if (connectivityScore >= 80) reasons.push('Most devices are properly connected and can communicate.');
  if (counts.l2Switches > 0) reasons.push('Switches provide dedicated collision domains for each port.');
  if (routingScore >= 80) reasons.push('Inter-subnet routing is configured, allowing different networks to communicate.');
  if (counts.firewalls > 0) reasons.push('A firewall provides a security checkpoint at the network boundary.');
  if (counts.servers > 0) reasons.push('Servers provide centralized services (DHCP, DNS, files).');
  if (reasons.length === 0) return 'The topology exists but needs more devices and connections to function as a complete network.';
  return reasons.join(' ') ;
}

function generateStrengths(counts, graph, scores) {
  const strengths = [];
  if (scores.connectivityScore >= 80) strengths.push('Strong device connectivity — most nodes can reach each other.');
  if (scores.routingScore >= 80) strengths.push('Inter-subnet routing is working — different networks can communicate.');
  if (scores.securityScore >= 60) strengths.push('Security devices or segmentation are present.');
  if (scores.scalabilityScore >= 60) strengths.push('The design has some scalability considerations.');
  if (counts.servers > 0 && counts.pcs + counts.laptops > 0) strengths.push('End devices have servers to connect to for services.');
  if (strengths.length === 0) strengths.push('The topology has potential — add more devices and connections.');
  return strengths;
}

function generateMissing(counts, graph, scores) {
  const missing = [];
  if (scores.connectivityScore < 60) missing.push('Many devices are not connected — ensure all devices are linked to switches or routers.');
  if (scores.routingScore < 60 && counts.routers === 0 && counts.l3Switches === 0) missing.push('No Layer-3 device found — add a router or L3 switch for inter-network communication.');
  if (scores.securityScore < 40) missing.push('No security boundary detected — add a firewall between the Internet and internal network.');
  if (counts.servers === 0) missing.push('No servers present — add a server to provide DHCP, DNS, and other services.');
  if (counts.l2Switches === 0 && counts.l3Switches === 0) missing.push('No switches present — switches are needed to connect multiple devices efficiently.');
  if (missing.length === 0) missing.push('The design looks complete — consider optimization and advanced features.');
  return missing;
}

function generateImprovements(counts, graph, scores) {
  const improvements = [];
  if (scores.segmentationScore < 50 && graph.getAllVLANs().length < 2) improvements.push('Add VLANs to segment the network for security and broadcast control.');
  if (scores.scalabilityScore < 60 && counts.l3Switches === 0) improvements.push('Consider adding an L3 switch for a hierarchical (core/distribution/access) design.');
  if (counts.firewalls > 0 && !graph.getNodesByType('firewall').some((fw) => graph.getNeighbors(fw.id).some((n) => n.type === 'cloud'))) {
    improvements.push('Place the firewall directly between the Internet and the internal network for optimal security.');
  }
  if (counts.accessPoints > 0 && counts.wirelessControllers === 0) improvements.push('Add a Wireless Controller to manage access points centrally.');
  if (improvements.length === 0) improvements.push('Consider adding redundancy (multiple paths) for high availability.');
  return improvements;
}

export default { analyzeTopology };
