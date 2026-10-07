/**
 * Validation Engine
 *
 * Evaluates the student's network topology against scenario requirements.
 * Returns a scored result with per-dimension scores, per-requirement checks,
 * and concept feedback.
 *
 * IMPORTANT: The engine does NOT compare to one perfect diagram.
 * It checks whether the architecture SATISFIES the requirements.
 * Multiple valid solutions are possible.
 */

import { NetworkGraph } from '../graph/graphModel.js';

// ── Scoring constants ──────────────────────────────────────────────────────

/** Score reduction for using a hint during planning */
const HINT_PENALTY = 3;

// ── The Validation Engine ──────────────────────────────────────────────────

export class ValidationEngine {
  constructor(scenario, graphData, config = {}) {
    this.scenario = scenario;
    this.graph = NetworkGraph.fromJSON(graphData);
    this.hintsUsed = config.hintsUsed ?? [];
    this.planningAnswers = config.planningAnswers ?? {};
  }

  run() {
    const checks = this._runAllChecks();
    const scores = this._computeScores(checks);
    const concepts = this._identifyConceptsUsed();
    const suggestions = this._generateSuggestions(checks);
    return {
      scenarioId: this.scenario.id,
      timestamp: Date.now(),
      checks,
      scores,
      concepts,
      suggestions,
      passed: scores.overall >= 60,
    };
  }

  _runAllChecks() {
    return (this.scenario.validationRules ?? []).map((rule) => this._evaluateRule(rule));
  }

  _evaluateRule(rule) {
    const base = {
      id: rule.id,
      label: this._ruleLabel(rule),
      weight: rule.weight ?? 10,
      passed: false,
      partial: false,
      score: 0,
      message: '',
      suggestion: '',
      hintId: null,
      relatedConcepts: rule.impliedConcepts ?? [],
    };
    try {
      return this._dispatchCheck(rule, base);
    } catch (err) {
      return { ...base, message: `Check error: ${err.message}` };
    }
  }

  _dispatchCheck(rule, base) {
    switch (rule.check) {
      case 'all-pcs-connected':
      case 'pcs-reachable-from-switch': return this._checkPCsConnectedToSwitch(rule, base);
      case 'type-connected': return this._checkTypeConnected(rule, base);
      case 'path-exists': return this._checkPathExists(rule, base);
      case 'server-connected':
      case 'servers-present': return this._checkServersPresent(rule, base);
      case 'server-has-service': return this._checkServerHasService(rule, base);
      case 'firewall-between': return this._checkFirewallBetween(rule, base);
      case 'type-present': return this._checkTypePresent(rule, base);
      case 'groups-segmented': return this._checkGroupsSegmented(rule, base);
      case 'server-in-protected-segment': return this._checkServerProtected(rule, base);
      case 'has-distribution-layer': return this._checkHierarchicalDesign(rule, base);
      default: return { ...base, message: `Unknown check type: "${rule.check}"` };
    }
  }

  _checkTypePresent(rule, base) {
    const count = this.graph.countByType(rule.deviceType);
    const required = rule.minCount ?? 1;
    const passed = count >= required;
    const partial = count > 0 && count < required;
    return {
      ...base, passed, partial,
      score: passed ? 100 : partial ? 50 : 0,
      message: passed
        ? `\u2713 ${rule.deviceType} present (${count})`
        : partial ? `\u25b3 Only ${count} ${rule.deviceType}(s) found, ${required} recommended`
        : `\u2717 No ${rule.deviceType} found in the topology`,
      hintId: passed ? null : this._getHintForDeviceType(rule.deviceType),
    };
  }

  _checkPCsConnectedToSwitch(rule, base) {
    const pcs = this.graph.getNodesByType('pc');
    if (pcs.length === 0) return { ...base, score: 0, message: '\u2717 No PCs in the topology' };
    const connected = pcs.filter((pc) => {
      const neighbors = this.graph.getNeighbors(pc.id);
      return neighbors.some((n) => n.type === 'l2Switch' || n.type === 'l3Switch');
    });
    const ratio = connected.length / pcs.length;
    const passed = ratio === 1;
    const partial = ratio > 0 && ratio < 1;
    return {
      ...base, passed, partial,
      score: Math.round(ratio * 100),
      message: passed
        ? `\u2713 All ${pcs.length} PCs connected to a switch`
        : `\u25b3 ${connected.length}/${pcs.length} PCs connected to a switch`,
    };
  }

  _checkTypeConnected(rule, base) {
    const type = rule.deviceType ?? 'pc';
    const nodes = this.graph.getNodesByType(type);
    if (nodes.length === 0) return { ...base, score: 0, message: `\u2717 No ${type} devices in the topology` };
    const connected = nodes.filter((node) => this.graph.getReachableFrom(node.id).length > 1);
    const ratio = connected.length / nodes.length;
    const passed = ratio >= 0.9;
    const partial = ratio >= 0.5 && ratio < 0.9;
    return {
      ...base, passed, partial,
      score: Math.round(ratio * 100),
      message: passed
        ? `\u2713 ${type} devices are connected`
        : `\u25b3 ${connected.length}/${nodes.length} ${type} devices appear to be connected`,
    };
  }

  _checkPathExists(rule, base) {
    const [typeA, typeB] = rule.pathBetween ?? [];
    if (!typeA || !typeB) return { ...base, message: 'Invalid rule configuration' };
    const path = this.graph.findPathBetweenTypes(typeA, typeB);
    if (!path) {
      return { ...base, score: 0, message: `\u2717 No path found between ${typeA} and ${typeB}`, hintId: 'hint-need-l3-device' };
    }
    if (rule.requiresL3) {
      const L3_TYPES = ['router', 'l3Switch'];
      const pathNodes = path.map((id) => this.graph.getNode(id));
      const hasL3 = pathNodes.some((n) => L3_TYPES.includes(n?.type));
      if (!hasL3) {
        return { ...base, partial: true, score: 40, message: `\u25b3 Path exists but no Layer-3 device on the route`, hintId: 'hint-need-l3-device' };
      }
    }
    return { ...base, passed: true, score: 100, message: `\u2713 Path exists from ${typeA} to ${typeB}` };
  }

  _checkServersPresent(rule, base) {
    const servers = this.graph.getNodesByType('server');
    const required = rule.minCount ?? 1;
    if (servers.length === 0) return { ...base, score: 0, message: '\u2717 No servers in the topology' };
    const connected = servers.filter((s) => this.graph.getReachableFrom(s.id).length > 1);
    const passed = connected.length >= required;
    const partial = connected.length > 0 && !passed;
    return {
      ...base, passed, partial,
      score: passed ? 100 : partial ? 60 : 20,
      message: passed ? `\u2713 ${servers.length} server(s) present and connected` : `\u25b3 Servers found but may not be properly connected`,
    };
  }

  _checkServerHasService(rule, base) {
    const servers = this.graph.getNodesByType('server');
    const service = rule.service;
    if (servers.length === 0) return { ...base, score: 0, message: `\u2717 No server present to provide ${service}`, hintId: 'hint-need-dhcp' };
    const hasService = servers.some((s) => (s.config?.services ?? []).includes(service));
    const partial = !hasService && servers.length > 0;
    return {
      ...base, passed: hasService, partial,
      score: hasService ? 100 : partial ? 60 : 0,
      message: hasService
        ? `\u2713 ${service.toUpperCase()} service configured on server`
        : partial ? `\u25b3 Server present but ${service.toUpperCase()} not explicitly configured`
        : `\u2717 No ${service.toUpperCase()} service in the topology`,
    };
  }

  _checkFirewallBetween(rule, base) {
    const [typeA, typeB] = rule.between ?? [];
    if (!typeA || !typeB) return base;
    const firewalls = this.graph.getNodesByType('firewall');
    if (firewalls.length === 0) {
      return { ...base, score: 0, message: '\u2717 No firewall in the topology \u2014 internal network unprotected', hintId: 'hint-need-firewall' };
    }
    const hasFirewall = this.graph.hasFirewallBetweenTypes(typeA, typeB);
    if (hasFirewall) return { ...base, passed: true, score: 100, message: '\u2713 Firewall present at the network boundary' };
    return { ...base, partial: true, score: 40, message: '\u25b3 Firewall exists but may not be at the Internet boundary', hintId: 'hint-need-firewall' };
  }

  _checkGroupsSegmented(rule, base) {
    const vlans = this.graph.getAllVLANs();
    if (vlans.length < 2) {
      return { ...base, score: 0, message: '\u2717 No VLAN segmentation detected \u2014 all devices share one network segment', hintId: 'hint-need-segmentation' };
    }
    const passed = vlans.length >= 3;
    const partial = vlans.length >= 2;
    return {
      ...base, passed, partial: !passed && partial,
      score: passed ? 100 : partial ? 65 : 0,
      message: passed
        ? `\u2713 ${vlans.length} VLANs configured \u2014 groups are properly segmented`
        : `\u25b3 ${vlans.length} VLAN(s) configured \u2014 consider more for finer segmentation`,
    };
  }

  _checkServerProtected(rule, base) {
    const servers = this.graph.getNodesByType('server');
    if (servers.length === 0) return { ...base, score: 0, message: '\u2717 No servers in the topology' };
    const firewalls = this.graph.getNodesByType('firewall');
    const l3Switches = this.graph.getNodesByType('l3Switch');
    const hasProtection = firewalls.length > 0 || l3Switches.length > 0;
    const hasVLAN = this.graph.getAllVLANs().length >= 2;
    if (hasProtection && hasVLAN) return { ...base, passed: true, score: 100, message: '\u2713 Servers are in a protected, isolated segment' };
    if (hasProtection) return { ...base, partial: true, score: 50, message: '\u25b3 Security devices present but server VLAN isolation may be incomplete', hintId: 'hint-need-server-vlan' };
    return { ...base, score: 20, message: '\u2717 Servers not in a protected segment \u2014 add VLANs and access control', hintId: 'hint-need-server-vlan' };
  }

  _checkHierarchicalDesign(rule, base) {
    const l3Switches = this.graph.countByType('l3Switch');
    const l2Switches = this.graph.countByType('l2Switch');
    if (l3Switches > 0 && l2Switches > 0) {
      return { ...base, passed: true, score: 100, message: `\u2713 Hierarchical design: ${l2Switches} access switch(es) + ${l3Switches} distribution L3 switch(es)` };
    }
    if (l3Switches > 0) return { ...base, partial: true, score: 65, message: '\u25b3 L3 switch present but no access-layer L2 switches' };
    return { ...base, score: 30, message: '\u2717 No L3 switch detected \u2014 consider hierarchical design for scalability', hintId: 'hint-topology-flat' };
  }

  _computeScores(checks) {
    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return this._zeroScores();
    const weightedScore = checks.reduce((sum, c) => sum + (c.score / 100) * c.weight, 0) / totalWeight;
    const overallRaw = Math.round(weightedScore * 100);
    const hintPenalty = Math.min(this.hintsUsed.length * HINT_PENALTY, 15);
    const overall = Math.max(0, overallRaw - hintPenalty);
    const dim = (keywords) => {
      const relevant = checks.filter((c) => keywords.some((kw) => c.id.includes(kw)));
      if (relevant.length === 0) return overall;
      return Math.round(relevant.reduce((sum, c) => sum + c.score, 0) / relevant.length);
    };
    return {
      overall,
      connectivity: dim(['connected', 'path', 'reachable']),
      segmentation: dim(['segmented', 'isolated', 'vlan']),
      routing: dim(['routing', 'l3', 'path']),
      services: dim(['service', 'server', 'dhcp', 'dns']),
      security: dim(['firewall', 'security', 'protected']),
      scalability: dim(['hierarchical', 'distribution', 'scale']),
    };
  }

  _zeroScores() {
    return { overall: 0, connectivity: 0, segmentation: 0, routing: 0, services: 0, security: 0, scalability: 0 };
  }

  _identifyConceptsUsed() {
    const used = new Set();
    if (this.graph.getAllVLANs().length > 0) used.add('VLAN');
    if (this.graph.countByType('l3Switch') > 0) used.add('INTER_VLAN_ROUTING');
    if (this.graph.countByType('firewall') > 0) used.add('FIREWALL');
    if (this.graph.countByType('accessPoint') > 0) used.add('WIRELESS');
    if (this.graph.countByType('router') > 0) used.add('NAT');
    if (this.graph.countByType('l2Switch') + this.graph.countByType('l3Switch') >= 2) used.add('HIERARCHICAL_TOPOLOGY');
    const servers = this.graph.getNodesByType('server');
    servers.forEach((s) => { (s.config?.services ?? []).forEach((svc) => { if (svc === 'dhcp') used.add('DHCP'); if (svc === 'dns') used.add('DNS'); }); });
    if (servers.length > 0) { used.add('DHCP'); used.add('DNS'); }
    return [...used];
  }

  _generateSuggestions(checks) {
    return checks.filter((c) => !c.passed && c.suggestion).map((c) => ({ checkId: c.id, text: c.suggestion, hintId: c.hintId }));
  }

  _ruleLabel(rule) {
    const labels = {
      'all-pcs-connected': 'Workstations Connected',
      'type-connected': `${rule.deviceType ?? 'Devices'} Connected`,
      'path-exists': 'Network Path Exists',
      'server-connected': 'Servers Connected',
      'servers-present': 'Servers Present',
      'server-has-service': `${rule.service?.toUpperCase() ?? 'Service'} Available`,
      'firewall-between': 'Firewall at Boundary',
      'type-present': `${rule.deviceType ?? 'Device'} Present`,
      'groups-segmented': 'Network Segmentation',
      'server-in-protected-segment': 'Server Protection',
      'has-distribution-layer': 'Hierarchical Design',
      'pcs-reachable-from-switch': 'Workstations on LAN',
    };
    return labels[rule.check] ?? rule.id;
  }

  _getHintForDeviceType(type) {
    const map = { l3Switch: 'hint-need-l3-device', accessPoint: 'hint-need-access-points', firewall: 'hint-need-firewall' };
    return map[type] ?? null;
  }
}
