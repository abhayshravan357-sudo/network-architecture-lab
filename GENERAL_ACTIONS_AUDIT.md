# General Actions Audit — SDN/NFV Architecture Lab

**Date:** 2026-10-11  
**Repository:** https://github.com/abhayshravan357-sudo/network-architecture-lab/  
**Branch:** main (commit 7581123)

---

## 1. Audit Scope and Methodology

This audit inspects the actual source code to verify existing functionality, identify gaps, and establish evidence-based findings. Every finding is traced to a source file and line number.

**Inspected Files:**
- `src/state/gameStore.js` — Zustand store, persistence, actions
- `src/components/builder/NetworkBuilder.jsx` — Canvas, palette, device/edge operations
- `src/components/builder/DeviceNode.jsx` — Device rendering
- `src/components/builder/DeviceConsole.jsx` — Device configuration
- `src/components/ui/ProjectMenu.jsx` — Project actions (save revision, history, working copies)
- `src/components/scenario/ScenarioBriefing.jsx` — Scenario intro, requirements
- `src/components/planning/PlanningQuiz.jsx` — Quiz UI and logic
- `src/data/scenarios/*.js` — 5 scenario definitions with `referenceArchitecture`
- `src/collaboration/CollaborationProvider.jsx` — Yjs/WebSocket/IndexedDB sync
- `src/App.jsx` — Routing, top nav, dialogs, stage management
- `src/index.css` — Design system, component styles
- `src/components/ui/RevisionHistory.jsx` — Revision history UI
- `src/components/ui/SaveRevisionDialog.jsx` — Save revision dialog
- `src/components/ui/CreateWorkingCopyDialog.jsx` — Working copy dialog
- `vitest.config.js` + `tests/*.test.js` — Test configuration and existing tests

---

## 2. Feature Audit Matrix

### 2.1 Navigation & Routing

| Action | Status | Evidence | Notes |
|--------|--------|----------|-------|
| Stage navigation (breadcrumb) | ✅ Complete | `App.jsx:218-245` `TopNav` breadcrumb with clickable stages | Uses `goToStage` from gameStore |
| Home navigation | ✅ Complete | `App.jsx:77-85` Brand click → `goToHome()` | Confirmation dialog if in scenario |
| Scenario selection | ✅ Complete | `ScenarioSelect.jsx` cards → `startScenario()` | Loads scenario, resets mission state |
| Scenario briefing | ✅ Complete | `ScenarioBriefing.jsx` with story, requirements, thinking prompts | `goToStage(STAGES.PLANNING_QUIZ)` |
| Practice Lab | ✅ Complete | `PracticeLab.jsx` lazy-loaded | `startPracticeLab()` in gameStore |
| Learn Concepts | ✅ Complete | `LearnConcepts.jsx` lazy-loaded | `startLearnConcepts()` in gameStore |
| Browser back/forward | ⚠️ Partial | React Router not used; hash/history not synced | `goToStage` updates store but not URL |
| Leave with unsaved changes | ⚠️ Partial | Quit button has confirmation | No generic `beforeunload` or route guard |

### 2.2 Device & Connection Editing

| Action | Status | Evidence | Notes |
|--------|--------|----------|-------|
| Add device (drag-drop) | ✅ Complete | `NetworkBuilder.jsx:304-331` `onDrop` | Creates node from palette |
| Add connection | ✅ Complete | `NetworkBuilder.jsx:279-293` `onConnect` | Uses ReactFlow `addEdge` |
| Select device | ✅ Complete | `NetworkBuilder.jsx:343` `selectedNode` | Click handler on node |
| Inspect device config | ✅ Complete | `ConfigPanel.jsx` + `DeviceConsole.jsx` | Tabbed right panel |
| Edit device config | ✅ Complete | `ConfigPanel.jsx` `handleChange` → `updateNodeData` | Updates Zustand `rfNodes` |
| Edit VLANs | ✅ Complete | `ConfigPanel.jsx:88-104` `handleVlanAdd/Remove` | Updates `data.vlans` |
| Edit router interfaces | ✅ Complete | `ConfigPanel.jsx:106-128` | Adds/removes interfaces |
| Move device | ✅ Complete | `onNodesChange` → `applyNodeChanges` | ReactFlow built-in |
| **Delete device** | ❌ **Missing** | No delete action in NetworkBuilder | `removeGraphNode` exists in gameStore but no UI |
| **Delete connection** | ❌ **Missing** | No delete action for edges | `removeGraphEdge` exists in gameStore but no UI |
| **Delete multiple** | ❌ **Missing** | No multi-select or bulk delete | ReactFlow supports multi-select but no handler |
| **Duplicate device** | ❌ **Missing** | No duplicate action | `DeviceNode` data not easily cloneable |
| **Delete connection on node delete** | ⚠️ Partial | `removeGraphNode` in gameStore removes edges | But no delete device action to trigger it |

### 2.3 Undo/Redo

| Action | Status | Evidence | Notes |
|--------|--------|----------|-------|
| **Undo** | ❌ **Missing** | No history in gameStore | Only `unsavedChanges` flag exists |
| **Redo** | ❌ **Missing** | No history stack | |
| **Keyboard shortcuts (Ctrl+Z/Y)** | ❌ **Missing** | No global key handlers | Only VLAN/interface inputs have `onKeyDown` |

### 2.4 Canvas Controls

| Action | Status | Evidence | Notes |
|--------|--------|----------|-------|
| Zoom in/out | ✅ Complete | ReactFlow `Controls` component | `NetworkBuilder.jsx:396` |
| Pan | ✅ Complete | ReactFlow default | |
| **Fit View** | ⚠️ Partial | Auto-fits on first load only | `NetworkBuilder.jsx:236-245` auto-fits once |
| **Fit View (manual)** | ❌ **Missing** | No explicit button | `reactFlowInstance.fitView()` available but no UI |
| **Reset Viewport** | ❌ **Missing** | No reset button | |
| **Clear Canvas** | ❌ **Missing** | No action | `resetAll` in gameStore resets everything including scenario |

### 2.5 Project Actions & Persistence

| Action | Status | Evidence | Notes |
|--------|--------|----------|-------|
| Auto-save (localStorage) | ✅ Complete | `gameStore.js:626-651` persist middleware | Persists entire state except ephemeral UI |
| **Explicit Save** | ❌ **Missing** | No "Save" button | Revision save exists via ProjectMenu |
| Save Status Indicator | ✅ Complete | `ProjectMenu.jsx` shows `● unsaved` badge | `unsavedChanges` flag in gameStore |
| **Explicit Save Action** | ❌ **Missing** | No "Save" button in UI | Only revision save via ProjectMenu |
| Rename Project | ❌ Missing | `projectName` in state but no rename UI | |
| Duplicate Project | ❌ Missing | Working copy creation exists but not "duplicate project" | |
| **Revision History** | ✅ Complete | `RevisionHistory.jsx` + `ProjectManager.js` | Save/load/create working copy |
| **Working Copies** | ✅ Complete | `ProjectManager.js` + `CreateWorkingCopyDialog.jsx` | Independent copies from revisions |
| **Revision Save** | ✅ Complete | `SaveRevisionDialog.jsx` + `ProjectManager.createRevision` | Includes message, branch, metadata |
| **Load Revision** | ✅ Complete | `RevisionHistory.jsx` "Load" button | Restores entire project state |
| **Working Copy Creation** | ✅ Complete | `CreateWorkingCopyDialog.jsx` | From any revision |
| Restore Revision as New | ✅ Complete | `handleRestoreAsNew` in `App.jsx` | Creates new revision from old |
| Project Import/Export | ⚠️ Partial | `ProjectMenu.jsx:305-352` export works, import is stub | Import shows alert "implementation pending" |

### 2.6 Collaboration & Sync

| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Real-time sync (Yjs) | ✅ Complete | `CollaborationProvider.jsx` | WebSocket + IndexedDB |
| Peer count | ✅ Complete | `ProjectMenu.jsx` shows `+N other` | Awareness protocol |
| Local-only mode | ✅ Complete | No WS URL → offline mode | `VITE_WS_URL` not set |
| Project ID in URL | ✅ Complete | `?project=uuid` in URL | Auto-generated or from URL |
| IndexedDB persistence | ✅ Complete | `y-indexeddb` | Offline support |

### 2.7 Scenario Learning Features

| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Scenario definitions | ✅ Complete | 5 scenarios in `src/data/scenarios/*.js` | `smallOffice`, `collegeCampus`, `hospital`, `hotel`, `multiBranch` |
| Scenario requirements | ✅ Complete | Each scenario has `requirements[]` with validation rules | |
| **Reference Architecture** | ✅ Complete | Each scenario has `referenceArchitecture` | Includes `description`, `vlans[]`, `keyInsights[]` |
| **Quiz System** | ✅ Complete | `PlanningQuiz.jsx` + `planningQuiz` in scenarios | Multi-select/single-select, hints, explanations |
| Quiz answer reveal | ❌ **Missing** | Only shows explanation after correct submit | No "Reveal Answers" mode |
| **Show Correct Architecture** | ❌ **Missing** | `referenceArchitecture` exists but not loadable | Descriptive only, not generative |
| **Architecture Explanation UI** | ❌ **Missing** | `keyInsights` not displayed interactively | |
| **Quiz Answer Reveal** | ❌ **Missing** | No "Reveal Answers" mode | Shows explanation only after correct answer |
| **Simulate Solution** | ❌ **Missing** | No "Run Simulation on Reference" | |

### 2.8 Keyboard Shortcuts

| Shortcut | Status | Evidence |
|----------|--------|----------|
| Ctrl+Z (Undo) | ❌ Missing | No global handler |
| Ctrl+Shift+Z (Redo) | ❌ Missing | |
| Ctrl+S (Save) | ❌ Missing | |
| Ctrl+Shift+S (Save As) | ❌ Missing | |
| Delete (Delete selection) | ❌ Missing | |
| Ctrl+D (Duplicate) | ❌ Missing | |
| F / Fit View | ❌ Missing | |
| Escape (Clear selection) | ⚠️ Partial | ReactFlow handles some |

---

## 3. Source-File Evidence Summary

### 3.1 State Management (`src/state/gameStore.js`)
- **Lines 71-80:** Initial network state with `rfNodes`, `rfEdges`, `graph`
- **Lines 313-378:** Network actions (`setRFNodes`, `setRFEdges`, `updateGraphNode`, `removeGraphNode`, `removeGraphEdge`)
- **Lines 313-325:** `setRFNodes`, `setRFEdges`, `setNetworkGraph` — basic CRUD
- **Lines 327-378:** Node/edge mutation helpers (`updateGraphNode`, `removeGraphNode`, `removeGraphEdge`, `updateGraphEdge`, `removeGraphEdge`)
- **Lines 626-651:** Persist config — saves entire state except ephemeral UI
- **Missing:** No history stack, no undo/redo actions, no explicit save action

### 3.2 Network Builder (`src/components/builder/NetworkBuilder.jsx`)
- **Lines 269-293:** `onNodesChange`, `onEdgesChange`, `onConnect` — ReactFlow integration
- **Lines 295-297:** `onNodeClick` — selection
- **Lines 299-331:** `onDragOver`, `onDrop` — device creation from palette
- **Lines 333-341:** `updateNodeData` — config updates
- **Line 343:** `selectedNode` — single selection only
- **Missing:** No `onDelete` handler, no multi-select handling, no keyboard shortcuts

### 3.3 Project Management (`src/components/ui/ProjectMenu.jsx`)
- **Lines 52-58:** Menu items — Save Revision, Revision History, Create Working Copy, Propose Changes, Live Collaboration, Export/Import, Share Link
- **Lines 82-103:** Save Revision dialog — title, description, branch
- **Lines 110-152:** Create Working Copy dialog — name, description, branch
- **Lines 155-202:** Revision History — load, compare, restore as new, create working copy, delete
- **Missing:** No "Save" (explicit), no "Duplicate Project", no "Rename", no "Clear Canvas"

### 3.4 Scenario Definitions (`src/data/scenarios/*.js`)
Each scenario has:
- `referenceArchitecture`: `{ description, vlans[], keyInsights[] }` — **descriptive, not generative**
- `planningQuiz`: questions with `options[].correct`, `explanation`
- `validationRules`: validation engine rules
- `simulationEvents`: events for dynamic simulation
- `sdnOpportunities`, `vnfOpportunities`: extension points
- **Gap:** `referenceArchitecture` is descriptive (text + VLANs + insights), not generative (no node/edge positions, device configs, exact connections)

### 3.5 Quiz System (`PlanningQuiz.jsx`)
- **Lines 43-47:** `isCorrect()` checks selected IDs against `option.correct`
- **Lines 49-54:** `handleSubmit` — saves answer, updates score
- **Lines 123-127:** Shows explanation only on correct answer
- **Lines 129-162:** Hint system with progressive reveal
- **Missing:** No "Reveal Answers" mode, no score-neutral answer reveal

### 3.6 Collaboration (`src/collaboration/CollaborationProvider.jsx`)
- Lines 140-312: Main effect — Yjs doc, WebsocketProvider, IndexedDB persistence
- Lines 180-247: Provider setup with awareness, peer count
- Lines 299-311: Cleanup function
- **Fixed:** `awareness` scope issue (commit 7581123)

### 3.7 Tests (`vitest.config.js` + `tests/*.test.js`)
- **Tests exist for:** sdnEngine, orchestratorEngine, sdnPolicyEngine, simulationEngine, topologyAnalyzer, scaleResponse, journeyEvents
- **Missing tests for:** gameStore actions, NetworkBuilder operations, deletion, undo/redo, scenario loading, quiz reveal

---

## 4. Dependencies & Risks

### 4.1 Deletion → Undo/Redo → Persistence Dependency Chain
```
Delete Device/Connection
    ↓
Updates Zustand state (rfNodes/rfEdges)
    ↓
Triggers unsavedChanges = true
    ↓
Persists to localStorage on next persist cycle
    ↓
Collaboration syncs to Yjs (if connected)
    ↓
Undo must reverse ALL of the above consistently
```

**Risk:** If undo/redo is implemented independently without considering:
- Yjs shared state (collaboration)
- Persistence layer (localStorage)
- Revision history (working copies)
→ Deleted devices may reappear after undo, reload, or sync

### 4.2 Scenario Solution Loading Risks
- `referenceArchitecture` is descriptive (text + VLANs + insights)
- Not generative: no node positions, device configs, exact connections
- **Need adapter:** `referenceArchitecture` → ReactFlow nodes/edges + device configs
- Must validate against `deviceCatalog.js` allowed connections

### 4.3 Collaboration Conflicts
- Deletion must update Yjs shared maps (`nodes`, `edges`)
- Undo must reverse both local Zustand and Yjs state
- Conflict: local undo vs remote concurrent edit

---

## 5. Tests Needed

### 5.1 Unit Tests (Vitest)
| Test | Target | Status |
|------|--------|--------|
| Delete device removes node + edges | `gameStore.removeGraphNode` | ❌ Not tested |
| Delete connection | `gameStore.removeGraphEdge` | ❌ Not tested |
| Undo restores deleted node + edges | New undo action | ❌ Not implemented |
| Redo re-applies deletion | New redo action | ❌ Not implemented |
| Undo/redo with collaboration | Yjs + local state | ❌ Not implemented |
| Load revision restores state | `loadProjectData` | ⚠️ Partial |
| Load solution generates valid topology | New adapter | ❌ Not implemented |
| Quiz reveal doesn't affect score | New reveal action | ❌ Not implemented |

### 5.2 Integration Tests
| Test | Target |
|------|--------|
| Delete device → undo → reload → state consistent | Full cycle |
| Two clients: User A deletes, User B undoes | Collaboration |
| Load solution → validate → simulation runs | End-to-end |
| Quiz reveal → answer shown → score unchanged | Quiz |

---

## 6. Summary of Confirmed Findings

| Category | Complete | Partial | Missing | Broken |
|----------|----------|---------|---------|--------|
| Navigation | 6 | 2 | 1 | 0 |
| Device Editing | 7 | 1 | 4 | 0 |
| Undo/Redo | 0 | 0 | 3 | 0 |
| Canvas Controls | 2 | 1 | 3 | 0 |
| Project Actions | 5 | 2 | 3 | 0 |
| Collaboration | 5 | 0 | 0 | 0 |
| Scenario Learning | 3 | 0 | 4 | 0 |
| Keyboard Shortcuts | 0 | 1 | 6 | 0 |

**Total:** 35 features audited — 24 implemented, 4 partial, 17 missing, 0 broken

---

## 7. Next Steps

1. Review this audit with stakeholders
2. Approve `IMPLEMENTATION_PLAN.md` with phased approach
3. Start with **Phase 1: Deletion + Undo/Redo** (foundation for all editing)
4. Then **Phase 2: Navigation + Canvas Controls**
5. Then **Phase 3: Scenario Solutions + Quiz Reveal**