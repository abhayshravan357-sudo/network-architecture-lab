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

## Asset bundle

A packaged SVG asset archive is included at [assets/network-architecture-assets.zip](assets/network-architecture-assets.zip). It contains the core network, SDN, and infrastructure icon set for reuse outside the web app.

## Project layout

```text
.
├── docs/
├── public/
├── spec/
├── src/
├── tests/
├── package.json
├── vite.config.js
└── index.html
```

## Learning flow

```text
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

This repository currently contains the product foundation, scenario knowledge, and a runnable frontend shell. It is ready for iterative implementation of builder, validation, SDN, NFV, and simulation features.
