# Git-Style Collaboration — UX Design

## Current UI Audit

### Existing Top Navigation (`TopNav` in `App.jsx`)
- Brand/logo → Home
- Breadcrumb (stage progress)
- **Collaboration status**: Connection indicator (● green/amber) + Project ID (clickable → Share Project dropdown)
- Quit button (when in scenario)

### Network Builder (`NetworkBuilder.jsx`)
- Left: Palette (device inventory)
- Center: ReactFlow canvas
- Right: Config panel (device details) / Console tab
- Bottom: Validate button → goes to Validation stage

### Simulation Stage (`SimulationStage.jsx`)
- Toggle: "Event-Driven Simulation" ↔ "Animated Network Journey"
- Source/Dest selectors
- Run journey, playback controls, timeline, inspector
- Fault injection panel

---

## Proposed UI Additions

### 1. Project Menu (Top Nav — Right Side)

```
┌─────────────────────────────────────────────────────────────┐
│ Network Lab  [Scenario ▼]  [Build ▼]  [SDN ▼]  [Project ▼]  ● abc1234 +1 other  [Quit]
└─────────────────────────────────────────────────────────────┘
```

**Project dropdown menu** (replaces current Share Project dropdown):

```
┌──────────────────────────────────┐
│ Project                          │
├──────────────────────────────────┤
│ ● Current: campus-network        │
│   (working copy of R3)           │
├──────────────────────────────────┤
│ Save Revision…           Ctrl+S  │
│ Revision History…        Ctrl+H  │
├──────────────────────────────────┤
│ Create Working Copy…             │
│ Propose Changes…                 │
├──────────────────────────────────┤
│ Live Collaboration               │
│   Start Session…                 │
│   Join Session…                  │
├──────────────────────────────────┤
│ Export Project (.json)           │
│ Import Project (.json)           │
├──────────────────────────────────┤
│ Share Project Link…              │
│   (copies ?project= URL)         │
└──────────────────────────────────┘
```

### 2. Revision History Panel (Slide-out / Modal)

**Trigger**: Project Menu → "Revision History" or `Ctrl+H`

```
┌─────────────────────────────────────────────────────────────────┐
│ Revision History                          [×]    [New Branch]   │
├─────────────────────────────────────────────────────────────────┤
│ Branch: main                                            [Filter]│
├─────────────────────────────────────────────────────────────────┤
│ ▼ R5  "Added firewall + routing fix"    Abhay  2h ago  92%    │
│     Parent: R4  |  Devices: 12  Links: 14  Score: 92%          │
│                                                                    │
│ ▼ R4  "Completed NFV service chain"     Abhay  5h ago  87%    │
│     Parent: R3  |  Devices: 10  Links: 12  Score: 87%          │
│                                                                    │
│ ▼ R3  "Build complete — ready for SDN"  Abhay  1d ago  75%    │
│     Parent: R2  |  Devices: 8  Links: 10  Score: 75%           │
│                                                                    │
│   R2  "Initial topology"                Abhay  2d ago  45%    │
│     Parent: R1  |  Devices: 6  Links: 7  Score: 45%            │
│                                                                    │
│   R1  "Scenario started"                Abhay  2d ago  10%    │
│     Parent: —  |  Devices: 0  Links: 0  Score: 10%             │
├─────────────────────────────────────────────────────────────────┤
│ [Compare Selected]  [Load Revision]  [Restore as New]  [Delete] │
└─────────────────────────────────────────────────────────────────┘
```

**Row actions on hover/click**:
- **Compare** → Opens diff view (R5 vs R4, or R5 vs Working Copy)
- **Load** → Switch working copy to this revision (warn if unsaved changes)
- **Restore as New** → Creates R6 with R5's content (preserves history)
- **Delete** → Only for draft/unmerged revisions (confirmation required)

### 3. Save Revision Dialog

**Trigger**: Project Menu → "Save Revision" or `Ctrl+S`

```
┌─────────────────────────────────────────────────────────────────┐
│ Save Revision                                              [×]  │
├─────────────────────────────────────────────────────────────────┤
│ Title: [Added firewall and fixed routing              ]        │
│                                                                    │
│ Description:                                                        │
│ [Deployed vFirewall on Server-1, configured allow-list for      ]  │
│ [internal traffic. Updated OSPF costs on Router-Core to prefer ]  │
│ [the new DMZ path. Ready for SDN policy validation.             ]  │
│                                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Base Revision: R4 "Completed NFV service chain"        [change]  │
│ Branch: main                                                       │
│                                                                    │
│ Devices: 12  |  Links: 14  |  Validation: 92%  |  Stages: 6/10  │
├─────────────────────────────────────────────────────────────────┤
│                    [Cancel]          [Save Revision]             │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Create Working Copy Dialog

**Trigger**: Project Menu → "Create Working Copy" (from History panel or any revision)

```
┌─────────────────────────────────────────────────────────────────┐
│ Create Working Copy                                        [×]  │
├─────────────────────────────────────────────────────────────────┤
│ Source: R5 "Added firewall + routing fix" (main)               │
│                                                                    │
│ Working Copy Name: [campus-network-firewall-experiment   ]      │
│                                                                    │
│ Description (optional):                                           │
│ [Experiment with alternate firewall rules for the DMZ segment  ]  │
│                                                                    │
│ Branch: [feature/dmz-firewall-rules                    ▼]        │
│                                                                    │
├─────────────────────────────────────────────────────────────────┤
│ This creates an independent working copy. Changes will not      │
│ affect the original project until you propose and merge them.   │
├─────────────────────────────────────────────────────────────────┤
│                    [Cancel]          [Create Copy]               │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Propose Changes Dialog

**Trigger**: Project Menu → "Propose Changes" (when working copy has unsaved changes vs base)

```
┌─────────────────────────────────────────────────────────────────┐
│ Propose Changes                                            [×]  │
├─────────────────────────────────────────────────────────────────┤
│ Source: Working Copy "campus-network-firewall-experiment"      │
│ Base: R5 "Added firewall + routing fix" (main)                 │
│                                                                    │
│ Title: [DMZ firewall rule refinement                          ]  │
│                                                                    │
│ Description:                                                       │
│ [Refined firewall allow-list to restrict DMZ→Internal traffic  ]  │
│ [to only HTTPS (443) and DNS (53). Added logging rule for      ]  │
│ [denied traffic. Updated service chain order.                  ]  │
│                                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Changes Summary:                                                  │
│ • Modified: vFirewall config (allow-list, logging)              │
│ • Modified: Service chain order (Firewall → LB → NAT)           │
│ • Added: SDN policy "dmz-to-internal-https-only"                │
│                                                                    │
├─────────────────────────────────────────────────────────────────┤
│                    [Cancel]          [Create Proposal]           │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Proposal List / Review Panel

**Location**: New tab in Simulation/Results stage, or dedicated Review stage

```
┌─────────────────────────────────────────────────────────────────┐
│ Change Proposals                                    [Filter ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ ▼ #7  "DMZ firewall rule refinement"       OPEN    Abhay  1h   │
│     Source: feature/dmz-firewall-rules → Target: main (R5)     │
│     Changes: 3 modified, 1 added  |  Reviewers: 1/1 approved   │
│     [View Diff]  [Approve]  [Request Changes]  [Merge]         │
│                                                                    │
│   #6  "Alternate routing for backup link"    MERGED  Priya  2d  │
│     Source: feature/backup-routing → Target: main (R4)         │
│     Merged as R5  |  [View Diff]  [View Merged Revision]       │
│                                                                    │
│   #5  "Add load balancer VNF"                CLOSED  Rahul  3d  │
│     Source: feature/lb-vnf → Target: main (R3)                 │
│     Conflict with #4  |  [View Diff]  [Reopen]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7. Comparison / Diff View

**Trigger**: Click "View Diff" on proposal, or "Compare" in History

```
┌─────────────────────────────────────────────────────────────────┐
│ Comparing: Working Copy → R5 (main)                    [×]      │
├─────────────────────────────────────────────────────────────────┤
│ [Summary]  [Devices]  [Links]  [IPs]  [SDN]  [NFV]  [Orchest.]  │
├─────────────────────────────────────────────────────────────────┤
│ DEVICES (3 changes)                                              │
│ ├─  🔵 MODIFIED  vFirewall (vFirewall-1)                        │
│ │   Config: allow-list updated                                   │
│ │   Before: [192.168.0.0/16:80,443,53]                          │
│ │   After:  [192.168.0.0/16:443,53] + logging rule             │
│ │                                                                    │
│ ├─  🔵 MODIFIED  Service Chain                                  │
│ │   Order: Firewall → LB → NAT                                  │
│ │   Before: Firewall → NAT → LB                                 │
│ │                                                                    │
│ └─  🟢 ADDED     SDN Policy "dmz-to-internal-https-only"       │
│     Priority: 100  |  Match: dst=10.0.0.0/8, proto=tcp, port=443│
│     Action: allow                                               │
│                                                                    │
├─────────────────────────────────────────────────────────────────┤
│ [← Back to Proposal]                    [Approve & Merge]       │
└─────────────────────────────────────────────────────────────────┘
```

**Tab breakdown**:
- **Summary** — All changes grouped by category
- **Devices** — Added/removed/modified nodes
- **Links** — Added/removed/modified connections
- **IPs** — Interface IP changes, subnet changes
- **SDN** — Policy/flow rule changes
- **NFV** — VNF deployments, service chain changes
- **Orchestration** — Instance config, scaling policies

### 8. Conflict Resolution View

```
┌─────────────────────────────────────────────────────────────────┐
│ Conflict: vFirewall configuration                          [×]  │
├─────────────────────────────────────────────────────────────────┤
│ Base (R5)          │ Source (Proposal #7)    │ Target (main)   │
│ ──────────────────┼─────────────────────────┼──────────────────│
│ allow: [80,443,53] │ allow: [443,53]         │ allow: [80,443] │
│ log: none          │ log: denied             │ log: none       │
├─────────────────────────────────────────────────────────────────┤
│ Resolution:                                                       │
│ ○ Use Source (Proposal #7)  — Restrict to HTTPS+DNS, add logging│
│ ○ Use Target (main)         — Keep HTTP+HTTPS, no logging       │
│ ● Manual Edit               — Custom configuration               │
│                                                                    │
│ [Manual Editor]                                                   │
│ allow: [________________________]  Port list (comma-separated)  │
│ log: [☑ denied  ☐ allowed  ☐ all]                               │
│                                                                    │
│ [Validate]  [Cancel]  [Apply Resolution & Continue Merge]       │
└─────────────────────────────────────────────────────────────────┘
```

### 9. Live Collaboration Panel (Optional Mode)

**Trigger**: Project Menu → "Live Collaboration" → "Start Session"

```
┌─────────────────────────────────────────────────────────────────┐
│ Live Session: campus-network                          [×]       │
├─────────────────────────────────────────────────────────────────┤
│ Session ID: live-abc123  |  Status: ● Connected (3 users)      │
│                                                                    │
│ Participants:                                                      │
│ ● Abhay (you)          — Editing Router-Core                     │
│ ● Priya                — Configuring vFirewall                   │
│ ● Rahul                — Viewing                                 │
│                                                                    │
│ [Share Session Link]  [Copy Link]                                │
│                                                                    │
│ ⚠ Changes in this session are NOT saved to revision history.     │
│ When you end the session, you can "Save as Revision".           │
├─────────────────────────────────────────────────────────────────┤
│                    [End Session → Save as Revision]              │
└─────────────────────────────────────────────────────────────────┘
```

**During live session**:
- Small colored cursors on canvas with user names
- Top nav shows "LIVE" badge
- Edits sync in real-time (current Yjs behavior)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save Revision |
| `Ctrl+H` | Open Revision History |
| `Ctrl+Shift+S` | Create Working Copy |
| `Ctrl+Shift+P` | Propose Changes |
| `Ctrl+Shift+L` | Start Live Session |

---

## Empty / Loading / Error States

| State | UI |
|-------|----|
| No revisions yet | "No revisions saved. Make changes and click 'Save Revision'." |
| No proposals | "No change proposals. Create one from your working copy." |
| Loading history | Skeleton rows with pulse animation |
| Failed to save | Inline error: "Failed to save revision. Try again." |
| Conflict on load | "Working copy has unsaved changes. Save or discard before loading revision." |
| Stale base on merge | "Target has new revisions (R6, R7). Update proposal or rebase." |

---

## Responsive Behavior

- **Desktop (≥1024px)**: History panel as slide-out (400px), diff view as modal (800px)
- **Tablet (768-1023px)**: History as bottom sheet, diff as full-screen modal
- **Mobile (<768px)**: All panels full-screen modals, simplified diff cards

---

## Integration Points

| Feature | Current Component | Integration |
|---------|------------------|-------------|
| Project Menu | `TopNav` in `App.jsx` | Add dropdown |
| Revision History | New `RevisionHistory.jsx` | Modal/slide-out |
| Save Revision | New `SaveRevisionDialog.jsx` | Called from builder + simulation |
| Working Copy | `ProjectManager.createWorkingCopy()` | Menu action |
| Propose Changes | New `ProposeChangesDialog.jsx` | Menu action |
| Diff View | New `DiffViewer.jsx` | From history/proposals |
| Live Session | Extend `CollaborationProvider` | Menu action, reuses Yjs |

---

## Design Tokens (Reuse Existing)

```css
/* From index.css */
--c-bg: #0b1220;
--c-bg-elevated: #111927;
--c-bg-glass: rgba(17, 25, 39, 0.8);
--c-border: #1e293b;
--c-border-lit: #334155;
--c-text: #e2e8f0;
--c-text-dim: #94a3b8;
--c-text-muted: #64748b;
--c-accent: #38bdf8;
--c-accent-soft: rgba(56, 189, 248, 0.15);
--c-success: #22c55e;
--c-warning: #f59e0b;
--c-error: #ef4444;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--shadow-lg: 0 10px 40px rgba(0,0,0,0.4);
```

---

## Accessibility

- All dialogs: focus trap, `Esc` to close, `Tab` navigation
- Color + icon + text for status (not color alone)
- Semantic HTML: `<dialog>`, `<menu>`, `<button>`
- ARIA labels on icon-only buttons
- Reduced motion: disable panel animations
- Screen reader: revision list as `<ol>`, diff as `<table>`