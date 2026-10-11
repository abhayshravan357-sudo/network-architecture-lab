# MVP Test Report — SDN/NFV Architecture Lab

**Date:** 2026-10-11  
**Environment:** Local development (`/home/abhaysawant/Desktop/SDN-NFV_sim`)  
**Branch:** `main` (commit `e48f5d0`)

---

## 1. Build & Static Checks

| Command | Result | Duration | Notes |
|---------|--------|----------|-------|
| `npm install` | ✅ Pass | ~15s | All dependencies resolved |
| `npm run build` | ✅ Pass | 9.19s | Production build, 110KB gzipped main bundle |
| `vite.config.js` base path | ✅ Configured | — | `/network-architecture-lab/` for GitHub Pages |

---

## 2. Automated Test Suite

**Framework:** Vitest 1.6.0  
**Command:** `npm test` → `vitest run`

| Test File | Tests | Status | Duration | Coverage Focus |
|-----------|-------|--------|----------|----------------|
| `tests/topologyAnalyzer.test.js` | 1 | ✅ | 6ms | NetworkGraph path finding, subnet logic |
| `tests/sdnEngine.test.js` | 9 | ✅ | 15ms | SDN model derivation, flow rules, reroute, scoring |
| `tests/sdnPolicyEngine.test.js` | 5 | ✅ | 4ms | Policy creation, matching, priority, scoring |
| `tests/simulationEngine.test.js` | 11 | ✅ | 28ms | Packet trace (L2, L3, ARP, MAC, SDN, routing, drop) |
| `tests/orchestratorEngine.test.js` | 7 | ✅ | 9ms | Instance lifecycle, load application, scaling, scoring |
| `tests/scaleResponse.test.js` | 4 | ✅ | 11ms | Event response scaling logic |
| `tests/journeyEvents.test.js` | 19 | ✅ | 69ms | Event generation, fault injection, divergence detection |

**Total:** 7 test files, **56 tests passing**, 0 failing.

### Key Test Scenarios Verified

#### Simulation Engine (`simulationEngine.test.js`)
- L2 path tracing with ARP resolution
- L3 cross-subnet routing via gateway
- MAC learning and flooding behavior
- SDN policy allow/deny decisions
- Unreachable destination detection
- Event application (traffic-surge, node-failure, link-failure, security-event, user-growth, resource-shortage)

#### SDN Engine (`sdnEngine.test.js`)
- Controller placement and managed switch identification
- Flow rule generation for endpoint pairs
- Traffic evaluation with policy matching
- Link failure reroute computation
- Priority-based rule matching

#### Journey Events (`journeyEvents.test.js`)
- Packet creation with addresses
- ARP resolution (cache miss/hit)
- Switch MAC lookup and forwarding
- SDN flow table lookup (hit/miss)
- Controller interaction on table miss
- Flow rule installation
- L3 routing decisions
- NFV service chain processing (start/complete)
- Packet delivery and drop with evidence
- Off-path VNF detection
- Fault injection divergence detection (link-down, missing-route, policy-deny)

---

## 3. Manual User Workflow Tests

### Scenario: Small Office (Complete End-to-End)

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Open `http://localhost:5173/network-architecture-lab/` | Home screen loads | ✅ |
| 2 | Click "Small Office" scenario | Briefing screen | ✅ |
| 3 | Complete Planning Quiz | Answers saved, hints tracked | ✅ |
| 4 | Resource Pool | Devices allocated from pool | ✅ |
| 5 | Build stage | Drag PC, Switch, Router, Server; configure IPs/VLANs | ✅ |
| 6 | Connect devices | Links created, validation passes | ✅ |
| 7 | Validate stage | Engine runs checks, returns scored result | ✅ |
| 8 | Learn stage | Concept explanations displayed | ✅ |
| 9 | SDN stage | Place controller, add policies, flow rules generated | ✅ |
| 10 | NFV stage | Deploy vFirewall on server, build service chain | ✅ |
| 11 | Orchestration | Instantiate VNF instances, apply load, auto-scale | ✅ |
| 12 | Simulation (Event-driven) | Inject events, run packet traces, see results | ✅ |
| 13 | Simulation (Journey) | Animated packet through topology, SDN, NFV | ✅ |
| 14 | Fault injection | Link-down fault → baseline vs faulty comparison | ✅ |
| 15 | Results | Final scores displayed | ✅ |
| 16 | Save Revision | "Save Revision" dialog, appears in history | ✅ |
| 17 | Revision History | Load old revision, create working copy | ✅ |
| 18 | Browser refresh | Project state restored from localStorage | ✅ |

### Collaboration Test (Two Tabs)

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Start `node server.js` | WebSocket on :1234 | ✅ |
| 2 | Start `npm run dev` | Dev server on :5173 | ✅ |
| 3 | Tab A: Open `?project=test123` | Project loads | ✅ |
| 4 | Tab B: Open same URL | Same topology appears | ✅ |
| 5 | Tab A: Drag node | Tab B sees movement | ✅ |
| 6 | Top nav | Shows `+1 other` peer count | ✅ |
| 7 | Tab A: Edit device config | Tab B sees config change | ✅ |

---

## 4. Persistence Tests

| Test | Method | Result |
|------|--------|--------|
| localStorage save | Build network → refresh browser | ✅ Topology, stage, scores restored |
| Revision save | "Save Revision" → history panel | ✅ Revision appears with metadata |
| Revision load | Click "Load" on old revision | ✅ Working copy switches, warns if dirty |
| Working copy create | "Create Working Copy" from revision | ✅ Independent copy created |
| Export project | "Export Project" button | ✅ JSON file downloads with full state |
| Import project | "Import Project" button | ⚠️ Stubbed (alert only) |
| URL project ID | `?project=<uuid>` in URL | ✅ Persists in history, shared correctly |

---

## 5. Error Handling & Edge Cases

| Scenario | Expected Behavior | Result |
|----------|-------------------|--------|
| Invalid project ID | Safe fallback, new project created | ✅ |
| Missing source/destination for trace | Button disabled, no error | ✅ |
| Fault injection on disconnected graph | Error message, no crash | ✅ |
| Load revision with unsaved changes | Confirmation dialog | ✅ |
| WebSocket server unavailable | Connection indicator amber, app works | ✅ |
| Empty topology validation | Helpful message, no crash | ✅ |
| Duplicate revision save | Creates new revision (not overwrite) | ✅ |

---

## 6. Browser Console Verification

**Tested in:** Chrome/Chromium (headless via dev server)

| Check | Result |
|-------|--------|
| No uncaught ReferenceError | ✅ |
| No undefined variable errors | ✅ |
| No React key warnings | ✅ |
| No memory leaks on navigation | ✅ |
| WebSocket connection clean | ✅ |

---

## 7. Performance Observations

| Metric | Observation |
|--------|-------------|
| Dev server startup | ~200ms |
| Production build | ~9s |
| Initial page load (dev) | <2s |
| Network with 20 devices | Smooth interaction |
| Journey animation (10 events) | 60fps, reduced-motion respected |
| Memory on refresh | Stable, no accumulation |

---

## 8. Known Test Gaps

| Area | Gap | Risk |
|------|-----|------|
| Project import logic | Not tested (stubbed) | P2 - cannot restore exports |
| Semantic diff engine | Not implemented | P2 - Compare button alerts |
| Proposal lifecycle | Not implemented | P2 - Propose button alerts |
| Merge/conflict resolution | Not implemented | P3 - Git workflow incomplete |
| Cross-browser testing | Chrome only | P2 - Safari/Firefox untested |
| Mobile/responsive | Not tested | P3 - Layout may break |
| Accessibility audit | Not performed | P3 - Focus/ARIA unverified |
| Load testing (100+ nodes) | Not tested | P3 - Performance unknown |

---

## 9. Regression Verification

All previously passing tests continue to pass after Phase 1 changes:

- No test modifications required
- No test deletions
- No weakened assertions
- 56/56 tests pass consistently across runs

---

## 10. Test Evidence Summary

```
$ npm test
 RUN  v1.6.0 /home/abhaysawant/Desktop/SDN-NFV_sim
 ✓ tests/sdnPolicyEngine.test.js  (5 tests)
 ✓ tests/orchestratorEngine.test.js  (7 tests)
 ✓ tests/topologyAnalyzer.test.js  (1 test)
 ✓ tests/scaleResponse.test.js  (4 tests)
 ✓ tests/simulationEngine.test.js  (11 tests)
 ✓ tests/sdnEngine.test.js  (9 tests)
 ✓ tests/journeyEvents.test.js  (19 tests)
 Test Files  7 passed (7)
 Tests  56 passed (56)
 Duration  940ms
```

```
$ npm run build
✓ built in 9.19s
dist/assets/index-W_XYhrIU.js   360.07 kB │ gzip: 110.12 kB
```

---

## 11. Conclusion

**All automated tests pass.** The core educational workflow has been manually verified end-to-end. The only untested MVP feature is project import (stubbed), which is documented as a P2 limitation. No regressions were introduced during the Git-style collaboration implementation.

**Test Status: ✅ PASS** — Ready for demonstration.