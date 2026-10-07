/**
 * Centralized asset map — single source of truth for every
 * image asset in the simulator. Components never hard-code
 * asset paths; they look up `deviceAssets.router`, etc.
 *
 * Asset library: public/assets/<category>/<name>.svg
 */

const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}.svg`;

/** Physical + network devices (builder palette, canvas nodes, resource pool) */
export const deviceAssets = {
  router: asset('devices/router'),
  l2Switch: asset('devices/switch-l2'),
  l3Switch: asset('devices/switch-l3'),
  firewall: asset('devices/firewall'),
  server: asset('devices/server'),
  accessPoint: asset('devices/access-point'),
  pc: asset('devices/pc'),
  laptop: asset('devices/laptop'),
  cloud: asset('devices/cloud'),
  wirelessController: asset('devices/wireless-controller'),
  dataCenter: asset('devices/data-center'),
  gateway: asset('devices/gateway'),
  printer: asset('devices/printer'),
  ipCamera: asset('devices/ip-camera'),
  ipPhone: asset('devices/ip-phone'),
  box: asset('devices/box'),
};

/** Virtual network functions (NFV stage palette + chain) */
export const vnfAssets = {
  vFirewall: asset('nfv/vfirewall'),
  vRouter: asset('nfv/vrouter'),
  vLoadBalancer: asset('nfv/vload-balancer'),
  vIDS: asset('nfv/vids'),
  vNAT: asset('nfv/vnat'),
  vProxy: asset('nfv/vproxy'),
  vDHCP: asset('nfv/vdhcp'),
  vWAN: asset('nfv/vwan'),
  vVPN: asset('nfv/vnf-instance'),
  vnfInstance: asset('nfv/vnf-instance'),
  vm: asset('nfv/vm'),
  resourcePool: asset('nfv/resource-pool'),
};

/** SDN stage visuals */
export const sdnAssets = {
  controller: asset('sdn/controller'),
  sdnSwitch: asset('sdn/sdn-switch'),
  controlPlane: asset('sdn/control-plane'),
  dataPlane: asset('sdn/data-plane'),
  flowRule: asset('sdn/flow-rule'),
  flowTable: asset('sdn/flow-table'),
  policy: asset('sdn/policy'),
};

/** Orchestration stage visuals */
export const orchestrationAssets = {
  orchestrator: asset('orchestration/orchestrator'),
  deployment: asset('orchestration/deployment'),
  scaling: asset('orchestration/scaling'),
  migration: asset('orchestration/migration'),
  serviceChain: asset('orchestration/service-chain'),
  lifecycle: asset('orchestration/lifecycle'),
};

/** Simulation events — keyed by the engine's event vocabulary */
export const simulationAssets = {
  'traffic-surge': asset('simulation/traffic-surge'),
  'traffic-normal': asset('simulation/traffic-normal'),
  'node-failure': asset('simulation/device-failure'),
  'link-failure': asset('simulation/link-failure'),
  'security-event': asset('simulation/attack'),
  'resource-shortage': asset('simulation/resource-shortage'),
  'user-growth': asset('simulation/new-users'),
  congestion: asset('simulation/congestion'),
  'packet-loss': asset('simulation/packet-loss'),
  latency: asset('simulation/latency'),
  recovery: asset('simulation/recovery'),
  'vnf-scaling': asset('simulation/vnf-scaling'),
};

/** Scenario cards */
export const scenarioAssets = {
  'small-office': asset('scenarios/office'),
  'college-campus': asset('scenarios/college'),
  hospital: asset('scenarios/hospital'),
  hotel: asset('scenarios/hotel'),
  'multi-branch': asset('scenarios/branch-office'),
  campus: asset('scenarios/campus'),
  'server-room': asset('scenarios/server-room'),
};

/** Learning / game UI */
export const learningAssets = {
  mission: asset('learning/mission'),
  requirement: asset('learning/requirement'),
  hint: asset('learning/hint'),
  success: asset('learning/success'),
  warning: asset('learning/warning'),
  failure: asset('learning/failure'),
  score: asset('learning/score'),
  achievement: asset('learning/achievement'),
  radio: asset('learning/radio'),
  celebration: asset('learning/celebration'),
  book: asset('learning/book'),
  brain: asset('learning/brain'),
};

/** Home screen mode cards */
export const modeAssets = {
  scenario: asset('scenarios/campus'),
  random: asset('simulation/traffic-surge'),
  practice: asset('devices/data-center'),
  learn: asset('learning/hint'),
};

/** Brand */
export const uiAssets = {
  logo: asset('ui/logo'),
  clipboard: asset('ui/clipboard'),
  monitor: asset('ui/monitor'),
  bolt: asset('ui/bolt'),
  chart: asset('ui/chart'),
  shield: asset('ui/shield'),
};

export default {
  deviceAssets,
  vnfAssets,
  sdnAssets,
  orchestrationAssets,
  simulationAssets,
  scenarioAssets,
  learningAssets,
  modeAssets,
  uiAssets,
};
