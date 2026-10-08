import { describe, it, expect } from 'vitest';
import { createPolicy, validatePoliciesAgainstRequirement, policiesToFlowRules, scoreSDNPolicies } from '../src/engine/sdn/sdnPolicyEngine.js';

describe('sdnPolicyEngine', () => {
  const graphData = {
    nodes: [
      { id: 'pc1', type: 'pc', config: {} },
      { id: 'sw1', type: 'l2Switch', config: {} },
      { id: 'srv1', type: 'server', config: {} },
    ],
    edges: [
      { id: 'e1', source: 'pc1', target: 'sw1' },
      { id: 'e2', source: 'sw1', target: 'srv1' },
    ],
  };

  it('creates a policy with normalized action', () => {
    const policy = createPolicy('guest', 'admin', 'deny');
    expect(policy.source).toBe('guest');
    expect(policy.destination).toBe('admin');
    expect(policy.action).toBe('DENY');
  });

  it('validates policies against requirements', () => {
    const policies = [createPolicy('guest', 'admin', 'deny')];
    const result = validatePoliciesAgainstRequirement(policies, { sourceGroup: 'guest', destinationGroup: 'admin', action: 'deny' }, graphData);
    expect(result.satisfied).toBe(true);
  });

  it('returns unsatisfied when no matching policy exists', () => {
    const policies = [createPolicy('guest', 'internet', 'allow')];
    const result = validatePoliciesAgainstRequirement(policies, { sourceGroup: 'guest', destinationGroup: 'admin', action: 'deny' }, graphData);
    expect(result.satisfied).toBe(false);
  });

  it('generates flow rules from policies', () => {
    const graphData = {
      nodes: [
        { id: 'pc1', type: 'pc', config: {} },
        { id: 'sw1', type: 'l2Switch', config: {} },
        { id: 'srv1', type: 'server', config: {} },
      ],
      edges: [
        { id: 'e1', source: 'pc1', target: 'sw1' },
        { id: 'e2', source: 'sw1', target: 'srv1' },
      ],
    };
    const policies = [createPolicy('guest', 'server', 'deny')];
    const rules = policiesToFlowRules(policies, graphData);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].action.type).toBe('drop');
  });

  it('scores policy satisfaction against requirements', () => {
    const policies = [createPolicy('guest', 'admin', 'deny')];
    const requirements = [
      { sourceGroup: 'guest', destinationGroup: 'admin', action: 'deny' },
    ];
    const result = scoreSDNPolicies(policies, requirements, graphData);
    expect(result.overall).toBe(100);
    expect(result.satisfied).toBe(1);
  });
});
