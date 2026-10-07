# Phase 2.5 — React Flow + Topology Architecture Audit

**Date:** 2026-10-07
**Scope:** Verify the architecture builder is structurally correct before any further UI redesign or feature work (per development strategy: Phase 2.5 hardens the topology foundation before routers/VLANs/SDN/NFV are extended).

---

## 0. Executive summary

The audit found **one critical architectural defect** and several medium gaps.

> **CRITICAL: The React Flow canvas and the topology model are two separate stores of truth that only synchronize on a single button click.**

The builder keeps the live topology in **local component state** (`useNodesState`/`useEdgesState` in `NetworkBuilder.jsx`). The game store's `network.graph` (the model every engine reads) is rebuilt **only when the student clicks "Validate Architecture"**. Everything else — deleting a device, deleting a link, editing a name/IP/VLAN — exists only in local state and is silently lost on stage navigation.

Empirically verified headlessly:

| Interaction | Canvas | Store (`network`) | Verdict |
|---|---|---|---|
| Press Backspace on selected node | node removed (23→22) | still 23 nodes / 23 edges | **BROKEN** |
| Press Delete on selected edge | edge removed | still 23 edges | **BROKEN** |
| Edit device label in config panel | shows "Renamed-Device" | still "Internet" | **BROKEN** |
| Drag node, navigate away, return | position reset | old position | **LOST WORK** |

This is exactly the failure mode the Phase 2.5 audit was commissioned to find: React Flow *is* being used as the canvas correctly, but the topology/device interaction model around it is too primitive, and the model is not the source of truth.

---

## 1. Environment verification (corrects stale assumptions)

| Item | Assumed | Actual |
|---|---|---|
| React Flow | ^11.6.2 | **^11.11.4** |
| Zustand | ^5.0.8 | **^5.0.15** |
| React | — | ^18.3.1 |
| Vite | — | ^5.4.10 |
| SDN / NFV / orchestration engines | "static placeholders" | **Real deterministic engines** — node-runnable, smoke-tested (SDN: 29 flow rules, 6 reroutes, 0 unreachable; NFV/orchestration/simulation scoring = 100 on the reference topology). End-to-end headless journey passes 13 stages with zero console/page errors. |

---

## 2. The two-systems finding (most important structural fact)

The repository contains **two disconnected React Flow systems**:

### System A — Legacy lab MVP (Phase 2, UNROUTED / dead code)
- `src/engine/topology/topologyModel.js` — mutable function-based model; links are `{ source: {deviceId, port: 'eth0'}, target: {...} }` with **hardcoded eth0 ports**, no interfaces, no VLANs, no subnets, no routes
- `src/state/topologyStore.js` — a second Zustand store (mission/XP/ping state)
- `src/engine/simulation/{ping,arp,icmp}.js`, `src/engine/cli/cliEngine.js`
- `src/components/{TopologyCanvas,DevicePalette,InspectorPanel,PingPanel,EventLogPanel,DeviceConsole,ConsolePanel,MissionPanel,PacketAnimation}.jsx`
- `src/data/missions/01-first-ping.json`
- **None of these are imported by `App.jsx`** — unreachable from the product. The "Practice Lab" mode currently shows "coming soon".

### System B — Active game flow (Phases 3–9, what the product runs)
- `src/engine/graph/graphModel.js` — `NetworkGraph` class (pure, no React): nodes `{id, type, config}`, edges `{id, source, target, connectionType}`; BFS/reachability/path/VLAN/firewall queries
- `src/state/gameStore.js` — single game store; `network.graph` is the model every engine consumes
- `src/components/builder/NetworkBuilder.jsx` + `DeviceNode.jsx` — the React Flow canvas
- Engines: validation, sdn, nfv, orchestration, simulation — all consume `NetworkGraph.fromJSON(graphData)`

**The separation the roadmap asks for (React Flow → topology model → network engine) already exists in System B.** The defect is the synchronization layer between the canvas and the model, plus the primitive link/device schema.

**Recommendation:** System A is a dead-end foundation (weaker model, separate store). The future Practice Lab should be built on `NetworkGraph` + `gameStore`, not resurrected. Removing System A is a cleanup decision deferred to the repository-cleanup phase (this audit does not delete it).

---

## 3. 18-point audit checklist

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | React Flow version | ✅ ^11.11.4 | package.json |
| 2 | Zustand version | ✅ ^5.0.15 | package.json |
| 3 | Topology store | ⚠️ **Two stores** | `gameStore` (active) + `topologyStore` (dead lab) |
| 4 | Topology model | ⚠️ **Two models** | `NetworkGraph` (active, pure class) + `topologyModel` (dead, mutable fns) |
| 5 | React Flow node model | ✅ | `DeviceNode` custom node, `nodeTypes` memoized |
| 6 | React Flow edge model | ⚠️ primitive | `{id, source, target, connectionType}` — no interface endpoints, medium, speed, status |
| 7 | Device components | ✅ | DeviceNode with asset icons, type badge, label, IP |
| 8 | Connection/handle implementation | ⚠️ | Fixed top/bottom handles; **`allowedConnections` from the device catalog is not enforced on the canvas** (PC→PC links are possible) |
| 9 | Drag/drop implementation | ✅ | HTML5 drag from palette, `screenToFlowPosition` on drop |
| 10 | Device selection | ✅ | Click-to-select works (verified: `.selected` class) |
| 11 | Device deletion | ⚠️ **half-broken** | React Flow built-in delete key removes nodes+edges from canvas, **but the store is not updated** |
| 12 | Edge deletion | ⚠️ **half-broken** | Same as above |
| 13 | State synchronization | ❌ **critical gap** | One-way, one-shot: local state → store only on "Validate Architecture" click |
| 14 | Ping engine integration | ℹ️ | `runPing`/ARP/ICMP exist but only serve the dead lab system; the game flow has no interactive ping (simulation stage runs events instead) |
| 15 | Validation integration | ✅ | `ValidationEngine` runs against `network.graph` on Validate; 8/8 checks pass on reference topology |
| 16 | Asset loading | ✅ | 67 assets in `src/assets/assetMap.js`, all resolve 200, zero broken images across all stages |
| 17 | Console/runtime errors | ✅ | Full-journey headless E2E: zero pageerrors, zero console errors, zero 4xx/5xx responses |
| 18 | Build | ✅ | `vite build` passes (dist ~160 kB gzip 51 kB entry) |

---

## 4. Additional defects found

- **D1 — Lost work on navigation:** because sync happens only at Validate, any edit/deletion is lost if the student leaves the builder before validating.
- **D2 — Positions dropped from the model:** `handleValidate` maps nodes to `{id, type, config}` — canvas coordinates are discarded, so the engine-facing graph has no layout (matters for future simulation visualization).
- **D3 — Collision-prone node IDs:** `onDrop` uses `${type}-${Date.now()}` — two devices dropped in the same millisecond produce duplicate IDs.
- **D4 — Primitive link schema (roadmap gap):** no `sourceInterface`/`targetInterface`, no `medium` (ethernet/fiber/wireless), no `speed`, no `status`. The device catalog already defines `allowedConnectionTypes` and `allowedConnections` — the data exists, the link model doesn't carry it.
- **D5 — Device schema is a config bag:** `{id, type, config: {label, ip, vlans, ...}}` — no formal `interfaces[]`, no `runtimeState`. This is the Phase 3 extension point (routers/interfaces/subnets), not a Phase 2.5 repair.

---

## 5. Phase 2.5 repair plan (executed)

Repairs are **backward-compatible**: the engine contracts (`NetworkGraph.fromJSON({nodes, edges})`) are unchanged; engines ignore the new optional fields.

- **R1 — Live model synchronization (fixes the critical defect):** every canvas change (drag, connect, delete, drop, config edit) is coalesced and committed to `gameStore.network` (rfNodes, rfEdges, **and** the engine-facing `graph`) on the next microtask. The model is now the source of truth; the canvas renders from it on mount.
- **R2 — Connection rule enforcement:** React Flow `isValidConnection` enforces the device catalog's `allowedConnections` (checked bidirectionally). Invalid links (e.g. PC→PC, PC→Cloud) can no longer be drawn.
- **R3 — Link schema extension:** edges now carry `medium`, `speed`, `status` (defaults `ethernet` / `1Gbps` / `up`). First step toward the interface-level link model; all engines remain compatible.
- **R4 — Position preservation:** graph nodes now carry `x`/`y` from the canvas.
- **R5 — Unique node IDs:** monotonically increasing counter replaces `Date.now()`.

### Verification after repair
- `vite build` passes
- Full 13-stage headless E2E passes with zero errors
- Interaction re-test: keyboard deletion and config edits now propagate to the store immediately

---

## 6. Deferred to Phase 3+ (explicitly out of scope for 2.5)

- Interface-level device model (`interfaces[]` with port/MAC/IP/subnet), VLAN entities with port assignments, subnet/route entities — the full model extension the roadmap describes. Requires touching every engine; must be its own phase.
- Interactive ping in the game flow (currently only the dead lab system has it).
- Practice Lab mode — rebuild on `NetworkGraph` + `gameStore` when the mode is un-deferred.
- Removal of the legacy lab system (System A) — repository cleanup phase.
- Homepage/visual redesign — **explicitly blocked until this audit's repairs are verified** (now done).
