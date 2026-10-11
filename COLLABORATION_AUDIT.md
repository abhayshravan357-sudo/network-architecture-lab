# COLLABORATION AUDIT & MIGRATION PLAN
## SDN/NFV Architecture Lab — Hybrid GitHub-Style Workflow

**Date**: 2026-10-11  
**Status**: Phase 1 Complete — Audit & Analysis

---

## PHASE 1 — AUDIT FINDINGS

### Current Implementation Summary

| Component | Status | Details |
|-----------|--------|---------|
| **Yjs + y-websocket** | ✅ Verified | `src/collaboration/CollaborationProvider.jsx` - full CRDT sync |
| **WebSocket Server** | ✅ Verified | `server.js` - room-based Yjs protocol (sync/awareness) |
| **IndexedDB Persistence** | ✅ Verified | `y-indexeddb` per-project offline storage |
| **Project Identity** | ✅ Verified | URL `?project=<uuid>` - auto-generated, persists in history |
| **State Management** | ✅ Verified | Zustand (`gameStore.js`) with localStorage persistence |
| **Topology Serialization** | ✅ Verified | `rfNodes`/`rfEdges` (ReactFlow) + `graph` (semantic) |
| **Live Sync** | ⚠️ Partial | Works but causes freeze loops (fixed in latest commit) |
| **Peer Awareness** | ✅ Verified | Shows `+N other(s)` in top nav via Yjs awareness |
| **Tests** | ✅ Verified | 56 tests pass (no collaboration-specific tests) |

### Data Model (what gets synced)

```javascript
// Zustand persist (localStorage 'nal-game-state')
{
  currentStage, gameMode, activeScenarioId,
  planningAnswers, hintsUsed, quizScore,
  network: { rfNodes, rfEdges, graph: { nodes, edges }, remainingResources },
  validationResult,
  scores: { planning, architecture, connectivity, segmentation, routing, services, security, scalability, sdn, nfv, orchestration, simulation, overall },
  sdnState: { controllerPlaced, policies, flowRules, policyFlows, failedEdgeId, reroute, sdnEvents, activeTrafficTest },
  nfvState: { deployments: [{id, vnfId, hostNodeId, resources}], serviceChain },
  orchestrationState: { instances, actions, load },
  simulationState: { events, graphAfter }
}
```

### Network Graph (semantic model for validation/simulation)
```javascript
// NetworkGraph class (graphModel.js)
{
  nodes: [{ id, type, config: { interfaces, ip, vlans, services, ... } }],
  edges: [{ id, source, target, connectionType }],
  // ARP caches, MAC tables (runtime only)
}
```

### What Yjs Currently Syncs (via `window.__syncToYjs`)
- `rfNodes[]` — ReactFlow nodes (position, type, data.config)
- `rfEdges[]` — ReactFlow edges (source, target, style)
- **Bidirectional** — remote changes → Zustand → UI

### Current Limitations
1. **Single shared document** — all users edit same Yjs doc (Google Docs mode)
2. **No version history** — no revisions, no diff, no merge
3. **No conflict resolution** — last-write-wins via CRDT
4. **Server required for sync** — offline works via IndexedDB but no peer-to-peer
5. **Project ID = room name** — no access control, anyone with URL joins
6. **No working copy isolation** — changes immediately sync to all peers

---

## PHASE 2 — ARCHITECTURE: TWO MODES

### Mode A: Independent Working Copies (Default)
```
User A                          User B
┌─────────────────┐             ┌─────────────────┐
│ Working Copy A  │             │ Working Copy B  │
│ (localStorage)  │             │ (localStorage)  │
│                 │             │                 │
│ Edit freely     │             │ Edit freely     │
│ Save revisions  │             │ Save revisions  │
└────────┬────────┘             └────────┬────────┘
         │                               │
         │  Propose Changes (export)     │
         └──────────────┬────────────────┘
                        ▼
              ┌─────────────────┐
              │ Central Project │
              │ (optional remote)│
              │ - Revisions     │
              │ - Proposals     │
              │ - Merge queue   │
              └─────────────────┘
```

### Mode B: Optional Live Session (Explicit Opt-In)
- User clicks "Start Live Session" → joins Yjs room
- Real-time cursor/presence via awareness
- Edits sync immediately (current behavior)
- **Isolated from working copies** — live session has its own Yjs doc
- Exit session → optionally save as revision

---

## PHASE 3 — VERSIONED PROJECT STATE MODEL

### Core Entities

```typescript
// Stable project identity
interface ProjectIdentity {
  projectId: string;           // UUID, immutable
  name: string;                // Human-readable
  owner: string;               // User ID (future)
  createdAt: number;
  updatedAt: number;
}

// A saved snapshot (immutable)
interface ProjectRevision {
  revisionId: string;          // UUID
  projectId: string;
  parentRevisionId: string | null;
  branchName: string;          // "main", "feature-xyz", etc.
  message: string;             // Commit message
  author: string;
  timestamp: number;
  data: ProjectData;           // Full serialized state
  metadata: {
    deviceCount: number;
    linkCount: number;
    stagesCompleted: string[];
    validationScore: number;
  };
}

// Working copy (mutable, per-user)
interface WorkingCopy {
  workingCopyId: string;
  projectId: string;
  userId: string;
  baseRevisionId: string;      // Revision this copy started from
  branchName: string;
  data: ProjectData;           // Current uncommitted state
  unsavedChanges: boolean;
  lastSaved: number | null;
}

// Change proposal (like a PR)
interface ChangeProposal {
  proposalId: string;
  projectId: string;
  sourceWorkingCopyId: string;
  targetRevisionId: string;    // Usually latest on main
  title: string;
  description: string;
  author: string;
  status: 'open' | 'merged' | 'rejected' | 'conflict';
  createdAt: number;
  updatedAt: number;
  diff: ProjectDiff;           // Semantic diff
  mergedRevisionId?: string;
}

// Semantic diff (not raw JSON)
interface ProjectDiff {
  devices: { added: Device[], removed: Device[], modified: DeviceChange[] };
  links: { added: Link[], removed: Link[], modified: LinkChange[] };
  ipAddresses: IPChange[];
  routing: RoutingChange[];
  sdn: SDNChange[];
  nfv: NFVChange[];
  orchestration: OrchestrationChange[];
  metadata: { summary: string; breakingChanges: boolean; };
}
```

### What Goes in a Revision (ProjectData)

| Category | Included | Rationale |
|----------|----------|-----------|
| Nodes & Links | ✅ Yes | Core topology |
| Device Config (IP, VLAN, interfaces) | ✅ Yes | Network behavior |
| Scenario & Resource Pool | ✅ Yes | Context |
| SDN Policies & Flow Rules | ✅ Yes | Control plane |
| NFV Deployments & Service Chain | ✅ Yes | Data plane |
| Orchestration Instances & Load | ✅ Yes | Lifecycle |
| Validation Results | ✅ Yes | Historical record |
| Scores | ✅ Yes | Progress tracking |
| Simulation Events | ❌ No | Transient, re-runnable |
| UI State (selected tab, viewport) | ❌ No | Personal preference |
| ARP/MAC caches | ❌ No | Runtime only |

---

## PHASE 4 — SEMANTIC DIFF STRATEGY

### Diff Algorithm (per entity type)

1. **Devices** — Compare by stable `id`
   - Added: in new but not old
   - Removed: in old but not new
   - Modified: same id, different `type` or `config`

2. **Links** — Compare by stable `id` (or source+target)
   - Added/Removed/Modified similarly

3. **IP Addresses** — Extract all IPs from device configs
   - Track per-device: added/removed/changed

4. **Routing** — Compare `graphModel.getRoutersSpanning()` results
   - Router interface changes, subnet changes

5. **SDN** — Compare `sdnState.policies[]` and `flowRules[]`
   - Policy add/remove/modify, rule priority changes

6. **NFV** — Compare `nfvState.deployments[]` and `serviceChain[]`
   - VNF add/remove, chain reorder, host changes

7. **Orchestration** — Compare instances, actions, load config

### Diff UI (progressive enhancement)
- **Phase 1**: JSON text diff (baseline, always works)
- **Phase 2**: Semantic summary cards ("Added Firewall", "Changed PC1 IP")
- **Phase 3**: Visual topology diff (highlight on canvas)

---

## PHASE 5 — MERGE BEHAVIOR

### Three-Way Merge (Base → Source → Target)

```
          Base (common ancestor)
         / \
        /   \
   Source   Target
    (PR)    (main)
        \   /
         \ /
      Merged Result
```

### Conflict Detection Rules

| Conflict Type | Detection | Resolution |
|--------------|-----------|------------|
| Same device, different config | Both modified `config` | Manual pick |
| Same link, different endpoints | Both modified `source`/`target` | Manual pick |
| Device deleted in one, modified in other | Existence mismatch | Manual pick |
| IP address collision | Two devices claim same IP | Auto-reject (invalid) |
| Duplicate IDs | Same ID generated both sides | Auto-regenerate |
| Invalid topology | Post-merge validation fails | Reject with errors |

### Safe Merge Algorithm (v1)
1. Compute diff(Base → Source) and diff(Base → Target)
2. For each entity: if only one side changed → accept
3. If both sides changed same entity → CONFLICT
4. Apply non-conflicting changes to Target
5. Validate merged topology (NetworkGraph invariants)
6. If valid → create new revision; if invalid → reject with reasons

---

## PHASE 6 — REUSE EXISTING LIVE COLLABORATION

### What to Keep
- `CollaborationProvider.jsx` — Yjs + WebSocket + IndexedDB
- `server.js` — WebSocket relay with Yjs protocol
- `useCollaboration()` hook — connection status, peer count
- Awareness for presence (cursors, selections)

### What to Adapt
- **Project ID ≠ Room Name** — Live sessions get separate room: `live-{sessionId}`
- **Working copies stay in localStorage** — Only live session uses Yjs
- **Export/Import** — Working copy ↔ Live session via JSON

### Migration Path
1. Keep current `CollaborationProvider` for live sessions
2. Add `ProjectManager` for working copies + revisions
3. Add "Start Live Session" button that spins up temporary Yjs doc
4. On session end → "Save as Revision" option

---

## PHASE 7 — SECURITY & PERSISTENCE

### Current Assumptions (to Document)
- Project ID in URL = authorization (no auth)
- localStorage = per-browser, not cross-device
- WebSocket server = optional, local dev only
- No credentials in project data

### Required for GitHub-Style
| Feature | Implementation |
|---------|----------------|
| User Identity | Anonymous ID (stored in localStorage) + optional name |
| Project Ownership | First creator = owner (stored in revision metadata) |
| Read Access | Anyone with project ID + revision ID |
| Write Access | Owner + explicit collaborators (future) |
| Remote Storage | Optional: export/import JSON files first |

---

## PHASE 8 — TEST PLAN

| Test | Description |
|------|-------------|
| `createWorkingCopy` | New copy from revision has isolated state |
| `editIsolation` | Edit copy A, copy B unchanged |
| `saveRevision` | Revision persisted, metadata recorded |
| `loadRevision` | Restore working copy from revision |
| `semanticDiff` | Detect added/removed/modified devices, links, IPs |
| `conflictDetection` | Same device modified both sides → conflict |
| `safeMerge` | Non-conflicting changes merge cleanly |
| `invalidMergeRejected` | Post-merge validation catches bad topology |
| `liveSessionIsolated` | Live session doesn't touch working copies |
| `offlineEdit` | Works without WebSocket server |
| `exportImport` | Round-trip preserves all config |

---

## PHASE 9 — MILESTONE PLAN

### Milestone 1: Independent Working Copies + Revisions (2-3 days)
- `ProjectManager` class: create/save/load/list revisions
- Working copy isolation (localStorage per-user)
- Revision metadata (message, author, timestamp)
- Basic UI: "Save Revision", "History" panel
- **No diff/merge yet** — just snapshots

### Milestone 2: Semantic Diff + Proposals (3-4 days)
- Diff engine for devices, links, IPs, SDN, NFV, orchestration
- Change proposal creation (like PR)
- Diff viewer UI (summary cards + JSON fallback)
- Proposal list in project

### Milestone 3: Safe Merge (2-3 days)
- Three-way merge with conflict detection
- Validation-gated acceptance
- Conflict resolution UI
- Merge creates new revision

### Milestone 4: Live Session Integration (2 days)
- "Start Live Session" button
- Temporary Yjs doc for session
- On exit → "Save as Revision" prompt
- Presence/cursors work in session

### Milestone 5: Remote Sync (Optional, Future)
- Backend for revision storage
- User accounts, project sharing
- Webhooks, notifications

---

## RECOMMENDED FIRST MILESTONE

**Milestone 1: Independent Working Copies + Saved Revisions**

### Why
- Lowest risk — builds on existing Zustand + localStorage
- Immediate value — users can save versions, experiment safely
- Foundation for diff/merge
- No server changes needed

### Files to Create
1. `src/collaboration/ProjectManager.js` — core logic
2. `src/components/ui/RevisionHistory.jsx` — UI panel
3. `src/components/ui/RevisionViewer.jsx` — inspect revision
4. Tests: `tests/projectManager.test.js`

### Files to Modify
1. `src/state/gameStore.js` — add `workingCopyId`, `baseRevisionId`
2. `src/components/builder/NetworkBuilder.jsx` — "Save Revision" button
3. `src/App.jsx` — integrate history panel

### Acceptance Criteria
- [ ] User can "Save Revision" with message
- [ ] Revision appears in history panel
- [ ] User can "Load Revision" → working copy restored
- [ ] Two browser tabs with same project ID → independent edits
- [ ] Reload browser → working copy persists
- [ ] All existing tests pass
- [ ] Build succeeds

---

## RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Zustand + Yjs state conflicts | Medium | High | Strict mode separation (live vs local) |
| Revision storage bloat | Low | Medium | Compress, limit history, cleanup |
| Invalid merge corrupts project | Medium | High | Validate before accept, keep originals |
| User confusion: two modes | Medium | Medium | Clear UI labeling, docs |
| Loss of live-sync work | Low | Medium | Auto-save session state to revision |

---

## CONCLUSION

The existing Yjs/WebSocket/IndexedDB implementation is solid for **live collaboration** but implements the wrong default model (Google Docs vs GitHub). 

**Recommendation**: Keep it for Mode B (live sessions), build Mode A (independent copies + revisions) as new layer on top of Zustand/localStorage. This preserves all existing work while delivering the GitHub-style workflow users need.

**Next Step**: Implement Milestone 1 (ProjectManager + Revision History). Ready to begin when approved.