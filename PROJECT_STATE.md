# Project State — SDN/NFV Architecture Lab

## Project Purpose
An educational network architecture laboratory that teaches networking, SDN, NFV, orchestration, and simulation through interactive scenarios. Students progress through stages: Build → Validate → Learn → SDN → NFV → Orchestration → Simulation → Results.

## Current Repository State
- **Branch**: `main`
- **Latest commit**: `e48f5d0 fix: repair scaling response load handling`
- **Working tree**: 11 modified tracked files, 20+ untracked files (new simulation components)
- **Build**: ✅ Successful (Vite + React)
- **Tests**: ✅ 56 tests passing (7 test files)
- **Package manager**: npm (React 18, Vite 5, Vitest 1)

## Architecture Overview

### Application Initialization
1. `main.jsx` → renders `<App />`
2. `App.jsx` wraps everything in `<CollaborationProvider>` (Yjs + WebSocket)
3. `<StageRouter>` lazy-loads stage components based on `currentStage` in Zustand store

### State Management (Zustand + persist)
**File**: `src/state/gameStore.js`
- **Stages**: 13 stages in linear progression (HOME → SCENARIO_SELECT → ... → RESULTS)
- **Network state**: `network: { rfNodes, rfEdges, graph: { nodes, edges }, remainingResources }`
- **Stage states**: `sdnState`, `nfvState`, `orchestrationState`, `simulationState`
- **Scores**: Per-stage and overall
- **Persistence**: localStorage (`nal-game-state`), partialize excludes ephemeral UI

### Network Topology
- **Visual layer**: ReactFlow nodes/edges (`rfNodes`, `rfEdges`)
- **Semantic layer**: `NetworkGraph` class (`src/engine/graph/graphModel.js`)
  - Nodes: `{ id, type, config }` — device type, interfaces, IP, VLANs, services
  - Edges: `{ id, source, target, connectionType }`
  - ARP caches, MAC tables (for simulation)
  - BFS path finding, routed path finding, subnet calculations

### Simulation Engine
**File**: `src/engine/simulation/simulationEngine.js`
- `applyEvent()` — runtime events (traffic-surge, node-failure, link-failure, security-event, user-growth, resource-shortage)
- `tracePacket()` — full packet trace with:
  1. L2 connectivity (BFS path)
  2. L2 hops with ARP, MAC learning, MAC lookup, flooding
  3. L3 routing (same-subnet vs cross-subnet, router selection)
  4. SDN policy check (flow rules, priority matching)
  5. Delivery/drop with evidence

### SDN Engine
**File**: `src/engine/sdn/sdnEngine.js`
- `deriveSDNModel()` — controller + managed switches + control edges
- `generateFlowRules()` — per-endpoint rules on path to L3 device
- `evaluateTraffic()` — policy flow matching (source/dest, priority)
- `computeReroute()` — link failure → new paths, new flow rules

### NFV Engine
**File**: `src/engine/nfv/nfvEngine.js`
- `deployVNF()` — validate server host, resource requirements
- `buildServiceChain()` — ordered VNFs with ordering rules (inspection before distribution)
- `scoreNFV()` — opportunity coverage, placement validity, chain quality, capacity

### Orchestration Engine
**File**: `src/engine/orchestration/orchestratorEngine.js`
- `instantiate()`, `scaleInstance()`, `migrateInstance()`, `removeInstance()`
- `applyLoad()` — load → utilization → status (ok/warning/overloaded)
- `scoreOrchestration()` — stability, scaling, lifecycle

### Validation Engine
**File**: `src/engine/validation/validationEngine.js`
- Scenario-driven rules: connectivity, segmentation, routing, services, security, scalability
- Weighted scoring with hint penalty

### Collaboration
**Files**: `src/collaboration/CollaborationProvider.jsx`, `server.js`
- Yjs CRDT + `y-websocket` (port 1234) + `y-indexeddb` (offline)
- Project ID from URL `?project=` or generated UUID
- Syncs ReactFlow nodes/edges bidirectionally
- **Known issue**: WebSocket server must be running separately (`node server.js`)

### Animated Simulation (Journey Mode)
**Files**: `src/components/simulation/AnimatedNetworkSimulation.jsx` + supporting components
- Event-driven playback from `journeyEvents.js` engine
- Playback toolbar (play/pause, step, speed, restart)
- Timeline grouped by plane (data, control, service)
- Inspector with explanations and "what this model doesn't simulate"
- Fault injection (link-down, missing-route, policy-deny) with divergence detection

## Existing Workflows
1. **Scenario flow**: Select → Briefing → Planning Quiz → Resource Pool → Build → Validate → Learn → SDN → NFV → Orchestration → Simulation → Results
2. **Practice Lab**: Free-form sandbox
3. **Learn Concepts**: Standalone concept library
4. **Random Challenge**: Random scenario

## Verified Features
| Feature | Status | Evidence |
|---------|--------|----------|
| Network builder (drag-drop, config, connections) | ✅ Verified | `NetworkBuilder.jsx`, `DeviceNode.jsx`, tests |
| Packet trace (L2, L3, ARP, MAC, routing, SDN) | ✅ Verified | `simulationEngine.js`, `simulationEngine.test.js` |
| SDN controller, flow rules, policies, reroute | ✅ Verified | `sdnEngine.js`, `sdnEngine.test.js`, `SdnStage.jsx` |
| NFV deploy, service chain, validation | ✅ Verified | `nfvEngine.js`, `nfvEngine.test.js`, `NfvStage.jsx` |
| Orchestration lifecycle, scaling, load | ✅ Verified | `orchestratorEngine.js`, `OrchestrationStage.jsx` |
| Scenario validation & scoring | ✅ Verified | `validationEngine.js`, `ValidationResults.jsx` |
| Animated journey (playback, timeline, inspector) | ✅ Verified | `AnimatedNetworkSimulation.jsx`, `journeyEvents.test.js` |
| Fault injection & comparison | ✅ Verified | `faultInjection.js`, `journeyEvents.test.js` |
| Collaboration (Yjs + WS + IndexedDB) | ⚠️ Partial | Code complete, WS server separate |
| Project persistence (localStorage + URL) | ✅ Verified | `gameStore.js` persist config |

## Known Limitations
1. **WebSocket server** must be started separately (`node server.js` on port 1234)
2. **ARP/MAC learning** simulated in trace only, not persistent across traces
3. **Packet encapsulation** simplified (one token = whole packet)
4. **VNF processing** models placement/order/resources, not packet rewriting
5. **OpenFlow** not modeled — control plane is logical abstraction
6. **No browser automation** for E2E workflow testing

## Important Files
| File | Responsibility |
|------|----------------|
| `src/App.jsx` | Stage routing, top nav, providers |
| `src/state/gameStore.js` | Global state, persistence, navigation |
| `src/engine/graph/graphModel.js` | Semantic network model |
| `src/engine/simulation/simulationEngine.js` | Packet trace, event simulation |
| `src/engine/sdn/sdnEngine.js` | SDN model, flow rules, reroute |
| `src/engine/nfv/nfvEngine.js` | VNF deploy, service chain |
| `src/engine/orchestration/orchestratorEngine.js` | Instance lifecycle, scaling |
| `src/engine/validation/validationEngine.js` | Scenario validation |
| `src/components/simulation/AnimatedNetworkSimulation.jsx` | Journey mode UI |
| `src/components/simulation/journeyEvents.js` | Engine → animation events |
| `src/collaboration/CollaborationProvider.jsx` | Yjs sync, WS, IndexedDB |
| `server.js` | WebSocket relay server |