# Git-Style Collaboration — Architecture Design

## Current State Model (Verified)

### Zustand Store (`gameStore.js`) — Persisted to localStorage (`nal-game-state`)
```typescript
interface GameState {
  // Navigation
  currentStage: Stage;
  gameMode: 'scenario' | 'random' | 'practice' | 'learn' | null;
  activeScenarioId: string | null;
  
  // Planning
  planningAnswers: Record<string, any>;
  hintsUsed: string[];
  quizScore: number | null;
  
  // Network (CORE - what gets versioned)
  network: {
    rfNodes: RFNode[];           // ReactFlow visual nodes
    rfEdges: RFEdge[];           // ReactFlow visual edges
    graph: {                     // Semantic graph for validation/simulation
      nodes: GraphNode[];        // { id, type, config }
      edges: GraphEdge[];        // { id, source, target, connectionType }
    };
    remainingResources: Record<string, number>;
  };
  
  // Stage Results
  validationResult: ValidationResult | null;
  scores: Scores;
  sdnState: SDNState | null;
  nfvState: NFVState | null;
  orchestrationState: OrchestrationState | null;
  simulationState: SimulationState | null;
}
```

### Network Graph (Semantic Model — `graphModel.js`)
```typescript
interface GraphNode {
  id: string;
  type: DeviceType;  // 'pc', 'router', 'l2Switch', 'l3Switch', 'firewall', 'server', 'accessPoint', 'cloud', 'laptop', 'wirelessController'
  config: {
    label?: string;
    ip?: string;
    interfaces?: InterfaceConfig[];  // { name, ip, mask }
    vlans?: number[];
    services?: string[];  // 'dhcp', 'dns'
    // ... other device-specific config
  };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  connectionType: 'ethernet' | 'wireless' | 'wan';
}
```

### Yjs Collaboration (Current — Mode B)
- **Document**: `Y.Doc` with `nodes` Map + `edges` Map
- **Sync**: Bidirectional Zustand ↔ Yjs via `window.__syncToYjs`
- **Awareness**: Peer cursors/presence via `provider.awareness`
- **Persistence**: `y-indexeddb` per project (`sdn-project-${projectId}`)
- **Server**: `ws://localhost:1234` room = projectId

---

## Proposed Architecture: Dual-Mode System

### Mode A: Independent Working Copies (Default)
```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER LOCAL STORAGE                       │
├─────────────────────────────────────────────────────────────────┤
│  Project Index (per browser)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ projectId → {                                            │   │
│  │   projectId, name, owner, createdAt, updatedAt,         │   │
│  │   workingCopyId, baseRevisionId, branchName             │   │
│  │ }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Working Copies (mutable, per-user)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ workingCopyId → {                                        │   │
│  │   workingCopyId, projectId, userId, baseRevisionId,     │   │
│  │   branchName, data: ProjectData, unsavedChanges,        │   │
│  │   lastSaved, createdAt                                  │   │
│  │ }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Revisions (immutable snapshots)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ revisionId → {                                           │   │
│  │   revisionId, projectId, parentRevisionId, branchName,  │   │
│  │   message, author, timestamp, data: ProjectData,        │   │
│  │   metadata                                              │   │
│  │ }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Proposals (local until shared)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ proposalId → {                                           │   │
│  │   proposalId, projectId, sourceWorkingCopyId,           │   │
│  │   targetRevisionId, title, description, author,         │   │
│  │   status, createdAt, updatedAt, diff: ProjectDiff       │   │
│  │ }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Mode B: Live Session (Opt-In)
```
┌─────────────────────────────────────────────────────────────────┐
│                     YJS WEBSOCKET SESSION                       │
├─────────────────────────────────────────────────────────────────┤
│  Room: live-{sessionId} (ephemeral, not projectId)             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Y.Doc: nodes Map + edges Map (real-time CRDT)           │   │
│  │ Awareness: cursors, selections, user info               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  On Session End:                                                │
│  1. Export Yjs doc → ProjectData                                │
│  2. "Save as Revision" → creates revision in Mode A storage    │
│  3. Discard Yjs doc (or keep for replay)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Project Identity
```typescript
interface ProjectIdentity {
  projectId: string;           // UUID v4, immutable
  name: string;                // User-defined
  owner: string;               // Anonymous user ID (localStorage)
  createdAt: number;           // Unix ms
  updatedAt: number;
  defaultBranch: string;       // 'main'
}
```

### Working Copy
```typescript
interface WorkingCopy {
  workingCopyId: string;       // UUID
  projectId: string;
  userId: string;              // Anonymous ID
  baseRevisionId: string;      // Revision this copy started from
  branchName: string;          // 'feature/xyz' or 'main'
  data: ProjectData;           // Full project state (see below)
  unsavedChanges: boolean;
  lastSaved: number | null;    // Timestamp of last revision save
  createdAt: number;
}
```

### Revision (Immutable Snapshot)
```typescript
interface ProjectRevision {
  revisionId: string;          // UUID
  projectId: string;
  parentRevisionId: string | null;
  branchName: string;
  message: string;             // Commit message
  description?: string;        // Optional longer description
  author: string;              // User ID
  timestamp: number;
  data: ProjectData;           // Complete serializable state
  metadata: RevisionMetadata;
}

interface RevisionMetadata {
  deviceCount: number;
  linkCount: number;
  stagesCompleted: string[];   // e.g., ['build', 'validate', 'sdn']
  validationScore: number;     // Overall score 0-100
  stages: {
    build: boolean;
    validate: boolean;
    sdn: boolean;
    nfv: boolean;
    orchestration: boolean;
    simulation: boolean;
  };
}
```

### Project Data (What Gets Versioned)
```typescript
interface ProjectData {
  // Core network topology
  network: {
    rfNodes: RFNode[];
    rfEdges: RFEdge[];
    graph: { nodes: GraphNode[]; edges: GraphEdge[] };
    remainingResources: Record<string, number>;
  };
  
  // Scenario context
  scenario: {
    activeScenarioId: string | null;
    gameMode: string | null;
    resourcePool: Record<string, number>;
  };
  
  // Stage states (all serializable)
  planningAnswers: Record<string, any>;
  hintsUsed: string[];
  quizScore: number | null;
  
  validationResult: ValidationResult | null;
  scores: Scores;
  sdnState: SDNState | null;
  nfvState: NFVState | null;
  orchestrationState: OrchestrationState | null;
  
  // NOT included (transient):
  // - simulationState (re-runnable)
  // - UI state (viewport, selected tabs, etc.)
  // - ARP/MAC caches (runtime only)
}
```

### Change Proposal
```typescript
interface ChangeProposal {
  proposalId: string;
  projectId: string;
  sourceWorkingCopyId: string;
  targetRevisionId: string;    // Base revision to merge into
  title: string;
  description: string;
  author: string;
  status: 'draft' | 'open' | 'approved' | 'changes_requested' | 'merged' | 'closed' | 'conflict';
  createdAt: number;
  updatedAt: number;
  diff: ProjectDiff;           // Semantic diff
  reviewers: Reviewer[];       // Future: user IDs
  mergedRevisionId?: string;   // Set after successful merge
  conflictResolution?: ConflictResolution;
}

interface Reviewer {
  userId: string;
  status: 'pending' | 'approved' | 'changes_requested';
  comment?: string;
  reviewedAt?: number;
}
```

### Semantic Diff
```typescript
interface ProjectDiff {
  devices: DeviceDiff;
  links: LinkDiff;
  ipAddresses: IPDiff;
  routing: RoutingDiff;
  sdn: SDNDiff;
  nfv: NFVDiff;
  orchestration: OrchestrationDiff;
  metadata: {
    summary: string;           // Human-readable summary
    breakingChanges: boolean;  // True if validation might fail
    changedEntityIds: string[]; // All affected stable IDs
  };
}

interface DeviceDiff {
  added: GraphNode[];
  removed: GraphNode[];
  modified: DeviceChange[];
}

interface DeviceChange {
  nodeId: string;
  type?: { from: string; to: string };
  config: ConfigChange[];
}

interface ConfigChange {
  path: string;                // e.g., 'config.interfaces[0].ip'
  from: any;
  to: any;
  changeType: 'added' | 'removed' | 'modified';
}

interface LinkDiff {
  added: GraphEdge[];
  removed: GraphEdge[];
  modified: LinkChange[];
}

interface LinkChange {
  edgeId: string;
  source?: { from: string; to: string };
  target?: { from: string; to: string };
  connectionType?: { from: string; to: string };
}

// Similar structures for IPDiff, RoutingDiff, SDNDiff, NFVDiff, OrchestrationDiff
```

### Conflict Resolution
```typescript
interface ConflictResolution {
  conflictId: string;
  proposalId: string;
  entityType: 'device' | 'link' | 'ip' | 'sdn' | 'nfv' | 'orchestration';
  entityId: string;
  baseValue: any;
  sourceValue: any;
  targetValue: any;
  resolution: 'source' | 'target' | 'manual';
  manualValue?: any;
  resolvedBy: string;
  resolvedAt: number;
}
```

---

## Storage Strategy

### Local Storage (Phase 1-4)
| Store | Key | Contents |
|-------|-----|----------|
| Project Index | `nal-projects-index` | `ProjectIdentity[]` |
| Working Copies | `nal-workingcopy-${workingCopyId}` | `WorkingCopy` |
| Revisions | `nal-revision-${revisionId}` | `ProjectRevision` |
| Proposals | `nal-proposal-${proposalId}` | `ChangeProposal` |
| User Identity | `nal-user-identity` | `{ userId, displayName }` |

**Capacity**: ~5-10MB per project (localStorage limit ~5-10MB)
- Compress with LZ-string if needed
- Limit history to 50 revisions per project (configurable)
- Auto-cleanup draft proposals after 30 days

### Future: Backend Storage (Phase 5+)
| Entity | Backend Table | Sync Strategy |
|--------|---------------|---------------|
| Projects | `projects` | Primary source of truth |
| Revisions | `revisions` | Append-only, immutable |
| Proposals | `proposals` | CRUD with status transitions |
| Working Copies | `working_copies` | Per-user, sync on demand |
| Conflicts | `conflicts` | Linked to proposals |

---

## Semantic Diff Algorithm

### Identity Resolution
- **Devices**: Match by stable `id` (not array index)
- **Links**: Match by stable `id` (or `source`+`target` composite)
- **IPs**: Match by `deviceId` + `interfaceName` + `ip`
- **SDN Policies**: Match by `policyId`
- **VNF Deployments**: Match by `deploymentId`
- **Service Chain**: Match by ordered `deploymentId` sequence

### Diff Steps
```typescript
function computeDiff(base: ProjectData, target: ProjectData): ProjectDiff {
  // 1. Devices
  const baseDevices = new Map(base.network.graph.nodes.map(n => [n.id, n]));
  const targetDevices = new Map(target.network.graph.nodes.map(n => [n.id, n]));
  
  const added = [...targetDevices.values()].filter(n => !baseDevices.has(n.id));
  const removed = [...baseDevices.values()].filter(n => !targetDevices.has(n.id));
  const modified = [...targetDevices.values()]
    .filter(n => baseDevices.has(n.id))
    .map(n => computeDeviceChange(baseDevices.get(n.id)!, n))
    .filter(c => c.config.length > 0 || c.type);
  
  // 2. Links (similar)
  // 3. IPs (extract from device configs)
  // 4. Routing (compare router spanning results)
  // 5. SDN (compare policies, flowRules)
  // 6. NFV (compare deployments, serviceChain)
  // 7. Orchestration (compare instances, actions, load)
  
  return { devices: { added, removed, modified }, ... };
}
```

### Breaking Change Detection
- IP collision: two devices claim same IP/subnet
- Missing gateway: device has IP but no router on path
- Invalid link: edge references non-existent node
- SDN policy references deleted node
- Service chain references undeployed VNF

---

## Merge Algorithm (Three-Way)

```typescript
function threeWayMerge(
  base: ProjectData,
  source: ProjectData,  // Proposal changes
  target: ProjectData   // Current main
): MergeResult {
  
  const diffSource = computeDiff(base, source);
  const diffTarget = computeDiff(base, target);
  
  const conflicts: Conflict[] = [];
  const merged = deepClone(target);
  
  // For each entity type (devices, links, IPs, SDN, NFV, Orchestration)
  for (const entity of ENTITY_TYPES) {
    const sourceChanges = diffSource[entity];
    const targetChanges = diffTarget[entity];
    
    // Non-conflicting: only one side changed
    const onlyInSource = sourceChanges.filter(c => !targetChanges.has(c.entityId));
    const onlyInTarget = targetChanges.filter(c => !sourceChanges.has(c.entityId));
    
    applyChanges(merged, onlyInSource);  // Accept source changes
    // Target changes already in merged (cloned from target)
    
    // Conflicting: both sides changed same entity
    const bothChanged = sourceChanges.filter(c => targetChanges.has(c.entityId));
    for (const change of bothChanged) {
      if (!changesEqual(change, targetChanges.get(change.entityId))) {
        conflicts.push({ entityId: change.entityId, entityType: entity, ... });
      }
    }
  }
  
  if (conflicts.length > 0) {
    return { success: false, conflicts, merged: null };
  }
  
  // Validate merged topology
  const validation = validateNetwork(merged);
  if (!validation.valid) {
    return { success: false, conflicts: [], validationErrors: validation.errors };
  }
  
  return { success: true, merged, conflicts: [] };
}
```

---

## Integration with Existing Collaboration

### What Stays (Mode B - Live Sessions)
- `CollaborationProvider.jsx` — Yjs + WebSocket + IndexedDB
- `server.js` — WebSocket relay
- `useCollaboration()` — connection status, peer count
- Awareness for cursors/presence

### What Changes
| Current | New |
|---------|-----|
| Single Yjs doc per projectId | Yjs doc only for live sessions (`live-{sessionId}`) |
| Auto-sync on every edit | Manual "Save Revision" creates snapshot |
| No history | Full revision history in localStorage |
| No conflict resolution | Three-way merge with validation |

### Bridge: Live Session → Revision
```typescript
async function endLiveSession(sessionId: string, saveAsRevision: boolean) {
  if (!saveAsRevision) return;
  
  const ydoc = getLiveSessionDoc(sessionId);
  const projectData = yjsToProjectData(ydoc);
  
  // Create revision from session state
  const revision = createRevision({
    projectId: getProjectIdFromSession(sessionId),
    parentRevisionId: getBaseRevisionId(sessionId),
    message: `Live session: ${new Date().toLocaleTimeString()}`,
    data: projectData
  });
  
  // Clean up live session
  destroyLiveSession(sessionId);
  
  return revision;
}
```

---

## Validation & Permission Boundaries

### Client-Side (Current)
- NetworkGraph invariants (valid links, no duplicate IDs)
- Revision data schema validation
- Merge validation before accept

### Server-Side (Future)
| Action | Permission Required |
|--------|---------------------|
| Create project | Any authenticated user |
| Save revision | Project owner or collaborator |
| Create proposal | Project owner or collaborator |
| Approve proposal | Reviewer or owner |
| Merge proposal | Owner only |
| Delete revision | Owner only |
| Manage collaborators | Owner only |

### Current Limitation
**No authentication system exists** — all users are anonymous with localStorage userId. Phase 1-4 work entirely client-side. Phase 5 adds backend auth.

---

## Migration Path

### Existing Projects
- On first load with new code: auto-create `WorkingCopy` from current localStorage state
- Base revision = "Initial import" (virtual revision)
- Preserve all existing stage progress

### Existing Live Collaboration Users
- Continue working — "Start Live Session" uses same Yjs infrastructure
- Session data can be saved as revision when ended
- No breaking changes to current workflow

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| localStorage quota exceeded | Medium | High | Compress, limit history, warn user |
| Revision corruption on save | Low | High | Atomic write (write to temp key, then rename) |
| Merge produces invalid topology | Medium | High | Validate before accept, keep originals |
| User confusion: two modes | Medium | Medium | Clear UI labels, onboarding tooltip |
| Lost work on browser close | Low | High | Auto-save working copy every 30s |
| Concurrent save conflicts | Low | Medium | localStorage is single-threaded per origin |
| Yjs/IndexedDB version mismatch | Low | Medium | Pin versions, test upgrade path |

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Snapshots over deltas | Simpler, more robust, storage cheap for this data size |
| localStorage for Phase 1 | No backend needed, works offline, matches current architecture |
| UUIDs for all IDs | Globally unique, no coordination needed |
| Three-way merge | Standard, understandable, handles stale base |
| Semantic diff categories | Matches domain model, enables readable UI |
| Live session = separate Yjs doc | Isolates experimental edits from saved history |
| No auth in Phase 1-4 | Keeps scope manageable, adds real value first |