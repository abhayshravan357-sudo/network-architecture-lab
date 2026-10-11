/**
 * Fallback node positions — used only when the learner's stored ReactFlow
 * layout is unavailable (for example a fresh practice lab). Devices are
 * layered by role, the same way the SDN stage lays out a topology.
 */

const INFRA_TYPES = ['l2Switch', 'l3Switch', 'router', 'firewall', 'wirelessController'];

/**
 * @param {Array<{ id: string, type: string }>} nodes
 * @param {number} width  logical canvas width
 * @returns {Object<string, { x: number, y: number }>} node id → position
 */
export function fallbackPositions(nodes = [], width = 900) {
  const infra = nodes.filter((n) => INFRA_TYPES.includes(n.type));
  const endpoints = nodes.filter((n) => !INFRA_TYPES.includes(n.type));

  const positions = {};
  const place = (list, y) => {
    if (list.length === 0) return;
    const step = list.length > 1 ? (width - 240) / (list.length - 1) : 0;
    list.forEach((node, i) => {
      positions[node.id] = { x: list.length === 1 ? width / 2 : 120 + i * step, y };
    });
  };

  place(infra, 150);
  place(endpoints, 340);

  for (const node of nodes) {
    if (!positions[node.id]) positions[node.id] = { x: width / 2, y: 230 };
  }
  return positions;
}

/** Bounding box of a position map, for placing the SDN controller node. */
export function positionsBounds(positions) {
  const values = Object.values(positions);
  if (values.length === 0) return { minX: 0, maxX: 900, minY: 0, maxY: 400, centerX: 450, topY: 0 };
  const xs = values.map((p) => p.x);
  const ys = values.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
    topY: Math.min(...ys),
  };
}

export default { fallbackPositions, positionsBounds };
