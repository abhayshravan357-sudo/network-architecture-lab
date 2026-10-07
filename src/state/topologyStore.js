import { create } from 'zustand';
import {
  createTopology,
  addDevice,
  removeDevice,
  addLink,
  removeLink,
  getDevice,
} from '../engine/topology/topologyModel.js';
import { runPing } from '../engine/simulation/ping.js';
import { checkMission } from '../engine/validation/validationEngine.js';
import mission from '../data/missions/01-first-ping.json';

const PC_BASE_IP = '192.168.1.';
const PC_FIRST_OCTET = 10;
const DEFAULT_MASK = '255.255.255.0';

function nextPcIp(topology) {
  const used = topology.devices
    .filter((d) => d.type === 'pc' && d.ip)
    .map((d) => Number(d.ip.split('.')[3]))
    .filter((n) => Number.isFinite(n));
  let octet = PC_FIRST_OCTET;
  while (used.includes(octet)) octet += 1;
  return `${PC_BASE_IP}${octet}`;
}

// Every mutation must produce NEW topology/devices/links
// references. Zustand v5 (useSyncExternalStore) and React Flow's
// useMemo both compare by reference: in-place mutation (push /
// Object.assign) would leave selectors and memoized node lists
// stale, and array-returning selectors would infinite-loop.
function commitTopology(set, topology, extra = {}) {
  set({
    topology: {
      ...topology,
      devices: [...topology.devices],
      links: [...topology.links],
    },
    ...extra,
  });
}

// Immutable single-device replacement (updates never mutate
// the existing device object).
function withDevice(topology, deviceId, patch) {
  return {
    ...topology,
    devices: topology.devices.map((d) =>
      d.id === deviceId ? { ...d, ...patch } : d,
    ),
  };
}

export const useTopologyStore = create((set, get) => ({
  topology: createTopology(),
  selectedDeviceId: null,
  consoleDeviceId: null,
  mission,
  pingResult: null,
  xp: 0,
  eventLog: [],
  missionCompleted: false,
  animationTick: 0,

  addDevice(type, position) {
    const { topology } = get();
    const isPc = type === 'pc';
    const count = topology.devices.filter((d) => d.type === type).length + 1;
    const device = addDevice(topology, {
      type,
      name: isPc ? `PC${count}` : type === 'switch' ? `Switch${count}` : type,
      ip: isPc ? nextPcIp(topology) : '',
      mask: isPc ? DEFAULT_MASK : '',
      gateway: '',
      x: position?.x ?? 120 + count * 200,
      y: position?.y ?? 180,
    });
    commitTopology(set, topology, { selectedDeviceId: device.id });
    return device;
  },

  connectDevices(sourceId, targetId) {
    const { topology } = get();
    const link = addLink(topology, sourceId, targetId);
    commitTopology(set, topology);
    return link;
  },

  disconnectLink(linkId) {
    const { topology } = get();
    removeLink(topology, linkId);
    commitTopology(set, topology);
  },

  deleteDevice(deviceId) {
    const { topology, selectedDeviceId } = get();
    removeDevice(topology, deviceId);
    commitTopology(set, topology, {
      selectedDeviceId: selectedDeviceId === deviceId ? null : selectedDeviceId,
    });
  },

  moveDevice(deviceId, x, y) {
    const { topology } = get();
    commitTopology(set, withDevice(topology, deviceId, { x, y }));
  },

  selectDevice(deviceId) {
    set({ selectedDeviceId: deviceId });
  },

  openConsole(deviceId) {
    set({ consoleDeviceId: deviceId });
  },

  closeConsole() {
    set({ consoleDeviceId: null });
  },

  // Applies side effects returned by the pure CLI engine to the
  // live topology. The CLI engine never imports Zustand.
  applySideEffect(effect) {
    const { topology } = get();
    switch (effect?.action) {
      case 'setIp':
        commitTopology(set, withDevice(topology, effect.deviceId, { ip: effect.ip, mask: effect.mask }));
        break;
      case 'setStatus':
        commitTopology(set, withDevice(topology, effect.deviceId, { status: effect.status }));
        break;
      case 'setHostname':
        commitTopology(set, withDevice(topology, effect.deviceId, { name: effect.name }));
        break;
      case 'closeConsole':
        set({ consoleDeviceId: null });
        break;
      default:
        break;
    }
  },

  updateSelectedDevice(patch) {
    const { topology, selectedDeviceId } = get();
    if (!selectedDeviceId) return;
    commitTopology(set, withDevice(topology, selectedDeviceId, patch));
  },

  runPing(sourceId, targetId) {
    const { topology, mission, missionCompleted, xp } = get();
    const result = runPing(topology, sourceId, targetId);

    let newXp = xp;
    let newMissionCompleted = missionCompleted;
    if (result.success && !missionCompleted) {
      const verdict = checkMission(mission, topology, result);
      if (verdict.passed) {
        newMissionCompleted = true;
        newXp = xp + mission.rewardXp;
      }
    }

    set({
      pingResult: result,
      eventLog: result.success ? result.events : [],
      xp: newXp,
      missionCompleted: newMissionCompleted,
      animationTick: get().animationTick + 1,
    });
    return result;
  },

  replayPing() {
    const { pingResult } = get();
    if (!pingResult) return;
    set({ animationTick: get().animationTick + 1 });
  },

  resetMission() {
    set({
      topology: createTopology(),
      selectedDeviceId: null,
      pingResult: null,
      eventLog: [],
      xp: 0,
      missionCompleted: false,
      animationTick: 0,
    });
  },

  addXp(amount) {
    set({ xp: get().xp + amount });
  },

  loadStarterTopology() {
    const { topology } = get();
    const pc1 = addDevice(topology, {
      type: 'pc', name: 'PC1', ip: `${PC_BASE_IP}${PC_FIRST_OCTET}`, mask: DEFAULT_MASK, x: 120, y: 180,
    });
    const sw = addDevice(topology, { type: 'switch', name: 'Switch1', x: 380, y: 180 });
    const pc2 = addDevice(topology, {
      type: 'pc', name: 'PC2', ip: `${PC_BASE_IP}${PC_FIRST_OCTET + 1}`, mask: DEFAULT_MASK, x: 640, y: 180,
    });
    addLink(topology, pc1.id, sw.id);
    addLink(topology, sw.id, pc2.id);
    commitTopology(set, topology, { selectedDeviceId: pc1.id });
  },

  getSelectedDevice() {
    const { topology, selectedDeviceId } = get();
    return selectedDeviceId ? getDevice(topology, selectedDeviceId) : null;
  },
}));
