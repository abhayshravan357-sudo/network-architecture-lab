# Git-Style Collaboration — Implementation Plan

## Baseline (Verified)

| Item | Status |
|------|--------|
| Git branch | `main` |
| Working tree | 11 modified, 30+ untracked files |
| Build | ✅ Passes (Vite 5, ~8s) |
| Tests | ✅ 56/56 pass (Vitest) |
| Dev server | ✅ Running on :5173 |
| WebSocket server | ✅ Running on :1234 |
| Yjs collaboration | ✅ Working (fixed freeze, peer count shows) |

---

## Phase 0: Audit & Design (COMPLETE)

**Deliverables Created:**
- `COLLABORATION_AUDIT.md` — Architecture audit
- `GIT_COLLABORATION_UX.md` — UI/UX design with wireframes
- `GIT_COLLABORATION_ARCHITECTURE.md` — Data models, storage, diff/merge algorithms

**Key Decisions:**
- Dual-mode: Independent working copies (default) + Optional live sessions
- localStorage for Phase 1-4 (no backend)
- Complete snapshots (not deltas) for revisions
- Three-way merge with semantic diff
- UUIDs for all entity IDs
- Live sessions use separate Yjs docs (`live-{sessionId}`)

---

## Phase 1: Independent Working Copies & Revisions

**Objective**: Users can save named revisions, browse history, create working copies from any revision, and load revisions safely.

**Timeline**: 2-3 days

### Functionality

| Feature | Description |
|---------|-------------|
| **Project Identity** | Auto-create on first visit; store in `nal-projects-index` |
| **Working Copy** | Isolated copy of project state; edits don't affect original |
| **Save Revision** | Named snapshot with message, parent ref, metadata |
| **Revision History** | Chronological list with filter by branch |
| **Load Revision** | Switch working copy to revision (warn on unsaved changes) |
| **Restore as New** | Create new revision from old one (preserves history) |
| **Auto-save** | Working copy persisted every 30s to localStorage |

### Files to Create

| File | Purpose |
|------|---------|
| `src/collaboration/ProjectManager.js` | Core logic: create/save/load/list revisions, working copies |
| `src/collaboration/RevisionStore.js` | localStorage CRUD with atomic writes, compression |
| `src/components/ui/RevisionHistory.jsx` | History panel (slide-out modal) |
| `src/components/ui/SaveRevisionDialog.jsx` | Save revision form |
| `src/components/ui/CreateWorkingCopyDialog.jsx` | Working copy creation form |
| `src/components/ui/ProjectMenu.jsx` | Top-nav dropdown (replaces Share Project) |
| `tests/projectManager.test.js` | Unit tests for ProjectManager |

### Files to Modify

| File | Changes |
|------|---------|
| `src/state/gameStore.js` | Add `workingCopyId`, `baseRevisionId`, `projectId`, `branchName` to state |
| `src/App.jsx` | Integrate `ProjectMenu`, `RevisionHistory`; wire up callbacks |
| `src/components/builder/NetworkBuilder.jsx` | Add "Save Revision" button in toolbar |
| `src/collaboration/CollaborationProvider.jsx` | Add `projectId` to context; decouple from auto-sync |

### New Zustand State Additions
```javascript
// In gameStore.js initialState
projectId: null,           // Stable project UUID
workingCopyId: null,       // Current working copy UUID
baseRevisionId: null,      // Revision this copy started from
branchName: 'main',        // Branch name
unsavedChanges: false,     // Dirty flag
```

### Dependencies
- `uuid` package (or `crypto.randomUUID()`)
- `lz-string` for compression (optional, if localStorage quota issues)

### Tests Required

| Test | Description |
|------|-------------|
| `createWorkingCopy` | New copy from revision has isolated state |
| `editIsolation` | Edit copy A, copy B unchanged |
| `saveRevision` | Revision persisted with metadata |
| `loadRevision` | Restore working copy from revision |
| `historyOrdering` | Revisions sorted chronologically |
| `restoreAsNew` | Creates new revision with old content |
| `autoSave` | Working copy persists on edit |
| `unsavedWarning` | Warn before loading revision with dirty state |

### Acceptance Criteria

- [ ] User clicks "Save Revision" → dialog → revision appears in history
- [ ] User clicks "Revision History" → panel opens with list
- [ ] User clicks "Load" on revision → working copy switches (warns if dirty)
- [ ] User clicks "Create Working Copy" from R3 → new isolated copy
- [ ] Two browser tabs with same projectId → independent edits
- [ ] Reload browser → working copy restored from localStorage
- [ ] All 56 existing tests pass
- [ ] Build succeeds

### Risks & Rollback
| Risk | Mitigation |
|------|------------|
| localStorage quota | Compress with lz-string; limit 50 revisions; warn at 80% quota |
| State corruption | Atomic write: write to temp key, verify, then rename |
| Breaking existing flow | Keep all current localStorage keys; migrate on first load |
| Performance | Debounce auto-save (30s); lazy-load history panel |

---

## Phase 2: Semantic Comparison (Diff Engine)

**Objective**: Compare two revisions and display meaningful network-specific changes.

**Timeline**: 3-4 days

### Functionality

| Feature | Description |
|---------|-------------|
| **Diff Engine** | `computeDiff(base, target) → ProjectDiff` |
| **Device Diff** | Added/removed/modified nodes with config changes |
| **Link Diff** | Added/removed/modified connections |
| **IP Diff** | Interface IP/subnet changes |
| **Routing Diff** | Router spanning changes, gateway changes |
| **SDN Diff** | Policy add/remove/modify, flow rule changes |
| **NFV Diff** | VNF deployment changes, service chain reorder |
| **Orchestration Diff** | Instance config, scaling policy changes |
| **Diff Viewer UI** | Tabbed view (Summary/Devices/Links/IPs/SDN/NFV/Orch) |
| **Identity Resolution** | Match by stable ID, not array position |

### Files to Create

| File | Purpose |
|------|---------|
| `src/collaboration/DiffEngine.js` | Core diff algorithm per entity type |
| `src/collaboration/IdentityResolver.js` | Stable ID matching across revisions |
| `src/components/ui/DiffViewer.jsx` | Tabbed diff view modal |
| `src/components/ui/DiffSummaryCard.jsx` | Reusable change summary card |
| `tests/diffEngine.test.js` | Diff algorithm tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/RevisionHistory.jsx` | Add "Compare" button → opens DiffViewer |
| `src/engine/graph/graphModel.js` | Export helper: `getRoutersSpanning`, `getNodeOwnNetworks` for diff |

### Tests Required

| Test | Description |
|------|-------------|
| `deviceAdded` | Detect new node in target |
| `deviceRemoved` | Detect deleted node |
| `deviceConfigChanged` | Detect IP, VLAN, interface changes |
| `linkAddedRemoved` | Detect connection changes |
| `ipChanged` | Detect interface IP modifications |
| `sdnPolicyChanged` | Detect policy add/remove/modify |
| `nfvDeploymentChanged` | Detect VNF deploy/remove/chain reorder |
| `identityMatch` | Same ID across revisions = same entity |
| `breakingChangeDetection` | Flag IP collisions, missing gateways |

### Acceptance Criteria

- [ ] "Compare" in history opens diff view
- [ ] Summary tab shows human-readable changes
- [ ] Devices tab lists added/removed/modified with config details
- [ ] Links tab shows connection changes
- [ ] IPs tab shows before/after per interface
- [ ] SDN/NFV/Orch tabs show domain-specific changes
- [ ] Clicking a change highlights entity (future: on canvas)
- [ ] JSON fallback available for unsupported categories

### Risks & Rollback
| Risk | Mitigation |
|------|------------|
| Diff algorithm bugs | Comprehensive unit tests per entity type |
| Performance on large projects | Memoize diff results; limit to 100 nodes |
| Identity edge cases | Test renames, delete+recreate same ID |

---

## Phase 3: Change Proposals & Review

**Objective**: Submit working copy for review against target base revision; track proposal status.

**Timeline**: 3-4 days

### Functionality

| Feature | Description |
|---------|-------------|
| **Propose Changes** | Dialog: title, description, auto-generates diff vs base |
| **Proposal List** | Panel showing all proposals with status |
| **Proposal States** | Draft → Open → Approved/Changes Requested → Merged/Closed |
| **Review Comments** | Text comments on proposals |
| **Stale Base Detection** | Warn if target has new revisions since proposal created |

### Files to Create

| File | Purpose |
|------|---------|
| `src/collaboration/ProposalManager.js` | Create/update/list proposals |
| `src/components/ui/ProposeChangesDialog.jsx` | Create proposal form |
| `src/components/ui/ProposalList.jsx` | Proposal dashboard panel |
| `src/components/ui/ProposalDetail.jsx` | View proposal + diff + comments |
| `tests/proposalManager.test.js` | Proposal lifecycle tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/ProjectMenu.jsx` | Add "Propose Changes" (enabled when unsaved vs base) |
| `src/App.jsx` | Add ProposalList route/panel |

### Tests Required

| Test | Description |
|------|-------------|
| `createProposal` | Creates proposal with diff vs base |
| `proposalStatusTransitions` | Draft→Open→Approved→Merged |
| `staleBaseDetection` | Warn if target has newer revisions |
| `duplicatePrevention` | Prevent duplicate proposals from same source |

### Acceptance Criteria

- [ ] "Propose Changes" creates proposal with auto-generated diff
- [ ] Proposal list shows status, author, timestamp
- [ ] Click proposal → shows diff + comments
- [ ] Stale base warning appears when target advanced
- [ ] Proposal persists across reloads

---

## Phase 4: Safe Merge & Conflict Resolution

**Objective**: Merge approved proposals with conflict detection and validation.

**Timeline**: 2-3 days

### Functionality

| Feature | Description |
|---------|-------------|
| **Three-Way Merge** | Base → Source + Target → Merged |
| **Conflict Detection** | Same entity modified both sides |
| **Conflict Resolution UI** | Choose source/target/manual per conflict |
| **Validation Gate** | NetworkGraph validation before accept |
| **Merge Commit** | Creates new revision on target branch |
| **History Preservation** | Source/target revisions unchanged |

### Files to Create

| File | Purpose |
|------|---------|
| `src/collaboration/MergeEngine.js` | Three-way merge + conflict detection |
| `src/collaboration/NetworkValidator.js` | Post-merge topology validation |
| `src/components/ui/ConflictResolution.jsx` | Conflict picker UI |
| `src/components/ui/MergeDialog.jsx` | Merge confirmation + conflict resolution |
| `tests/mergeEngine.test.js` | Merge + conflict tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/ProposalDetail.jsx` | Add "Merge" button (when approved) |
| `src/engine/graph/graphModel.js` | Add `validateTopology()` method |

### Merge Algorithm (from Architecture Doc)
```typescript
function threeWayMerge(base, source, target) {
  const diffSource = computeDiff(base, source);
  const diffTarget = computeDiff(base, target);
  
  // Non-conflicting: accept source-only changes
  // Conflicting: both sides changed same entity → flag
  // Apply non-conflicting → validate → create revision
}
```

### Conflict Types Handled
| Conflict | Detection | Resolution Options |
|----------|-----------|-------------------|
| Device config | Both modified same `nodeId.config` | Source / Target / Manual |
| Link endpoints | Both modified same `edgeId` source/target | Source / Target / Manual |
| Device deleted vs modified | One side deleted, other modified | Source (recreate) / Target (keep deleted) |
| IP collision | Two devices claim same IP | Manual only (auto-reject invalid) |
| SDN policy | Same policyId modified | Source / Target / Manual |
| Service chain | Order changed both sides | Source / Target / Manual |

### Tests Required

| Test | Description |
|------|-------------|
| `nonConflictingMerge` | Different entities → clean merge |
| `deviceConfigConflict` | Same device modified both sides → conflict |
| `linkConflict` | Same link modified both sides → conflict |
| `deleteModifyConflict` | Delete in source, modify in target → conflict |
| `ipCollisionRejected` | Post-merge validation catches IP collision |
| `invalidTopologyRejected` | Missing gateway, broken links → reject |
| `mergeCreatesRevision` | Successful merge → new revision on target |
| `originalsPreserved` | Source/target revisions unchanged |

### Acceptance Criteria

- [ ] "Merge" on approved proposal → merge dialog
- [ ] No conflicts → direct merge → new revision created
- [ ] Conflicts → resolution UI with source/target/manual
- [ ] Manual resolution → validate → merge
- [ ] Invalid merge → rejected with clear errors
- [ ] Source/target revisions preserved in history

---

## Phase 5: Shared Persistence & Permissions (Future)

**Objective**: Backend storage for cross-device, multi-user projects with auth.

**Timeline**: TBD (requires backend)

### Scope
- User authentication (OAuth/email)
- Project ownership & collaborator roles
- REST API for revisions, proposals, merges
- WebSocket for real-time proposal updates
- Migration from localStorage to backend

### Files (New Backend)
| Component | Tech |
|-----------|------|
| API Server | Node/Express or Python/FastAPI |
| Database | PostgreSQL (revisions, proposals, projects) |
| Auth | JWT or NextAuth |
| WebSocket | Socket.io or native ws |

---

## Phase 6: Live Collaboration Integration

**Objective**: Bridge live sessions to revision history.

**Timeline**: 2 days

### Functionality

| Feature | Description |
|---------|-------------|
| **Start Live Session** | Creates `live-{sessionId}` Yjs room |
| **Join Session** | Enter session ID → real-time sync |
| **Session UI** | Participant list, cursors, "End Session" |
| **Save as Revision** | On session end → create revision from Yjs state |
| **Isolation** | Live session doesn't touch working copies |

### Files to Create

| File | Purpose |
|------|---------|
| `src/collaboration/LiveSessionManager.js` | Session lifecycle, Yjs doc management |
| `src/components/ui/LiveSessionPanel.jsx` | Session UI (participants, end/save) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/collaboration/CollaborationProvider.jsx` | Support multiple Yjs docs (project + live) |
| `src/components/ui/ProjectMenu.jsx` | Add Live Collaboration submenu |

### Acceptance Criteria

- [ ] "Start Live Session" → new Yjs room, shares link
- [ ] Participants see each other's cursors
- [ ] Edits sync in real-time
- [ ] "End Session" → "Save as Revision" prompt
- [ ] Saved revision appears in history
- [ ] Working copies unaffected during session

---

## Implementation Order Summary

| Phase | Focus | Est. Time | Dependencies |
|-------|-------|-----------|--------------|
| 0 | Audit & Design | ✅ Done | — |
| 1 | Working Copies + Revisions | 2-3 days | Phase 0 |
| 2 | Semantic Diff | 3-4 days | Phase 1 |
| 3 | Proposals & Review | 3-4 days | Phase 2 |
| 4 | Safe Merge | 2-3 days | Phase 3 |
| 5 | Backend Persistence | TBD | Phase 4 |
| 6 | Live Session Bridge | 2 days | Phase 1 + existing Yjs |

**Total (Phases 1-4)**: ~10-14 days for core Git-style workflow

---

## Recommended First Milestone: Phase 1

**Why Phase 1:**
- Lowest risk — builds on existing Zustand + localStorage
- Immediate user value — save versions, experiment safely
- Foundation for all later phases
- No server changes needed
- Can demo in 2-3 days

**First Tasks:**
1. Create `ProjectManager.js` with `createWorkingCopy`, `saveRevision`, `loadRevision`, `listRevisions`
2. Create `RevisionStore.js` with atomic localStorage ops
3. Add `workingCopyId`, `baseRevisionId`, `projectId`, `branchName` to `gameStore.js`
4. Build `ProjectMenu` + `RevisionHistory` + `SaveRevisionDialog`
5. Wire into `App.jsx` and `NetworkBuilder.jsx`
6. Write tests, verify build + all 56 tests pass

---

## Next Steps

**Awaiting approval to begin Phase 1 implementation.**

Once approved, I'll:
1. Implement `ProjectManager.js` and `RevisionStore.js`
2. Add Zustand state extensions
3. Build UI components (ProjectMenu, RevisionHistory, SaveRevisionDialog)
4. Integrate into App.jsx
5. Run tests and verify build