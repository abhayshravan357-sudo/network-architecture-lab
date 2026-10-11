/**
 * Journey event vocabulary — shared between event generation
 * (journeyEvents.js) and the explanation layer (journeyExplanations.js).
 *
 * Every type here corresponds to a decision the network engine actually
 * makes. Types that are NOT backed by the engine are deliberately absent:
 * this simulator never claims behaviour it does not implement.
 */

export const JOURNEY_EVENT_TYPES = {
  // ── Packet lifecycle ───────────────────────────────────────
  PACKET_CREATED: 'PACKET_CREATED',
  PACKET_FORWARDED: 'PACKET_FORWARDED',
  PACKET_FLOODED: 'PACKET_FLOODED',
  PACKET_DROPPED: 'PACKET_DROPPED',
  PACKET_DELIVERED: 'PACKET_DELIVERED',
  SIMULATION_COMPLETED: 'SIMULATION_COMPLETED',

  // ── Layer 2 ────────────────────────────────────────────────
  ADDRESS_RESOLUTION: 'ADDRESS_RESOLUTION',
  SWITCH_RECEIVED_FRAME: 'SWITCH_RECEIVED_FRAME',
  MAC_LEARNED: 'MAC_LEARNED',
  MAC_LOOKUP: 'MAC_LOOKUP',

  // ── SDN control plane ──────────────────────────────────────
  FLOW_TABLE_LOOKUP: 'FLOW_TABLE_LOOKUP',
  TABLE_MISS: 'TABLE_MISS',
  CONTROLLER_REQUEST: 'CONTROLLER_REQUEST',
  FLOW_RULE_INSTALLED: 'FLOW_RULE_INSTALLED',
  POLICY_DECISION: 'POLICY_DECISION',

  // ── Layer 3 ────────────────────────────────────────────────
  ROUTE_SELECTED: 'ROUTE_SELECTED',

  // ── NFV service layer ──────────────────────────────────────
  VNF_PROCESSING_STARTED: 'VNF_PROCESSING_STARTED',
  VNF_PROCESSING_COMPLETED: 'VNF_PROCESSING_COMPLETED',
  VNF_UNAVAILABLE: 'VNF_UNAVAILABLE',
  SERVICE_CHAIN_NOTE: 'SERVICE_CHAIN_NOTE',

  // ── Orchestration (different conceptual level) ─────────────
  ORCHESTRATION_ACTION: 'ORCHESTRATION_ACTION',
};

/** Which conceptual plane an event belongs to. */
export const JOURNEY_LAYERS = {
  DATA: 'data',
  CONTROL: 'control',
  SERVICE: 'service',
  ORCHESTRATION: 'orchestration',
};

/**
 * How faithfully the engine models the event.
 * - modeled:    produced from the engine's own decision path
 * - simplified: a teaching approximation of a real mechanism
 * - unsupported: not modelled; shown for context only, never as a result
 */
export const JOURNEY_ACCURACY = {
  MODELED: 'modeled',
  SIMPLIFIED: 'simplified',
  UNSUPPORTED: 'unsupported',
};

export default JOURNEY_EVENT_TYPES;
