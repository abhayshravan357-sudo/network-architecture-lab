# SDN/NFV Architecture Lab

A scenario-driven network architecture simulator for learning how networking requirements become real architecture decisions, SDN control-plane behavior, NFV/VNF orchestration, and live system simulation.

## Product intent

This repository is intentionally structured as a product knowledge base before application implementation. It contains:

- project definition and learning flow
- scenario databases and validation logic
- concepts, protocols, and hints
- SDN and NFV models
- orchestration and simulation event definitions
- a working React + Vite starter app shell

## Quick start

```bash
npm install
npm run dev -- --host 0.0.0.0
```

### With Collaboration Server (for real-time multi-user editing)

```bash
# Terminal 1: Start WebSocket collaboration server
node server.js

# Terminal 2: Start development server
npm run dev -- --host 0.0.0.0
```

Then open http://localhost:5173/network-architecture-lab/ in multiple browser tabs with the same `?project=` URL parameter to collaborate in real-time.

## Production Deployment

### GitHub Pages (Static Hosting)

The app deploys to GitHub Pages automatically on push to `main`. Since GitHub Pages is **static hosting**, the WebSocket collaboration server cannot run there.

**For collaboration in production**, you must host the WebSocket server separately:

1. Deploy `server.js` to a VPS, Railway, Render, Fly.io, or similar
2. Set `VITE_WS_URL` secret in GitHub repository settings to your production WebSocket URL (e.g., `wss://your-server.example.com`)
3. The build will automatically use this URL

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start WebSocket server (required for collaboration)
node server.js

# 3. Start Vite dev server
npm run dev -- --host 0.0.0.0

# Open http://localhost:5173/network-architecture-lab/
```

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_WS_URL` | No | `ws://localhost:1234` | WebSocket server URL. Use `wss://` for production. Empty = local-only mode. |

## Running Tests

```bash
npm test
```

## Project Structure

```
.
├── .github/workflows/     # GitHub Actions CI/CD
├── public/                # Static assets
├── scripts/               # Utility scripts
├── src/
│   ├── components/        # React components
│   ├── collaboration/     # Yjs/WebSocket collaboration
│   ├── engine/            # Simulation, SDN, NFV, orchestration engines
│   ├── state/             # Zustand store
│   └── data/              # Scenarios, devices, VNFs
├── server.js              # WebSocket collaboration server
├── package.json
├── vite.config.js
└── index.html
```

## Learning Flow

```
Scenario
  -> Planning Quiz
  -> Resource Awareness
  -> Architecture Construction
  -> Architecture Validation
  -> SDN Transformation
  -> SDN Validation
  -> NFV/VNF Design
  -> Orchestration
  -> Dynamic Simulation
  -> Final Evaluation
  -> Learning Report
```

## Status

This repository contains a complete MVP with:
- Network topology builder with validation
- SDN controller, policies, flow rules, and failure reroute
- NFV VNF deployment, service chains, resource validation
- Orchestration: instantiation, scaling, migration, load simulation
- Event-driven and animated network journey simulation
- Fault injection with baseline comparison
- Git-style revision history with working copies
- Real-time collaboration via Yjs WebSocket
- 56 automated tests passing