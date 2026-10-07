# Validation model

The validation system evaluates architecture quality using logical correctness instead of topology appearance.

## Validation categories

1. connectivity
2. device suitability
3. device quantity
4. topology
5. segmentation
6. routing
7. services
8. security
9. scalability
10. availability
11. SDN compliance
12. NFV suitability
13. VNF placement
14. resource allocation
15. orchestration correctness

## Rule model

A design is scored based on:

- whether required services exist
- whether the correct device roles appear
- whether segmentation is logically enforced
- whether traffic paths are reasonable
- whether capacity and latency assumptions are supported
- whether SDN and NFV transformations align with the architecture

## Important principle

A visual layout that looks impressive but ignores segmentation, routing, or service requirements should score poorly.
