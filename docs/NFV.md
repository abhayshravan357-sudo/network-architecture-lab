# NFV model

NFV virtualizes network functions so they can run as software components instead of being tied to dedicated hardware appliances.

## Functional idea

```text
Physical network function
  -> virtualized function
```

## Example mappings

- physical firewall -> vFirewall
- physical router -> vRouter
- load balancer -> vLoadBalancer
- IDS -> vIDS

## VNF characteristics

- CPU demand
- memory usage
- throughput capacity
- statefulness
- scaling profile
- placement constraints
- lifecycle state

## Educational purpose

NFV teaches students how service delivery changes when functions become portable, scalable, and instantiated on shared infrastructure.
