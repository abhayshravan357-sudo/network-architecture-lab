# MVP Release Guide — SDN/NFV Architecture Lab

**Version:** 0.1.0 (MVP)  
**Date:** 2026-10-11  
**Repository:** https://github.com/abhayshravan357-sudo/network-architecture-lab/

---

## 1. Prerequisites

| Requirement | Version | Install Command |
|-------------|---------|-----------------|
| Node.js | 18+ | `nvm install 18` or download from nodejs.org |
| npm | 9+ | Included with Node.js |
| Git | 2.30+ | `apt install git` / `brew install git` |

---

## 2. Local Development Setup

```bash
# Clone repository
git clone https://github.com/abhayshravan357-sudo/network-architecture-lab.git
cd network-architecture-lab

# Install dependencies
npm install

# Start WebSocket collaboration server (required for live collaboration)
node server.js
# → "Yjs WebSocket server running on port 1234"

# Start development server (separate terminal)
npm run dev
# → "VITE v5.4.21 ready in 200ms"
# → Local: http://localhost:5173/network-architecture-lab/
```

### Verify Installation

1. Open http://localhost:5173/network-architecture-lab/
2. Home screen should load with scenario cards
3. Top nav shows project ID (e.g., `abc1234…`)
4. Click "Small Office" → should enter Briefing stage

---

## 3. Running Tests

```bash
# Run all tests
npm test

# Expected output:
# Test Files  7 passed (7)
# Tests      56 passed (56)
```

---

## 4. Production Build

```bash
# Create production build
npm run build

# Output in dist/
# Main bundle: ~110KB gzipped
```

### Build Output Structure
```
dist/
├── index.html
├── assets/
│   ├── index-<hash>.js      (main bundle)
│   ├── index-<hash>.css
│   └── <chunk>-<hash>.js    (lazy-loaded stages)
```

---

## 5. Deployment to GitHub Pages

### Automatic (GitHub Actions)

The repository is configured for GitHub Pages deployment. Push to `main` triggers deployment.

### Manual Deployment

```bash
# Build
npm run build

# Deploy dist/ to GitHub Pages
# Option 1: GitHub Pages settings → Source: Deploy from branch → gh-pages
# Option 2: Use gh-pages package
npx gh-pages -d dist

# Live URL: https://abhayshravan357-sudo.github.io/network-architecture-lab/
```

### Critical: Base Path Configuration

The `vite.config.js` **must** have:
```js
export default defineConfig({
  base: '/network-architecture-lab/',  // REQUIRED for GitHub Pages
  // ...
});
```

### SPA Routing on GitHub Pages

GitHub Pages doesn't support SPA fallback natively. Options:

1. **404.html redirect** (recommended):
   - Copy `dist/index.html` to `dist/404.html`
   - Add to `index.html`:
     ```html
     <script>
       (function() {
         var path = window.location.pathname;
         if (path.endsWith('/404.html')) {
           var project = new URLSearchParams(window.location.search).get('project');
           window.location.replace('/network-architecture-lab/' + (project ? '?project=' + project : ''));
         }
       })();
     </script>
     ```

2. **Hash routing** (alternative): Change React Router to `HashRouter`

---

## 6. Running the Application

### For Demonstration

```bash
# Terminal 1: WebSocket server
node server.js

# Terminal 2: Dev server (or serve dist/ for production)
npm run dev

# Open browser
open http://localhost:5173/network-architecture-lab/
```

### Sharing a Project for Collaboration

1. Click the **project ID** in top navigation (shows as `abc1234…`)
2. Click **"Copy Link"** in the dropdown
3. Share the full URL (includes `?project=<uuid>`)
4. Recipient opens URL → both users see same topology
5. Top nav shows `+N other` when peers connected

**Requirements for collaboration:**
- Both users must have WebSocket server running (`node server.js` on port 1234)
- Both must use the **exact same URL** with `?project=` parameter

---

## 7. Environment Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_WS_URL` | No | `ws://localhost:1234` | WebSocket server URL |

Create `.env` file for custom WebSocket URL:
```bash
echo "VITE_WS_URL=ws://your-server:1234" > .env
```

---

## 8. Project Structure (Key Files)

```
├── dist/                    # Production build output
├── src/
│   ├── App.jsx             # Main app, routing, top nav, dialogs
│   ├── main.jsx            # React entry point
│   ├── state/gameStore.js  # Zustand store (persisted to localStorage)
│   ├── engine/             # Simulation, SDN, NFV, Orchestration, Validation
│   ├── components/
│   │   ├── builder/        # Network editor
│   │   ├── simulation/     # Event + Journey modes
│   │   ├── sdn/            # SDN stage
│   │   ├── nfv/            # NFV stage
│   │   ├── orchestration/  # Orchestration stage
│   │   ├── validation/     # Validation results
│   │   └── ui/             # ProjectMenu, RevisionHistory, dialogs
│   ├── collaboration/
│   │   ├── CollaborationProvider.jsx  # Yjs + WebSocket + IndexedDB
│   │   └── ProjectManager.js          # Git-style revisions, working copies
│   └── data/               # Scenarios, devices, VNFs
├── server.js               # WebSocket server (Yjs protocol)
├── vite.config.js          # Vite config (base path for GitHub Pages)
├── package.json
└── README.md
```

---

## 9. Common Issues & Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Blank screen on load | Missing base path | Verify `vite.config.js` has `base: '/network-architecture-lab/'` |
| "Connected" but no sync | WebSocket server not running | Run `node server.js` on port 1234 |
| Collaboration not working | Different project IDs | Both users must use identical `?project=` URL |
| Changes lost on refresh | localStorage full/blocked | Check browser storage quota, clear if needed |
| Build fails on GitHub Pages | Wrong base path | Ensure `base` matches repository name |
| 404 on direct route | No SPA fallback | Add `404.html` redirect or use hash routing |

---

## 10. Demo Script (5-Minute Walkthrough)

1. **Home** (30s): "Select Small Office scenario"
2. **Briefing** (30s): "Read requirements: 2 PCs, switch, router, server, guest WiFi"
3. **Planning Quiz** (30s): "Answer questions, hints tracked for scoring"
4. **Resource Pool** (15s): "Allocate devices from budget"
5. **Build** (60s): "Drag devices, configure IPs (192.168.1.x/24), VLANs, router interfaces"
6. **Validate** (30s): "Run validation → scored result with suggestions"
7. **SDN** (45s): "Place controller, add DENY guest→admin policy, flow rules auto-generated"
8. **NFV** (45s): "Deploy vFirewall on server, build service chain (Firewall → NAT)"
9. **Orchestration** (30s): "Instantiate VNF instances, simulate load, watch auto-scale"
10. **Simulation** (60s): 
    - Event-driven: "Inject link failure, trace packet, see reroute"
    - Journey: "Animated packet through topology → SDN → NFV chain"
    - Fault: "Compare baseline vs link-down, see divergence"
11. **Results** (15s): "Final scores across all dimensions"
12. **Revision History** (30s): "Save revision, browse history, create working copy"
13. **Collaboration** (30s): "Share URL, real-time sync with peer count"

---

## 11. Known Limitations (Documented)

| Limitation | Workaround |
|------------|------------|
| Project import not implemented | Manually copy JSON to localStorage or wait for Phase 2 |
| Compare revisions | Click "Compare" → shows alert (Phase 2) |
| Propose/merge changes | Buttons show alerts (Phases 3-4) |
| Cross-device sync | Export/import JSON files manually |
| Static hosting collaboration | Requires hosted WebSocket server (not localhost) |

---

## 12. Support & Maintenance

### Updating Dependencies
```bash
npm outdated
npm update
npm test  # Verify no regressions
npm run build
```

### Adding New Scenarios
1. Create `src/data/scenarios/newScenario.js` following existing pattern
2. Add to `src/data/scenarios/index.js`
3. Run tests and verify validation rules work

### Adding New VNF Types
1. Add to `src/data/vnfs/vnfCatalog.js`
2. Add asset to `src/assets/assetMap.js`
3. Update NFV stage palette automatically

---

## 13. License & Credits

**License:** MIT (or as specified in repository)

**Key Libraries:**
- React, ReactFlow, Zustand
- Yjs, y-websocket, y-indexeddb
- Vitest for testing

---

## 14. Quick Reference Card

```bash
# Full setup from scratch
git clone <repo>
cd network-architecture-lab
npm install
node server.js &      # Terminal 1
npm run dev           # Terminal 2
open http://localhost:5173/network-architecture-lab/

# Run tests
npm test

# Production build
npm run build
npx gh-pages -d dist  # Deploy to GitHub Pages
```