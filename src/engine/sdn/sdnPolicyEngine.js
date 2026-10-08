/**
 * SDN Policy Engine — handles policy creation, validation,
 * and flow-rule generation for the educational SDN stage.
 *
 * Policies are simple: source group → destination group → action.
 * The engine validates them against scenario requirements and
 * converts accepted policies into logical flow rules.
 */

import { NetworkGraph } from '../graph/graphModel.js';

const ENDPOINT_GROUPS = {
  guest: ['pc', 'laptop'],
  student: ['pc', 'laptop'],
  admin: ['pc', 'laptop'],
  server: ['server'],
  internet: ['cloud'],
};

function resolveGroupNodes(graph, group) {
  const types = ENDPOINT_GROUPS[group] ?? [group];
  return graph.getNodes().filter((n) => types.includes(n.type));
}

function groupContainsNode(graph, group, nodeId) {
  return resolveGroupNodes(graph, group).some((n) => n.id === nodeId);
}

/**
 * Create a new policy object.
 */
export function createPolicy(sourceGroup, destinationGroup, action) {
  const normalizedAction = action.toLowerCase() === 'deny' ? 'DENY' : 'ALLOW';
  return {
    id: `policy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: sourceGroup,
    destination: destinationGroup,
    action: normalizedAction,
  };
}

/**
 * Validate a list of policies against a scenario requirement.
 * Returns whether the requirement is satisfied and which policies contribute.
 */
export function validatePoliciesAgainstRequirement(policies, requirement, graphData) {
  const graph = NetworkGraph.fromJSON(graphData);
  const sourceGroup = requirement.sourceGroup ?? requirement.source;
  const destinationGroup = requirement.destinationGroup ?? requirement.destination;
  const requiredAction = (requirement.action ?? 'deny').toUpperCase();

  if (!sourceGroup || !destinationGroup) {
    return { satisfied: false, reason: 'Requirement missing source/destination groups' };
  }

  const matching = policies.filter(
    (p) =>
      p.source.toLowerCase() === sourceGroup.toLowerCase() &&
      p.destination.toLowerCase() === destinationGroup.toLowerCase() &&
      p.action === requiredAction
  );

  if (matching.length === 0) {
    return {
      satisfied: false,
      reason: `No policy found for ${sourceGroup} → ${destinationGroup} = ${requiredAction}`,
    };
  }

  return {
    satisfied: true,
    reason: `${sourceGroup} → ${destinationGroup} correctly ${requiredAction === 'ALLOW' ? 'allowed' : 'blocked'}`,
    policies: matching,
  };
}

/**
 * Convert accepted policies into logical flow rules.
 */
export function policiesToFlowRules(policies, graphData) {
  const graph = NetworkGraph.fromJSON(graphData);
  const rules = [];
  let seq = 0;

  for (const policy of policies) {
    const srcNodes = resolveGroupNodes(graph, policy.source);
    const dstNodes = resolveGroupNodes(graph, policy.destination);

    for (const src of srcNodes) {
      for (const dst of dstNodes) {
        const path = graph.findPath(src.id, dst.id);
        if (!path) continue;

        const switchesOnPath = path.filter((id) => {
          const n = graph.getNode(id);
          return n && (n.type === 'l2Switch' || n.type === 'l3Switch');
        });

        for (const sw of switchesOnPath) {
          seq += 1;
          rules.push({
            id: `policy-flow-${seq}`,
            policyId: policy.id,
            switchId: sw,
            priority: policy.action === 'DENY' ? 200 : 100,
            match: {
              sourceGroup: policy.source,
              destinationGroup: policy.destination,
              source: src.id,
              destination: dst.id,
            },
            action: {
              type: policy.action === 'DENY' ? 'drop' : 'forward',
              toward: dst.id,
            },
          });
        }
      }
    }
  }

  return rules;
}

/**
 * Score the SDN policy design.
 */
export function scoreSDNPolicies(policies, requirements, graphData) {
  if (!requirements || requirements.length === 0) {
    return { overall: 100, satisfied: 0, total: 0, message: 'No policy requirements specified' };
  }

  let satisfied = 0;
  const results = requirements.map((req) => {
    const result = validatePoliciesAgainstRequirement(policies, req, graphData);
    if (result.satisfied) satisfied += 1;
    return result;
  });

  const overall = Math.round((satisfied / requirements.length) * 100);
  return {
    overall,
    satisfied,
    total: requirements.length,
    results,
    message: `${satisfied}/${requirements.length} policy requirements satisfied`,
  };
}

export default { createPolicy, validatePoliciesAgainstRequirement, policiesToFlowRules, scoreSDNPolicies };
