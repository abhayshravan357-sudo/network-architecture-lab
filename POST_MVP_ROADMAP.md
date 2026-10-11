# Post-MVP Roadmap — SDN/NFV Architecture Lab

**Version:** 0.1.0 (MVP) → 0.2.0+  
**Date:** 2026-10-11  
**Status:** Post-MVP planning — not committed, for prioritization only

---

## Roadmap Philosophy

This roadmap captures valuable enhancements that were deliberately deferred during MVP finalization. Each item is classified by impact, effort, and dependency on the current architecture.

**Prioritization Framework:**
- **Impact:** User value × educational effectiveness
- **Effort:** Development time + architectural risk
- **Dependency:** Requires backend? Breaking changes? New infrastructure?

---

## Phase 2: Semantic Comparison (Diff Engine)

**Target:** 0.2.0 | **Effort:** 3-4 weeks | **Impact:** High

### Features
| Feature | Description | Acceptance |
|---------|-------------|------------|
| Device diff | Added/removed/modified nodes with config details | "Compare" shows firewall added, IP changed |
| Link diff | Added/removed/modified connections | Shows link rerouted after failure |
| IP address diff | Interface IP/subnet changes per device | Before/after per interface |
| SDN diff | Policy add/remove/modify, flow rule changes | Priority changes visible |
| NFV diff | VNF deploy/remove, service chain reorder | Chain order changes highlighted |
| Orchestration diff | Instance config, scaling policy changes | Scale thresholds visible |
| Breaking change detection | IP collisions, missing gateways, invalid refs | Red warning badge on diff |

### Technical Approach
- Extend `DiffEngine.js` with per-entity comparators
- Use stable IDs (not array position) for identity matching
- Reuse `NetworkGraph` helpers for routing/SDN comparisons
- Tabbed UI in `DiffViewer.jsx` (Summary/Devices/Links/IPs/SDN/NFV/Orch)

### Dependencies
- Requires Phase 1 revision history (✅ done)
- No backend required

---

## Phase 3: Change Proposals & Review

**Target:** 0.3.0 | **Effort:** 3-4 weeks | **Impact:** High

### Features
| Feature | Description | Acceptance |
|---------|-------------|------------|
| Create proposal | From working copy vs base revision | Dialog with auto-generated diff summary |
| Proposal states | Draft → Open → Approved/Changes Requested → Merged/Closed | Status badge, transitions enforced |
| Review comments | Threaded comments on proposals | Markdown support, @mentions |
| Approval workflow | Required approvals before merge | Configurable reviewer count |
| Stale base detection | Warn if target has new revisions | "Target advanced to R7, update proposal" |
| Proposal list | Filter by status, author, date | Dashboard in new "Review" tab |

### Technical Approach
- `ProposalManager.js` with localStorage persistence
- `ProposalList.jsx` + `ProposalDetail.jsx` components
- Integrate with existing `ProjectMenu` ("Propose Changes")
- Reuse `DiffEngine` for proposal diff

### Dependencies
- Requires Phase 2 diff engine
- No backend required (local-first)

---

## Phase 4: Safe Merge & Conflict Resolution

**Target:** 0.4.0 | **Effort:** 2-3 weeks | **Impact:** High

### Features
| Feature | Description | Acceptance |
|---------|-------------|------------|
| Three-way merge | Base → Source + Target → Merged | Non-conflicting changes auto-merged |
| Conflict detection | Same entity modified both sides | Conflict badge, resolution UI |
| Resolution options | Choose Source / Target / Manual edit | Per-conflict picker |
| Validation gate | Post-merge NetworkGraph validation | Reject invalid topologies |
| Merge commit | Creates new revision on target | Preserves source/target history |
| Conflict types | Device config, link endpoints, IP collision, SDN policy, service chain | All handled |

### Conflict Types to Handle
| Type | Example | Resolution |
|------|---------|------------|
| Device config | Both changed firewall allow-list | Source / Target / Manual |
| Link endpoints | Both moved same link | Source / Target / Manual |
| Delete vs modify | One deleted, other modified | Recreate / Keep deleted |
| IP collision | Two devices claim same IP | Manual only (auto-reject) |
| SDN policy | Same policy modified | Source / Target / Manual |
| Service chain | Order changed both sides | Source / Target / Manual |

### Technical Approach
- `MergeEngine.js` with three-way merge algorithm
- `ConflictResolution.jsx` UI with side-by-side comparison
- Validation via `NetworkGraph` before accept
- Atomic: original revisions never modified

### Dependencies
- Requires Phase 3 proposals
- No backend required

---

## Phase 5: Shared Persistence & Permissions

**Target:** 0.5.0 | **Effort:** 6-8 weeks | **Impact:** Medium-High | **Requires Backend**

### Features
| Feature | Description |
|---------|-------------|
| User authentication | Email/OAuth, anonymous fallback |
| Project ownership | Creator = owner, transferable |
| Collaborator roles | Owner, Reviewer, Contributor, Viewer |
| Backend API | REST for projects, revisions, proposals |
| Real-time sync | WebSocket for proposal updates, not topology |
| Cross-device access | Projects survive browser/device change |
| Audit log | Who did what when |

### Technical Approach
| Component | Technology |
|-----------|------------|
| API Server | Node/Express or Python/FastAPI |
| Database | PostgreSQL (projects, revisions, proposals) |
| Auth | JWT or NextAuth.js |
| WebSocket | Socket.io for real-time proposal notifications |
| Migration | localStorage → backend sync on first login |

### Architecture Changes
- `ProjectManager.js` gets `BackendAdapter` interface
- Local-first: works offline, syncs when online
- Conflict resolution: last-write-wins for local, server-authoritative for shared

### Risks
- Significant infrastructure requirement
- Authentication complexity
- Data migration from localStorage
- Hosting costs

---

## Phase 6: Live Session → Revision Bridge

**Target:** 0.3.x (parallel) | **Effort:** 2 weeks | **Impact:** Medium

### Features
| Feature | Description |
|---------|-------------|
| Start Live Session | Creates `live-{sessionId}` Yjs room |
| Join Session | Enter session ID, real-time cursors |
| Session UI | Participant list, "End Session" button |
| Save as Revision | On exit → prompt to save session as revision |
| Isolation | Live session never touches working copies |

### Technical Approach
- Extend `CollaborationProvider` for multi-doc support
- `LiveSessionManager.js` for session lifecycle
- `LiveSessionPanel.jsx` UI
- On save: export Yjs doc → `ProjectManager.createRevision()`

### Dependencies
- Existing Yjs infrastructure (✅ done)
- Phase 1 revision system (✅ done)

---

## Phase 7: Enhanced Educational Features

**Target:** Ongoing | **Effort:** Variable | **Impact:** High

### Features
| Feature | Description | Effort |
|---------|-------------|--------|
| Scenario expansion | Hospital, campus, data center, branch office | 1 week each |
| Guided tutorials | Step-by-step overlays for first-time users | 2 weeks |
| Concept quizzes | Embedded checks in Learn stage | 1 week |
| Packet trace export | Download trace as JSON/PCAP | 1 week |
| Custom scenarios | User-defined requirements + validation | 3 weeks |
| Multi-language | i18n for UI + scenario text | 2 weeks |

### Scenario Ideas
| Scenario | Focus |
|----------|-------|
| Hospital | Medical devices, VLANs, guest network, HIPAA |
| University campus | Multi-building, wireless, eduroam, dorms |
| Branch office | WAN, VPN, SD-WAN, failover |
| Cloud migration | Hybrid, load balancer, auto-scale, blue-green |
| Industrial IoT | OT/IT segmentation, MQTT, deterministic latency |

---

## Phase 8: Advanced Simulation & Visualization

**Target:** 0.6.0+ | **Effort:** 4-6 weeks | **Impact:** Medium

### Features
| Feature | Description |
|---------|-------------|
| Concurrent flows | Multiple packet journeys simultaneously |
| Bandwidth visualization | Link utilization heatmap |
| Protocol detail | TCP handshake, TLS, DNS in journey |
| Custom fault types | Controller-down, VNF-crash, bandwidth-exhausted |
| Time-travel debugging | Scrub through simulation timeline |
| Export animation | GIF/MP4 of journey for reports |

### Technical Considerations
- May require Web Workers for simulation off main thread
- Canvas/WebGL for large topology performance
- State serialization for time-travel

---

## Phase 9: Platform & Infrastructure

**Target:** Ongoing | **Effort:** Variable | **Impact:** Medium

| Area | Improvements |
|------|--------------|
| **Performance** | Virtualized lists for large histories, memoization audit |
| **Accessibility** | Full WCAG 2.1 AA, keyboard nav, screen reader testing |
| **Mobile/Responsive** | Touch-friendly builder, collapsible panels |
| **Testing** | Playwright E2E, visual regression (Chromatic) |
| **CI/CD** | GitHub Actions: test → build → deploy preview → production |
| **Monitoring** | Error tracking (Sentry), analytics (Plausible) |
| **Documentation** | Auto-generated API docs, interactive tutorials |

---

## Prioritization Matrix

| Phase | Impact | Effort | Risk | Dependencies | Recommended Order |
|-------|--------|--------|------|--------------|-------------------|
| 2: Semantic Diff | High | Medium | Low | Phase 1 ✅ | **1st** |
| 3: Proposals & Review | High | Medium | Low | Phase 2 | **2nd** |
| 4: Safe Merge | High | Medium | Medium | Phase 3 | **3rd** |
| 6: Live Session Bridge | Medium | Low | Low | Phase 1 ✅ | **4th** (parallel) |
| 7: Educational Features | High | Variable | Low | None | **Ongoing** |
| 8: Advanced Simulation | Medium | High | Medium | Phases 2-4 | **5th** |
| 5: Backend Persistence | Medium-High | High | High | Phases 2-4 | **6th** (when funded) |
| 9: Platform | Medium | Variable | Low | None | **Ongoing** |

---

## Resource Estimates

| Phase | Dev Weeks | Backend? | New Infra? |
|-------|-----------|----------|------------|
| 2: Diff | 3-4 | No | No |
| 3: Proposals | 3-4 | No | No |
| 4: Merge | 2-3 | No | No |
| 6: Live Bridge | 2 | No | No |
| 7: Education | Ongoing | No | No |
| 8: Advanced Sim | 4-6 | No | Maybe (Workers) |
| 5: Backend | 6-8 | **Yes** | **Yes** |
| 9: Platform | Ongoing | Maybe | Maybe |

---

## Decision Framework for Next Steps

### Implement Next If:
- User feedback requests specific feature
- Educational pilot needs specific scenario
- Grant/funding available for backend work

### Defer If:
- No immediate user demand
- Current MVP meets demonstration goals
- Team capacity focused on stability

### Kill If:
- Feature doesn't align with educational mission
- Maintenance burden exceeds value
- Better solved by external tool integration

---

## Success Metrics (Post-MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scenario completion rate | >70% | Analytics event |
| Time to first simulation | <10 min | Session timing |
| Collaboration session length | >15 min | WebSocket duration |
| Revision save frequency | >3 per project | localStorage count |
| Proposal merge rate | >50% | Proposal status |
| Return user rate | >40% | 7-day retention |
| Export/import usage | >20% of projects | Button clicks |

---

## Conclusion

The MVP delivers a **complete, tested, demonstrable educational platform** for SDN/NFV architecture. The post-MVP roadmap extends this with GitHub-style collaboration (Phases 2-4), enhanced education (Phase 7), and optional backend persistence (Phase 5).

**Recommended immediate next step:** Deploy MVP to GitHub Pages and gather user feedback before committing to Phase 2+.

---

*This roadmap is a living document. Update based on user feedback, team capacity, and strategic priorities.*