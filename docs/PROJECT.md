# Project definition

This project is a scenario-driven network architecture learning simulator that teaches students how to translate business and technical requirements into network designs, validate them logically, and then evolve the architecture through SDN, NFV, and orchestration workflows.

## What it is

- a network-design learning game
- a structured architecture lab
- a simulator for SDN control-plane behavior
- an NFV/VNF orchestration trainer
- a validation tool driven by logic and requirements, not visual guesswork

## What it is not

- not a packet-level emulator
- not a real Cisco Packet Tracer clone
- not a hypervisor or VM deployment platform
- not a cybersecurity testbed for live exploitation

## Core educational goals

1. Translate business requirements into networking architecture.
2. Recognize the roles of routing, switching, segmentation, redundancy, and services.
3. Understand control-plane versus data-plane separation in SDN.
4. Learn how NFV virtualizes network functions and how orchestration manages lifecycle events.
5. Evaluate a design under dynamic conditions such as failure, congestion, or resource pressure.

## Product principle

The repository contains the knowledge model before implementation. Scenarios, devices, concepts, protocols, rules, and validation logic are designed first so that UI code and simulations implement a known and consistent model rather than inventing policy while building.
