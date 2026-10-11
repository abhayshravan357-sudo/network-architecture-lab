# Next Steps — SDN/NFV Architecture Lab

## P0 — Application Recovery (Blocking Issues)

### 1. WebSocket Collaboration Server Integration Test
**Why**: Collaboration shows "disconnected" in top nav; two-user editing untested.
**Files**: `server.js`, `src/collaboration/CollaborationProvider.jsx`
**Dependencies**: Node.js, `ws` package
**Acceptance**: 
- Start `node server.js` → "Yjs WebSocket server running on port 1234"
- Open two browser tabs with same `?project=` URL
- Drag node in tab A → appears in tab B within 500ms
- Reload tab B → topology persists from IndexedDB
**Tests needed**: Manual 2-session test; add integration test if feasible
**Risks**: Port conflicts, firewall, Yjs version mismatch

### 2. Verify Blank-Screen Regression Fixed
**Why**: Historical report of `ReferenceError: showComparison is not defined`
**Files**: `src/components/simulation/SimulationStage.jsx`
**Dependencies**: None
**Acceptance**: 
- Run dev server, navigate to Simulation stage
- Switch between "Event-Driven" and "Animated Network Journey" modes
- No console errors, both modes render
**Verification**: `showComparison` variable NOT present in current code — confirmed fixed
**Risks**: None (already resolved in current codebase)

---

## P1 — Reliability (Core Workflow Bugs)

### 3. Connection Validation in Builder
**Why**: Users can create invalid connections (e.g., PC ↔ PC, Cloud ↔ PC)
**Files**: `src/components/builder/NetworkBuilder.jsx`, `src/data/devices/deviceCatalog.js` (allowedConnections)
**Dependencies**: ReactFlow `onConnect` handler
**Acceptance**: 
- Invalid connection attempt shows toast/error
- Valid connections per catalog succeed
- Edge cases: wireless laptop ↔ AP, router ↔ cloud
**Tests needed**: Unit test for `allowedConnections` logic
**Risks**: Over-restriction breaks creative topologies

### 4. Resource Pool Enforcement
**Why**: Scenario resource limits not enforced during build
**Files**: `src/components/planning/ResourcePool.jsx`, `NetworkBuilder.jsx`
**Dependencies**: `gameStore` remainingResources
**Acceptance**: 
- Cannot drag more devices than pool allows
- Pool updates in real-time as devices added/removed
- Practice Lab has unlimited pool
**Tests needed**: Integration test for pool decrement/increment

### 5. Simulation Event Re-computation
**Why**: `applyEvent` returns new graph but UI doesn't auto-refresh trace
**Files**: `src/components/simulation/SimulationStage.jsx` (handleRunEvent)
**Dependencies**: `tracePacket`, `simulationEngine.js`
**Acceptance**: 
- Trigger event → trace re-runs automatically if traceFrom/traceTo set
- Event log shows new graph state
**Tests needed**: Test trace after event injection

---

## P2 — Educational Correctness (Simulation Gaps)

### 6. ARP/MAC Cache Persistence Across Traces
**Why**: Current trace simulates ARP but cache resets each trace
**Files**: `src/engine/graph/graphModel.js` (_arpCaches, _macTables)
**Dependencies**: `tracePacket` creates fresh `NetworkGraph` each call
**Acceptance**: 
- Second trace between same endpoints shows "from cache" ARP
- MAC learning persists across traces in same session
**Implementation**: Pass caches to `tracePacket` or reuse graph instance
**Tests needed**: Test "warm cache" trace behavior

### 7. Cross-Subnet ARP via Gateway
**Why**: `resolveMac` returns gateway MAC for off-subnet, but trace shows direct
**Files**: `src/engine/simulation/simulationEngine.js` (traceL2Path, traceL3Routing)
**Dependencies**: `graphModel.js` resolveMac
**Acceptance**: 
- Trace shows ARP for gateway IP when dest off-subnet
- L3 routing step references gateway MAC
- Evidence string explains gateway resolution
**Tests needed**: Add test for cross-subnet ARP in trace

### 8. VNF Processing Explanations Accuracy
**Why**: Inspector says "packet rewriting not modeled" but doesn't explain what IS modeled
**Files**: `src/engine/simulation/journeyExplanations.js` (VNF_PROCESSING_COMPLETED)
**Dependencies**: `journeyEvents.js` detail object
**Acceptance**: 
- Explanation lists: placement verified, chain order enforced, resources allocated
- "Try this" suggests reordering chain or moving VNF
**Tests needed**: Manual verification of Inspector text

### 9. SDN Control Plane Visualization
**Why**: Control plane edges (controller ↔ switch) shown but no packet-in animation
**Files**: `src/components/simulation/AnimatedNetworkSimulation.jsx` (control edges), `journeyEvents.js` (TABLE_MISS, CONTROLLER_REQUEST, FLOW_RULE_INSTALLED)
**Dependencies**: Playback system
**Acceptance**: 
- On table miss: animated packet-in to controller
- Controller → switch: flow rule install animation
- Subsequent hop: flow table hit (no controller)
**Tests needed**: Visual verification of control plane events

---

## P3 — Animation (End-to-End Journey)

### 10. Journey Mode: Multiple Packet Flows
**Why**: Current journey runs single source→dest; real networks have concurrent flows
**Files**: `src/components/simulation/AnimatedNetworkSimulation.jsx`, `journeyEvents.js`
**Dependencies**: Playback system supports single run
**Acceptance**: 
- "Run multiple flows" button queues traces
- Timeline shows interleaved events per flow
- Color-coding per flow ID
**Implementation**: Extend `buildJourneyRun` to accept flow array; merge event streams by timestamp

### 11. Journey Mode: Failure Animation
**Why**: Fault injection runs separate comparison; not integrated into journey playback
**Files**: `AnimatedNetworkSimulation.jsx` (faultRun), `faultInjection.js`
**Dependencies**: Divergence detection
**Acceptance**: 
- "Animate faulty journey" plays both baseline + faulty with divergence highlight
- Pause at divergence point with explanation
**Tests needed**: Visual test with link-down fault

### 12. Reduced Motion / Accessibility
**Why**: `usePrefersReducedMotion` hook exists but not fully tested
**Files**: `useJourneyPlayback.js`, `AnimatedNetworkSimulation.jsx`
**Dependencies**: OS prefers-reduced-motion setting
**Acceptance**: 
- With reduced motion: instant jumps between events, no animation
- Timeline still navigable via keyboard
- All explanations accessible
**Tests needed**: Manual test with OS setting

---

## P4 — Enhancements

### 13. Additional Fault Types
**Why**: Current faults: link-down, missing-route, policy-deny
**Files**: `src/components/simulation/faultInjection.js` (FAULT_TYPES)
**Ideas**: 
- `controller-down` (SDN controller unreachable)
- `vnf-crash` (orchestration instance removed)
- `bandwidth-exhausted` (link capacity exceeded)
- `vlan-mismatch` (trunk vs access port)
**Acceptance**: Each fault modifies real config, re-computes trace, shows divergence

### 14. Scenario Expansion
**Why**: Only 5 scenarios; need enterprise, data center, service provider
**Files**: `src/data/scenarios/*.js`
**Ideas**:
- Hospital (medical devices, VLANs, guest network)
- University campus (multi-building, wireless, eduroam)
- Branch office (WAN, VPN, SD-WAN)
- Cloud migration (hybrid, load balancer, auto-scale)

### 15. Export/Import Project
**Why**: Share designs outside browser localStorage
**Files**: `gameStore.js` (exportJSON/importJSON)
**Acceptance**: 
- "Export project" → downloads JSON
- "Import project" → file picker → loads state
- Validates schema version

### 16. Browser Automation Tests
**Why**: No E2E test coverage for critical user flows
**Dependencies**: Playwright or Cypress
**Acceptance**: 
- Complete small-office scenario headless
- Verify validation passes
- Run journey mode, verify delivery
**Risks**: Flaky tests, CI complexity

---

## Recommended First Task for Next Agent

**Task**: **WebSocket Collaboration Server Integration Test (P0 #1)**

**Reason**: 
- Highest user-visible impact (collaboration shown as "disconnected")
- Quick to verify (5 min manual test)
- Unblocks multi-user workflows
- If broken, fix is isolated to server/client config

**Steps**:
1. `node server.js` in terminal 1
2. `npm run dev` in terminal 2
3. Open `http://localhost:5173/network-architecture-lab/?project=test123` in two tabs
4. Verify connection indicator turns green
5. Drag device in tab A → confirm appears in tab B
6. Document any errors

**If blocked**: Document exact error, check port 1234, check Yjs client/server version compatibility.

---

## Notes for Next Agent
- **Do not** reset Git, delete files, or rewrite architecture
- **Do not** start animation feature (P3) until P0/P1 complete
- **Preserve** all untracked files — they are the new simulation system
- **Run tests first** (`npm test`) to confirm baseline
- **Check** `PROJECT_STATE.md` and `IMPLEMENTATION_STATUS.md` before making changes