import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Stage progression for the learning journey.
 * Each value is a screen/phase identifier used by the router.
 */
export const STAGES = {
  HOME: 'home',
  SCENARIO_SELECT: 'scenario-select',
  SCENARIO_BRIEFING: 'scenario-briefing',
  PLANNING_QUIZ: 'planning-quiz',
  RESOURCE_POOL: 'resource-pool',
  BUILD: 'build',
  VALIDATE: 'validate',
  LEARN: 'learn',
  SDN: 'sdn',
  NFV: 'nfv',
  ORCHESTRATION: 'orchestration',
  SIMULATION: 'simulation',
  RESULTS: 'results',
};

/**
 * Stage order — used to compute breadcrumb progress.
 * SDN onwards are Phase 6+ (future build).
 */
export const STAGE_ORDER = [
  STAGES.HOME,
  STAGES.SCENARIO_SELECT,
  STAGES.SCENARIO_BRIEFING,
  STAGES.PLANNING_QUIZ,
  STAGES.RESOURCE_POOL,
  STAGES.BUILD,
  STAGES.VALIDATE,
  STAGES.LEARN,
  STAGES.SDN,
  STAGES.NFV,
  STAGES.ORCHESTRATION,
  STAGES.SIMULATION,
  STAGES.RESULTS,
];

/** Labels shown in the top navigation breadcrumb */
export const STAGE_LABELS = {
  [STAGES.HOME]: 'Home',
  [STAGES.SCENARIO_SELECT]: 'Scenario',
  [STAGES.SCENARIO_BRIEFING]: 'Briefing',
  [STAGES.PLANNING_QUIZ]: 'Plan',
  [STAGES.RESOURCE_POOL]: 'Resources',
  [STAGES.BUILD]: 'Build',
  [STAGES.VALIDATE]: 'Validate',
  [STAGES.LEARN]: 'Why',
  [STAGES.SDN]: 'SDN',
  [STAGES.NFV]: 'NFV',
  [STAGES.ORCHESTRATION]: 'Orchestrate',
  [STAGES.SIMULATION]: 'Simulate',
  [STAGES.RESULTS]: 'Results',
};

const initialNetworkState = {
  /** ReactFlow nodes (visual layer) */
  rfNodes: [],
  /** ReactFlow edges (visual layer) */
  rfEdges: [],
  /** Pure graph for the validation engine */
  graph: {
    nodes: [],   // { id, type, config }
    edges: [],   // { id, source, target, connectionType }
  },
  /** Resource pool — how many of each device remain */
  remainingResources: {},
};

const initialState = {
  // ── Navigation ──────────────────────────────────────────
  currentStage: STAGES.HOME,
  /** 'scenario' | 'random' | 'practice' */
  gameMode: null,

  // ── Active mission ───────────────────────────────────────
  activeScenarioId: null,

  // ── Planning quiz ────────────────────────────────────────
  planningAnswers: {},
  /** Which hints were shown during planning (feeds into final score) */
  hintsUsed: [],
  quizScore: null,

  // ── Network builder ──────────────────────────────────────
  network: initialNetworkState,

  // ── Validation ───────────────────────────────────────────
  validationResult: null,

  // ── Final scores (all stages) ─────────────────────────────
  scores: {
    planning: null,
    architecture: null,
    connectivity: null,
    segmentation: null,
    routing: null,
    services: null,
    security: null,
    scalability: null,
    sdn: null,
    nfv: null,
    orchestration: null,
    simulation: null,
    overall: null,
  },

  // ── SDN stage ─────────────────────────────────────
  /** { controllerPlaced, policies, flowRules, policyFlows, failedEdgeId, reroute } */
  sdnState: null,

  // ── NFV stage ─────────────────────────────────────
  /** { deployments: [{ id, vnfId, hostNodeId, resources }], serviceChain } */
  nfvState: null,

  // ── Orchestration stage ───────────────────────────
  /** { instances, actions: [{ kind, instanceId, timestamp }], load } */
  orchestrationState: null,

  // ── Simulation stage ──────────────────────────────
  /** { events: [{ eventId, label, timestamp, impact, resolved, responseKind, summary }], graphAfter } */
  simulationState: null,
};

export const useGameStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ── Navigation actions ────────────────────────────────

      goToStage(stage) {
        set({ currentStage: stage });
      },

      goToHome() {
        set({ currentStage: STAGES.HOME });
      },

      /** Start a scenario (from Scenario Select or Random mode) */
      startScenario(scenarioId, mode = 'scenario') {
        set({
          activeScenarioId: scenarioId,
          gameMode: mode,
          currentStage: STAGES.SCENARIO_BRIEFING,
          // Reset mission state but keep stage history
          planningAnswers: {},
          hintsUsed: [],
          quizScore: null,
          network: initialNetworkState,
          validationResult: null,
          scores: initialState.scores,
          sdnState: null,
          nfvState: null,
          orchestrationState: null,
          simulationState: null,
        });
      },

      /** Hard reset — wipe everything and go home */
      resetAll() {
        set({ ...initialState });
      },

      // ── Planning quiz actions ─────────────────────────────

      savePlanningAnswer(questionId, value) {
        set((state) => ({
          planningAnswers: { ...state.planningAnswers, [questionId]: value },
        }));
      },

      recordHintUsed(hintId) {
        set((state) => ({
          hintsUsed: state.hintsUsed.includes(hintId)
            ? state.hintsUsed
            : [...state.hintsUsed, hintId],
        }));
      },

      saveQuizScore(score) {
        set({ quizScore: score });
      },

      // ── Network builder ───────────────────────────────────

      setRFNodes(rfNodes) {
        set((state) => ({ network: { ...state.network, rfNodes } }));
      },

      setRFEdges(rfEdges) {
        set((state) => ({ network: { ...state.network, rfEdges } }));
      },

      setNetworkGraph(graph) {
        set((state) => ({
          network: { ...state.network, graph },
        }));
      },

      updateGraphNode(id, type, config = {}) {
        set((state) => {
          const existing = state.network.graph.nodes.find((n) => n.id === id);
          const nodes = existing
            ? state.network.graph.nodes.map((n) =>
                n.id === id ? { ...n, type, config: { ...n.config, ...config } } : n
              )
            : [...state.network.graph.nodes, { id, type, config }];
          return { network: { ...state.network, graph: { ...state.network.graph, nodes } } };
        });
      },

      removeGraphNode(id) {
        set((state) => ({
          network: {
            ...state.network,
            graph: {
              nodes: state.network.graph.nodes.filter((n) => n.id !== id),
              edges: state.network.graph.edges.filter(
                (e) => e.source !== id && e.target !== id
              ),
            },
          },
        }));
      },

      updateGraphEdge(id, source, target, connectionType = 'ethernet') {
        set((state) => {
          const existing = state.network.graph.edges.find((e) => e.id === id);
          const edges = existing
            ? state.network.graph.edges.map((e) =>
                e.id === id ? { id, source, target, connectionType } : e
              )
            : [...state.network.graph.edges, { id, source, target, connectionType }];
          return { network: { ...state.network, graph: { ...state.network.graph, edges } } };
        });
      },

      removeGraphEdge(id) {
        set((state) => ({
          network: {
            ...state.network,
            graph: {
              ...state.network.graph,
              edges: state.network.graph.edges.filter((e) => e.id !== id),
            },
          },
        }));
      },

      // ── Validation ────────────────────────────────────────

      saveValidationResult(result) {
        set({
          validationResult: result,
          scores: {
            ...get().scores,
            architecture: result.scores.overall,
            connectivity: result.scores.connectivity,
            segmentation: result.scores.segmentation,
            routing: result.scores.routing,
            services: result.scores.services,
            security: result.scores.security,
            scalability: result.scores.scalability,
            overall: result.scores.overall,
          },
        });
      },

      // ── SDN stage actions ─────────────────────────────────

      placeController() {
        set((state) => ({
          sdnState: {
            controllerPlaced: true,
            flowRules: state.sdnState?.flowRules ?? [],
            failedEdgeId: null,
            reroute: null,
          },
        }));
      },

      setFlowRules(flowRules) {
        set((state) => ({
          sdnState: state.sdnState
            ? { ...state.sdnState, flowRules }
            : { controllerPlaced: true, flowRules, failedEdgeId: null, reroute: null },
        }));
      },

      setLinkFailure(failedEdgeId, reroute) {
        set((state) => ({
          sdnState: state.sdnState
            ? { ...state.sdnState, failedEdgeId, reroute }
            : null,
        }));
      },

      saveSDNResult(result) {
        set((state) => ({
          scores: { ...state.scores, sdn: result.overall },
        }));
      },

      addSDNPolicy(policy) {
        set((state) => ({
          sdnState: state.sdnState
            ? { ...state.sdnState, policies: [...(state.sdnState.policies ?? []), policy] }
            : { controllerPlaced: false, policies: [policy], flowRules: [], policyFlows: [], failedEdgeId: null, reroute: null },
        }));
      },

      removeSDNPolicy(policyId) {
        set((state) => ({
          sdnState: state.sdnState
            ? {
                ...state.sdnState,
                policies: (state.sdnState.policies ?? []).filter((p) => p.id !== policyId),
              }
            : null,
        }));
      },

      setSDNPolicyFlows(policyFlows) {
        set((state) => ({
          sdnState: state.sdnState
            ? { ...state.sdnState, policyFlows }
            : { controllerPlaced: false, policies: [], flowRules: [], policyFlows, failedEdgeId: null, reroute: null },
        }));
      },

      recordSDNEvent(event) {
        set((state) => ({
          sdnState: state.sdnState
            ? { ...state.sdnState, sdnEvents: [...(state.sdnState.sdnEvents ?? []), event] }
            : { controllerPlaced: false, policies: [], flowRules: [], policyFlows: [], failedEdgeId: null, reroute: null, sdnEvents: [event] },
        }));
      },

      setSDNTrafficResult(result) {
        set((state) => ({
          sdnState: state.sdnState
            ? { ...state.sdnState, activeTrafficTest: result }
            : { controllerPlaced: false, policies: [], flowRules: [], policyFlows: [], failedEdgeId: null, reroute: null, sdnEvents: [], activeTrafficTest: result },
        }));
      },

      // ── NFV stage actions ─────────────────────────────────

      deployVNF(deployment) {
        set((state) => ({
          nfvState: {
            deployments: [...(state.nfvState?.deployments ?? []), deployment],
            // New deployments join the service chain in order;
            // the student can reorder them in the NFV stage.
            serviceChain: [...(state.nfvState?.serviceChain ?? []), deployment],
          },
        }));
      },

      removeDeployment(deploymentId) {
        set((state) => {
          const deployments = (state.nfvState?.deployments ?? []).filter(
            (d) => d.id !== deploymentId
          );
          const serviceChain = (state.nfvState?.serviceChain ?? []).filter(
            (c) => c.id !== deploymentId
          );
          return { nfvState: { deployments, serviceChain } };
        });
      },

      setServiceChain(serviceChain) {
        set((state) => ({
          nfvState: state.nfvState
            ? { ...state.nfvState, serviceChain }
            : { deployments: [], serviceChain },
        }));
      },

      saveNFVResult(result) {
        set((state) => ({
          scores: { ...state.scores, nfv: result.overall },
        }));
      },

      // ── Orchestration stage actions ───────────────────────

      addInstance(instance) {
        set((state) => ({
          orchestrationState: {
            instances: [...(state.orchestrationState?.instances ?? []), instance],
            actions: state.orchestrationState?.actions ?? [],
            load: state.orchestrationState?.load ?? 0,
          },
        }));
      },

      updateInstance(instance) {
        set((state) => ({
          orchestrationState: state.orchestrationState
            ? {
                ...state.orchestrationState,
                instances: state.orchestrationState.instances.map((i) =>
                  i.id === instance.id ? instance : i
                ),
              }
            : null,
        }));
      },

      removeInstanceById(instanceId) {
        set((state) => ({
          orchestrationState: state.orchestrationState
            ? {
                ...state.orchestrationState,
                instances: state.orchestrationState.instances.filter(
                  (i) => i.id !== instanceId
                ),
              }
            : null,
        }));
      },

      recordOrchestrationAction(action) {
        set((state) => ({
          orchestrationState: state.orchestrationState
            ? {
                ...state.orchestrationState,
                actions: [...state.orchestrationState.actions, action],
              }
            : null,
        }));
      },

      setSimulatedLoad(load) {
        set((state) => ({
          orchestrationState: state.orchestrationState
            ? { ...state.orchestrationState, load }
            : null,
        }));
      },

      saveOrchestrationResult(result) {
        set((state) => ({
          scores: { ...state.scores, orchestration: result.overall },
        }));
      },

      // ── Simulation stage actions ────────────────────────────

      recordSimulationEvent(event) {
        set((state) => ({
          simulationState: {
            events: [...(state.simulationState?.events ?? []), event],
            graphAfter: event.graphAfter ?? state.simulationState?.graphAfter ?? null,
          },
        }));
      },

      resolveSimulationEvent(recordId, responseKind) {
        set((state) => ({
          simulationState: state.simulationState
            ? {
                ...state.simulationState,
                events: state.simulationState.events.map((e) =>
                  e.recordId === recordId && !e.resolved
                    ? { ...e, resolved: true, responseKind }
                    : e
                ),
              }
            : null,
        }));
      },

      setSimulationGraph(graphAfter) {
        set((state) => ({
          simulationState: state.simulationState
            ? { ...state.simulationState, graphAfter }
            : { events: [], graphAfter },
        }));
      },

      saveSimulationResult(result) {
        set((state) => ({
          scores: { ...state.scores, simulation: result.overall },
        }));
      },
    }),

    {
      name: 'nal-game-state', // localStorage key
      // Persist everything except ephemeral UI state
      partialize: (state) => ({
        currentStage: state.currentStage,
        gameMode: state.gameMode,
        activeScenarioId: state.activeScenarioId,
        planningAnswers: state.planningAnswers,
        hintsUsed: state.hintsUsed,
        quizScore: state.quizScore,
        network: state.network,
        validationResult: state.validationResult,
        scores: state.scores,
        sdnState: state.sdnState,
        nfvState: state.nfvState,
        orchestrationState: state.orchestrationState,
        simulationState: state.simulationState,
      }),
    }
  )
);
