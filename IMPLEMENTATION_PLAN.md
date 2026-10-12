# Implementation Plan — General Actions & Scenario Solutions

**Date:** 2026-10-11  
**Repository:** https://github.com/abhayshravan357-sudo/network-architecture-lab/  
**Based on:** `GENERAL_ACTIONS_AUDIT.md`

---

## 1. Implementation Principles

1. **No new state systems** — Extend existing Zustand store, React Flow, Yjs integration
2. **Preserve collaboration** — Deletion/undo must sync to Yjs maps (`nodes`, `edges`)
3. **Small, reviewable commits** — One feature per commit, test after each
4. **Test-first where feasible** — Add unit tests before implementation
5. **Vertical slice** — Complete one scenario fully before extending pattern

---

## 2. Implementation Phases

### Phase 0: Fix Startup/Runtime Errors (Pre-requisite)
**Goal:** Ensure clean baseline before adding features.

| Task | File(s) | Acceptance |
|------|---------|------------|
| Verify no console errors on load | `App.jsx`, `main.jsx` | Clean console |
| Verify collaboration provider initializes | `CollaborationProvider.jsx` | No Yjs errors |
| Verify persistence loads correctly | `gameStore.js` | State restores |
| Run existing tests | `npm run build && npx vitest run` | All pass |

---

### Phase 1: Device & Connection Deletion (Foundation)
**Goal:** Enable users to remove devices and connections with consistent state updates.

**Files to Modify:**
- `src/state/gameStore.js` — Add `deleteNode`, `deleteEdge` actions (wrap existing `removeGraphNode/Edge`)
- `src/components/builder/NetworkBuilder.jsx` — Add delete handlers, keyboard handler, multi-select support
- `src/components/builder/DeviceNode.jsx` — Add delete button on selection (optional)

**Dependencies:** None (foundation for undo/redo)

**Tasks:**
1. Add `deleteNode(nodeId)` action in gameStore — calls `removeGraphNode` + `removeGraphEdge` for connected edges + marks `unsavedChanges`
2. Add `deleteEdge(edgeId)` action in gameStore — calls `removeGraphEdge` + marks `unsavedChanges`
3. Add `onDeleteKey` handler in NetworkBuilder — triggers deletion for selected node/edge
4. Add multi-select support (ReactFlow `selectionKey` + `onSelectionChange`)
5. Add "Delete" button in footer or context menu for selected items
6. Ensure Yjs sync: deletion updates `nodesMap`/`edgesMap` via existing `syncToYjs` effect

**Acceptance Criteria:**
- Single device deletion removes node + all connected edges
- Single edge deletion removes only that edge
- Multi-select delete removes all selected nodes/edges
- State persists to localStorage
- Collaboration syncs deletion to peers
- No orphan edges remain

**Tests:**
- `gameStore.deleteNode` removes node + connected edges
- `gameStore.deleteEdge` removes edge only
- Deletion persists after reload
- Deletion syncs to Yjs (mock)

**Commit Boundary:** Single commit "feat: device and connection deletion"

---

### Phase 2: Undo/Redo System
**Goal:** Provide history-based undo/redo for editing actions, integrated with persistence and collaboration.

**Files to Modify:**
- `src/state/gameStore.js` — Add history stack, `undo()`, `redo()` actions
- `src/components/builder/NetworkBuilder.jsx` — Add keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

**Dependencies:** Phase 1 complete (deletion must be undoable)

**Design Decision:** Use a simple linear history stack on `network.rfNodes` + `network.rfEdges` snapshots. Each mutating action (setRFNodes, setRFEdges, deleteNode, deleteEdge, updateNodeData) pushes previous state. Max 50 entries.

**Risks to Address:**
- **Collaboration conflict:** Local undo should not revert remote peer's concurrent edits. Solution: Track `isRemoteUpdateRef` flag (already exists in CollaborationProvider); skip history push for remote updates.
- **Persistence:** History should NOT persist to localStorage (ephemeral). Add to `partialize` exclusion.
- **Revision history:** Undo is separate from revision history — user can still save revision after undo.

**Tasks:**
1. Add `history` state: `{ past: [], future: [] }` in `network` object
2. Wrap mutating actions (`setRFNodes`, `setRFEdges`, `deleteNode`, `deleteEdge`, `updateNodeData`) to push to `past` before change, clear `future`
3. Add `undo()` — pop from `past`, push current to `future`, restore state
4. Add `redo()` — pop from `future`, push current to `past`, restore state
5. Add `useEffect` in NetworkBuilder for global keyboard shortcuts (guard against input focus)
6. Add undo/redo buttons in builder footer (disabled when stacks empty)

**Acceptance Criteria:**
- Ctrl+Z undoes last edit (placement, deletion, config change, connection)
- Ctrl+Shift+Z redoes undone edit
- Undo/redo works across multiple action types
- Undo does not revert remote collaboration changes
- History clears on new scenario load / revision load
- Buttons reflect availability

**Tests:**
- Undo restores deleted node + edges
- Redo re-applies deletion
- Undo/redo with config changes
- Remote update does not pollute history
- History limit respected (50 entries)

**Commit Boundary:** Single commit "feat: undo/redo history system"

---

### Phase 3: Back Navigation & Unsaved-Change Protection
**Goal:** Safe navigation without losing work.

**Files to Modify:**
- `src/App.jsx` — Add `beforeunload` handler, route guards
- `src/state/gameStore.js` — Add navigation helpers if needed

**Dependencies:** Phase 1-2 (unsavedChanges flag already exists)

**Tasks:**
1. Add `window.addEventListener('beforeunload', handler)` in App.jsx — warns if `unsavedChanges`
2. Wrap `goToStage` / `goToHome` / `resetAll` with unsaved check — show confirm dialog
3. For browser back/forward: Since no React Router, use `popstate` on hash changes if hash routing added later. For now, document limitation.
4. Add "Discard Changes" vs "Save Revision" options in confirmation dialogs

**Acceptance Criteria:**
- Leaving build stage with unsaved changes shows confirmation
- Refresh/close tab shows browser confirmation
- Quit button already has confirmation (keep)
- Navigation to home from scenario shows confirmation

**Tests:**
- beforeunload fires when unsavedChanges=true
- Navigation guards block without confirmation
- No false positives when saved

**Commit Boundary:** Single commit "feat: unsaved-change navigation guards"

---

### Phase 4: Canvas Controls (Fit View, Reset, Clear)
**Goal:** Essential viewport controls for complex topologies.

**Files to Modify:**
- `src/components/builder/NetworkBuilder.jsx` — Add buttons, handlers

**Dependencies:** Phase 1 (clear canvas needs deletion)

**Tasks:**
1. Add "Fit View" button in footer — calls `reactFlowInstance.fitView({ padding: 0.2 })`
2. Add "Reset Viewport" button — calls `reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 })`
3. Add "Clear Canvas" button — confirmation dialog → `setRFNodes([])`, `setRFEdges([])` (preserves scenario/resource pool)
4. Ensure fit-view works on demand (not just initial load)
5. Add tooltips with shortcuts (F = Fit, R = Reset)

**Acceptance Criteria:**
- Fit View centers and scales all nodes
- Reset Viewport returns to origin, zoom 1
- Clear Canvas removes all nodes/edges with confirmation
- Clear Canvas preserves scenario, resource pool, unsavedChanges=true

**Tests:**
- fitView called on button click
- resetViewport called on button click
- clearCanvas empties nodes/edges array

**Commit Boundary:** Single commit "feat: canvas viewport controls and clear canvas"

---

### Phase 5: Explicit Save & Save Status
**Goal:** Visible save action and status, distinct from revision save.

**Files to Modify:**
- `src/components/builder/NetworkBuilder.jsx` — Add Save button in footer
- `src/state/gameStore.js` — Add explicit `save()` action (marks saved, triggers persist)
- `src/components/ui/ProjectMenu.jsx` — Already shows unsaved badge (keep)

**Dependencies:** Phase 3 (unsavedChanges tracking)

**Tasks:**
1. Add `save()` action in gameStore — calls `markSaved()` (already exists), forces persist by updating a timestamp or dummy field
2. Add "Save" button in NetworkBuilder footer — enabled when `unsavedChanges=true`
3. Button shows "Saved" state briefly after click
4. Keyboard shortcut Ctrl+S (guard against input focus)
5. Ensure auto-save (persist middleware) still works — explicit save is supplementary

**Acceptance Criteria:**
- Save button appears when unsavedChanges=true
- Click saves and updates badge to clean
- Ctrl+S works in builder
- Revision save still available via ProjectMenu

**Tests:**
- Explicit save clears unsavedChanges
- Persist middleware captures save
- Badge updates correctly

**Commit Boundary:** Single commit "feat: explicit save action and status"

---

### Phase 6: Keyboard Shortcuts & Duplicate/Copy-Paste
**Goal:** Power-user efficiency.

**Files to Modify:**
- `src/components/builder/NetworkBuilder.jsx` — Global keyboard handler
- `src/state/gameStore.js` — Add `duplicateNode(nodeId)` action

**Dependencies:** Phase 1-2

**Tasks:**
1. Add global keydown handler in NetworkBuilder (useEffect)
2. Shortcuts:
   - Delete / Backspace → delete selected
   - Ctrl+D → duplicate selected node
   - Ctrl+C / Ctrl+V → copy/paste (defer if complex; start with duplicate)
   - F → Fit View
   - R → Reset Viewport
   - Escape → clear selection
3. Duplicate action: clone node data, offset position, new ID, add to store
4. Respect input focus (don't trigger shortcuts in inputs)

**Acceptance Criteria:**
- All shortcuts work in builder
- Duplicate creates independent node with offset
- Shortcuts don't interfere with text inputs
- Tooltips show shortcuts on hover

**Tests:**
- Duplicate creates new node with copied config
- Keyboard handler guards input focus
- Shortcuts map correctly

**Commit Boundary:** Single commit "feat: keyboard shortcuts and duplicate"

---

### Phase 7: One-Click Scenario Solution Loading (Small Office First)
**Goal:** Generate valid reference architecture for a scenario.

**Files to Create/Modify:**
- `src/data/scenarios/solutionAdapter.js` — **New file**: adapter from `referenceArchitecture` → ReactFlow nodes/edges
- `src/data/scenarios/smallOfficeSolution.js` — **New file**: concrete solution for small-office
- `src/components/builder/NetworkBuilder.jsx` — Add "Show Correct Architecture" button + load logic
- `src/state/gameStore.js` — Add `loadSolution(scenarioId)` action

**Dependencies:** Phase 1-6 (deletion, undo, clear canvas, save status all needed for safe loading)

**Critical Design Decision:** `referenceArchitecture` is descriptive only. Need a **generative solution definition** per scenario that specifies:
- Exact device types, positions, configs
- Exact connections
- VLAN assignments, IP addresses, router interfaces
- Must be validatable against `deviceCatalog.js` and validation engine

**Solution Format (per scenario):**
```js
export const smallOfficeSolution = {
  nodes: [
    { id: 'fw-1', type: 'firewall', position: {x: 100, y: 200}, data: { type: 'firewall', label: 'FW-1', vlans: [] } },
    { id: 'rt-1', type: 'router', position: {x: 300, y: 200}, data: { type: 'router', label: 'Router', interfaces: [{ip: '192.168.1.1', mask: 24, name: 'G0'}] } },
    // ... all devices
  ],
  edges: [
    { id: 'e1', source: 'fw-1', target: 'rt-1', ... },
    // ... all connections
  ],
  explanation: {
    overview: '...',
    deviceRoles: { 'fw-1': 'Perimeter firewall...', ... },
    trafficFlow: 'Internet → Firewall → Router → Switch → PCs/Server',
    keyInsights: [ ... ] // from referenceArchitecture.keyInsights
  }
}
```

**Tasks:**
1. Create `solutionAdapter.js` with `loadSolution(scenarioId)` that:
   - Validates solution against device catalog
   - Clears current canvas (with confirmation if unsaved)
   - Loads nodes/edges via `setRFNodes`/`setRFEdges`
   - Calls `fitView()`
   - Returns explanation object for UI display
2. Create `smallOfficeSolution.js` with complete valid topology
3. Add "Show Correct Architecture" button in NetworkBuilder footer (only when scenario active)
4. Button click → confirm if unsaved → load solution → show explanation panel
5. Add explanation panel component (reusable)

**Acceptance Criteria:**
- Button only shows in scenario mode (not practice/collab)
- Loads complete valid topology for small-office
- No duplicates on repeated clicks
- Confirmation if unsaved work exists
- Explanation panel shows device roles, traffic flow, insights
- Loaded topology passes validation
- Undo available after load

**Tests:**
- Solution loads valid nodes/edges
- Solution passes validation engine
- Repeated load doesn't duplicate
- Unsaved confirmation works
- Undo restores previous state

**Commit Boundary:** Single commit "feat: one-click solution loading (small-office)"

---

### Phase 8: Extend Solution Loading to All Scenarios
**Goal:** Apply verified pattern to remaining 4 scenarios.

**Files to Create:**
- `src/data/scenarios/collegeCampusSolution.js`
- `src/data/scenarios/hospitalSolution.js`
- `src/data/scenarios/hotelSolution.js`
- `src/data/scenarios/multiBranchSolution.js`

**Dependencies:** Phase 7 complete and tested

**Tasks:**
1. Create solution file for each scenario following same schema
2. Validate each against device catalog and validation rules
3. Test each in simulator (run simulation stage)
4. Mark any scenario as "conceptual only" if simulation fails

**Acceptance Criteria:**
- All 5 scenarios have loadable solutions
- Each solution validates
- At least 3/5 run in simulation successfully
- Documentation notes which are conceptual vs validated

**Commit Boundary:** One commit per scenario solution

---

### Phase 9: Quiz Answer Reveal & Architecture Explanations
**Goal:** Learning mode with answer explanations.

**Files to Modify:**
- `src/components/planning/PlanningQuiz.jsx` — Add "Reveal Answers" mode
- `src/components/builder/NetworkBuilder.jsx` — Link explanation to canvas highlights

**Dependencies:** Phase 7 (explanation panel component reusable)

**Tasks:**
1. Add "Reveal Answers & Explanations" button in PlanningQuiz (after quiz complete or anytime)
2. Reveal mode shows:
   - Correct answer(s) highlighted
   - Explanation for each question (already in scenario data)
   - Why incorrect options are wrong (derive from hint/explanation)
   - Score unchanged, attempt not counted
3. Add "Learning Mode" toggle at quiz start — reveals immediately vs after attempt
4. Link from explanation to canvas: click device name → highlight/select node on canvas
5. Reuse explanation panel from Phase 7 for architecture insights

**Acceptance Criteria:**
- Reveal button shows all answers with explanations
- Score unchanged after reveal
- Learning mode available from start
- Click device in explanation → highlights on canvas
- Works for all 5 scenarios

**Tests:**
- Reveal doesn't modify quizScore
- Explanations match scenario data
- Canvas highlight works

**Commit Boundary:** Single commit "feat: quiz answer reveal and architecture explanations"

---

## 3. Dependency Graph

```
Phase 0 (Fix Errors)
    ↓
Phase 1 (Deletion) ← Foundation
    ↓
Phase 2 (Undo/Redo) ← Requires deletion
    ↓
Phase 3 (Nav Guards) ← Uses unsavedChanges
    ↓
Phase 4 (Canvas Controls) ← Uses deletion (clear)
    ↓
Phase 5 (Explicit Save) ← Uses unsavedChanges
    ↓
Phase 6 (Shortcuts/Duplicate) ← Uses deletion, undo
    ↓
Phase 7 (Solution Loading - Small Office) ← Uses ALL above
    ↓
Phase 8 (Other Solutions) ← Pattern from Phase 7
    ↓
Phase 9 (Quiz Reveal) ← Reuses explanation UI from Phase 7
```

---

## 4. Test Commands

```bash
# Build
npm run build

# Unit tests
npx vitest run

# Specific test file
npx vitest run tests/gameStore.test.js

# Watch mode during development
npx vitest
```

---

## 5. Unresolved Questions & Architectural Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Yjs undo conflict | High | Use `isRemoteUpdateRef` flag; don't push remote changes to history |
| Solution validation | Medium | Validate each solution against validationEngine before commit |
| History memory | Low | Cap at 50 entries; clear on scenario change |
| Browser back button | Medium | Document limitation; consider hash routing later |
| Multi-user undo | High | Define: undo is local-only; document clearly |
| Solution positions | Medium | Use deterministic layout algorithm or fixed positions per scenario |
| Resource pool limits | Medium | Solution must respect scenario resourcePool; validate on load |

---

## 6. Exact Files Expected to Change

### Core State
- `src/state/gameStore.js` — History, deletion actions, explicit save, loadSolution

### Builder UI
- `src/components/builder/NetworkBuilder.jsx` — All UI controls, keyboard, solution loading

### Scenario Data (New)
- `src/data/scenarios/solutionAdapter.js`
- `src/data/scenarios/smallOfficeSolution.js`
- `src/data/scenarios/collegeCampusSolution.js`
- `src/data/scenarios/hospitalSolution.js`
- `src/data/scenarios/hotelSolution.js`
- `src/data/scenarios/multiBranchSolution.js`

### Quiz
- `src/components/planning/PlanningQuiz.jsx` — Reveal mode

### Tests (New)
- `tests/gameStore.test.js` — Deletion, undo/redo, save, solution loading
- `tests/networkBuilder.test.js` — Keyboard, canvas controls
- `tests/solutionAdapter.test.js` — Solution validation

---

## 7. Acceptance Criteria Summary

| Phase | Must Work Before Next Phase |
|-------|----------------------------|
| 0 | Clean build, all existing tests pass |
| 1 | Delete node/edge, persists, syncs |
| 2 | Undo/redo deletion, config, placement |
| 3 | Navigation guards prevent data loss |
| 4 | Fit/Reset/Clear all functional |
| 5 | Save button clears unsaved badge |
| 6 | Shortcuts work, duplicate creates valid node |
| 7 | Small Office solution loads, validates, explains |
| 8 | All 5 solutions load, ≥3 simulate |
| 9 | Quiz reveal shows answers, no score change |

---

## 8. Next Steps

1. **Review this plan** — Challenge any risky design decisions
2. **Approve Phase 0-1** — Start with deletion foundation
3. **Run baseline tests** — `npm run build && npx vitest run`
4. **Begin Phase 1 implementation** — One commit per task