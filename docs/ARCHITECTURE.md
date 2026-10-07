# Software architecture

The simulator is designed around four layers:

1. scenario and concept knowledge
2. state and rules engine
3. UI and interaction layer
4. learning and analytics layer

## Knowledge layer

- scenario definitions
- device catalog
- protocol catalog
- concept library
- hint library
- validation constraints

## Engine layer

- topology validation
- requirement checking
- SDN flow logic
- NFV resource logic
- orchestration lifecycle
- simulation events

## Interaction layer

- scenario screens
- builder canvas
- inspector panels
- SDN workflow workspace
- NFV orchestration workspace
- simulation monitor

## Evaluation layer

- scoring
- concept summaries
- mistake explanations
- final report generation

## Design principle

The system should validate logical architecture, not the visual elegance of the network canvas.
