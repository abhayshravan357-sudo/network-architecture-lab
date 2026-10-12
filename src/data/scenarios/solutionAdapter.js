/**
 * Solution Adapter
 * 
 * Converts scenario solution definitions into ReactFlow nodes/edges
 * and validates against the device catalog.
 */

import { getDeviceDef } from '../devices/deviceCatalog.js';

/** Validates a solution node against device catalog */
export function validateSolutionNode(node) {
  const def = getDeviceDef(node.data.type);
  if (!def) {
    return { valid: false, error: `Unknown device type: ${node.data.type}` };
  }
  return { valid: true };
}

/** Validates a solution edge (connection) */
export function validateSolutionEdge(edge, nodes) {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  
  if (!sourceNode || !targetNode) {
    return { valid: false, error: 'Edge references non-existent node' };
  }
  
  // Could add connection validation rules here based on device types
  return { valid: true };
}

/** Loads a scenario solution into the network */
export function loadSolution(scenarioId, solution, setRFNodes, setRFEdges, reactFlowInstance) {
  // Validate all nodes
  for (const node of solution.nodes) {
    const validation = validateSolutionNode(node);
    if (!validation.valid) {
      console.error(`Invalid node in solution: ${validation.error}`);
      return { success: false, error: validation.error };
    }
  }
  
  // Validate all edges
  for (const edge of solution.edges) {
    const validation = validateSolutionEdge(edge, solution.nodes);
    if (!validation.valid) {
      console.error(`Invalid edge in solution: ${validation.error}`);
      return { success: false, error: validation.error };
    }
  }
  
  // Clear current canvas and load solution
  setRFNodes(solution.nodes);
  setRFEdges(solution.edges);
  
  // Fit view to solution
  if (reactFlowInstance) {
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }
  
  return { 
    success: true, 
    explanation: solution.explanation,
    nodeCount: solution.nodes.length,
    edgeCount: solution.edges.length,
  };
}

/** Checks if a solution already exists on canvas (prevents duplicates) */
export function solutionExistsOnCanvas(solution, currentNodes, currentEdges) {
  if (currentNodes.length !== solution.nodes.length || currentEdges.length !== solution.edges.length) {
    return false;
  }
  
  // Check if all solution nodes exist with same data
  for (const solNode of solution.nodes) {
    const match = currentNodes.find(n => n.id === solNode.id);
    if (!match) return false;
    if (JSON.stringify(match.data) !== JSON.stringify(solNode.data)) return false;
  }
  
  // Check if all solution edges exist
  for (const solEdge of solution.edges) {
    const match = currentEdges.find(e => e.id === solEdge.id);
    if (!match) return false;
  }
  
  return true;
}