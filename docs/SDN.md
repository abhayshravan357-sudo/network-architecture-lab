# SDN model

SDN separates the control plane from the data plane, enabling centralized management and programmatic flow decisions.

## Traditional networking

```text
Device
  -> Control Plane
  -> Data Plane
```

## SDN architecture

```text
Controller
  -> Control Plane
      |
      -> Switches / Routers
           -> Data Plane
```

## Simulator intent

The SDN stage is not a full programmable network emulator. It should teach:

- centralized traffic policy
- flow control
- route management
- visibility into the control/data plane split
- how topology design influences controller decisions

## Example SDN applications

- path optimization
- policy-based segmentation
- traffic engineering
- security policy enforcement
- centralized monitoring

## Educational focus

Students should understand that SDN is a management and control abstraction, not simply a new name for a switch.
