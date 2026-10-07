# VNF orchestration model

VNF orchestration manages the lifecycle of virtual network services across infrastructure resources.

## Lifecycle

```text
Instantiate
  -> Configure
  -> Connect
  -> Monitor
  -> Scale
  -> Migrate
  -> Terminate
```

## Orchestration concerns

- resource allocation
- placement optimization
- service chaining
- failover workflow
- scaling decisions
- migration planning
- health monitoring

## Simulator role

The simulator should model orchestration decisions logically rather than as a live infrastructure automation engine.
