# Agent Handover — SDN/NFV Architecture Lab

## 1. Project Purpose & User Goal
An interactive educational lab where students build network topologies, add SDN control, virtualize functions (NFV), orchestrate VNF lifecycles, and simulate packet journeys through the configured network. Learning progression: Build → Validate → SDN → NFV → Orchestration → Simulation.

## 2. How to Run the Application

```bash
cd /home/abhaysawant/Desktop/SDN-NFV_sim

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
# Opens http://localhost:5173/network-architecture-lab/

# Start WebSocket collaboration server (separate terminal)
node server.js
# Runs on ws://localhost:1234

# Run tests
npm test

# Production build
npm run build
# Output in dist/
```

## 3. How to Run Tests & Build
- **Tests**: `npm test` (Vitest, 56 tests, 7 files)
- **Build**: `npm run build` (Vite, ~100KB gzipped main bundle)
- **Lint/TypeCheck**: Not configured — only `npm test` validates

## 4. Actual Architecture

```
src/
├── App.jsx                 # Stage router, top nav, providers
├── main.jsx                # React root
├── state/gameStore.js      # Zustand store (all state + persistence)
├── engine/
│   ├── graph/graphModel.js        # NetworkGraph (semantic model)
│   ├── simulation/simulationEngine.js  # tracePacket, applyEvent
│   ├── sdn/sdnEngine.js           # SDN model, flow rules, reroute
│   ├── nfv/nfvEngine.js           # VNF deploy, service chain
│   ├── orchestration/orchestratorEngine.js  # Instance lifecycle
│   └── validation/validationEngine.js       # Scenario scoring
├── components/
│   ├── builder/            # NetworkBuilder, DeviceNode, DeviceConsole
│   ├── simulation/         # AnimatedNetworkSimulation + journey components
│   ├── sdn/                # SdnStage
│   ├── nfv/                # NfvStage
│   ├── orchestration/      # OrchestrationStage
│   └── scenario/           # ScenarioSelect, ScenarioBriefing
├── collaboration/
│   └── CollaborationProvider.jsx  # Yjs + WebSocket + IndexedDB
└── data/                   # Scenarios, devices, VNFs, concepts
```

## 5. Current Known Bugs

| Bug | Severity | Location | Status |
|-----|----------|----------|--------|
| WebSocket shows "disconnected" | High | `CollaborationProvider.jsx` + `server.js` | Untested — server must run separately |
| Connection validation missing | Medium | `NetworkBuilder.jsx` | AllowedConnections defined but not enforced on connect |
| Resource pool not enforced | Medium | `ResourcePool.jsx` / `NetworkBuilder.jsx` | Pool shows but doesn't block |
| ARP/MAC cache resets per trace | Low | `simulationEngine.js` | By design (fresh graph each trace) |
| Cross-subnet ARP shows direct | Low | `traceL2Path` + `traceL3Routing` | Gateway MAC not shown in L2 trace |

**Historical bug (FIXED)**: `ReferenceError: showComparison is not defined` — variable no longer exists in current code. SimulationStage uses `faultConfig`, `faultyTrace`, `comparisonDivergence`.

## 6. Current Verified State

✅ **All 56 tests pass**  
✅ **Build succeeds**  
✅ **Core workflow**: Build → SDN → NFV → Orchestration → Simulation  
✅ **Packet trace**: L2, L3, ARP, MAC, SDN policy, delivery/drop  
✅ **Animated journey**: Playback, timeline, inspector, fault comparison  
✅ **Persistence**: localStorage + URL project ID  

⚠️ **Collaboration**: Code complete, requires manual WS server test  
⚠️ **E2E workflows**: No browser automation  

## 7. Important Files & Entry Points

| File | Purpose |
|------|---------|
| `src/App.jsx` | Stage routing, top nav |
| `src/state/gameStore.js` | Global state, actions, persistence |
| `src/engine/graph/graphModel.js` | Semantic network (NetworkGraph) |
| `src/engine/simulation/simulationEngine.js` | Packet trace, event simulation |
| `src/engine/sdn/sdnEngine.js` | SDN controller, flow rules |
| `src/engine/nfv/nfvEngine.js` | VNF deploy, service chain |
| `src/engine/orchestration/orchestratorEngine.js` | Instance lifecycle |
| `src/components/simulation/AnimatedNetworkSimulation.jsx` | Journey mode UI |
| `src/engine/simulation/journeyEvents.js` | Engine → animation events |
| `src/collaboration/CollaborationProvider.jsx` | Yjs sync |
| `server.js` | WebSocket relay |

## 8. Existing Uncommitted Changes (Preserve!)
Modified tracked files (from `git status`):
- `package.json`, `package-lock.json` (dependencies)
- `src/App.jsx` (stage routing)
- `src/components/builder/NetworkBuilder.jsx` (builder updates)
- `src/components/home/HomeScreen.jsx` (home screen)
- `src/components/simulation/SimulationStage.jsx` (simulation mode toggle)
- `src/engine/graph/graphModel.js` (ARP/MAC/routing)
- `src/engine/simulation/simulationEngine.js` (trace engine)
- `src/index.css` (simulation styles)
- `src/state/gameStore.js` (state additions)

Untracked (new simulation system — **do not delete**):
- `src/components/simulation/AnimatedNetworkSimulation.jsx`
- `src/components/simulation/SimPlaybackToolbar.jsx`
- `src/components/simulation/SimTimeline.jsx`
- `src/components/simulation/SimInspector.jsx`
- `src/components/simulation/SimDeviceNode.jsx`
- `src/components/simulation/SimLinkEdge.jsx`
- `src/components/simulation/AnimatedDeviceNode.jsx`
- `src/components/simulation/useJourneyPlayback.js`
- `src/components/simulation/faultInjection.js`
- `src/components/simulation/graphLayout.js`
- `src/components/simulation/scaleResponse.js`
- `src/engine/simulation/journeyEventTypes.js`
- `src/engine/simulation/journeyEvents.js`
- `src/engine/simulation/journeyExplanations.js`
- `tests/journeyEvents.test.js`

## 9. What Was Investigated
- Full repository state (Git, dependencies, scripts)
- Application architecture (state, routing, engines, UI)
- Simulation engine (tracePacket, applyEvent, L2/L3/SDN)
- Animated journey (event generation, playback, timeline, inspector)
- Fault injection (link-down, missing-route, policy-deny, divergence)
- Collaboration (Yjs, WebSocket, IndexedDB)
- Tests (all 56 passing) and build

## 10. What Was Changed During Audit
- **No source code changes made** — audit was read-only
- Created documentation: `PROJECT_STATE.md`, `IMPLEMENTATION_STATUS.md`, `NEXT_STEPS.md`, `AGENT_HANDOVER.md`

## 11. What Remains Unverified
- WebSocket server + 2-client collaboration
- Full scenario E2E (small-office → results)
- Practice Lab persistence across sessions
- Random Challenge mode
- Browser performance on large topologies
- Accessibility (reduced motion, keyboard nav)

## 12. Recommended First Task for Next Agent
**WebSocket Collaboration Server Integration Test (P0 #1)**

```bash
# Terminal 1
node server.js

# Terminal 2  
npm run dev

# Open two tabs with same ?project= URL
# Verify connection indicator turns green
# Drag node in tab A → appears in tab B
```

**If blocked**: Document exact error, check port 1234, check Yjs version compatibility.

## 13. Explicit Instructions — DO NOT
- ❌ Run `git reset --hard` or `git clean -fd`
- ❌ Delete untracked files (new simulation system)
- ❌ Replace complete source files without justification
- ❌ Reset browser storage or change project IDs
- ❌ Rewrite architecture or install new dependencies
- ❌ Start implementing animation feature (P3) before P0/P1
- ❌ Commit, push, or publish without explicit request

## 14. Handover Documents (Read in Order)
1. **AGENT_HANDOVER.md** (this file) — start here
2. **PROJECT_STATE.md** — architecture & verified features
3. **IMPLEMENTATION_STATUS.md** — feature-by-feature table
4. **NEXT_STEPS.md** — prioritized roadmap with acceptance criteria

---

**Project directory**: `/home/abhaysawant/Desktop/SDN-NFV_sim`  
**Git remote**: `https://github.com/abhayshravan357-sudo/network-architecture-lab/`  
**Dev URL**: `http://localhost:5173/network-architecture-lab/`  
**Last audit**: 2026-10-11 — all tests passing, build successful