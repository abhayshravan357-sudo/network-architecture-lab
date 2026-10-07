// Phase 3 CLI engine verification — runnable with: node tests/cliEngine.test.mjs
import assert from 'node:assert/strict';
import {
  createTopology,
  addDevice,
  addLink,
  updateDevice,
} from '../src/engine/topology/topologyModel.js';
import {
  createCliSession,
  executeCommand,
  getPrompt,
  ERR_INVALID_INPUT,
  ERR_WRONG_MODE,
  ERR_ENABLE_MODE,
  ERR_INVALID_IP,
} from '../src/engine/cli/cliEngine.js';
import { runPing } from '../src/engine/simulation/ping.js';

function buildLab() {
  const t = createTopology();
  const pc1 = addDevice(t, {
    type: 'pc', name: 'PC1', ip: '192.168.1.10', mask: '255.255.255.0', x: 0, y: 0,
  });
  const sw = addDevice(t, { type: 'switch', name: 'Switch1', x: 200, y: 0 });
  const pc2 = addDevice(t, {
    type: 'pc', name: 'PC2', ip: '192.168.1.11', mask: '255.255.255.0', x: 400, y: 0,
  });
  addLink(t, pc1.id, sw.id);
  addLink(t, sw.id, pc2.id);
  return { t, pc1, sw, pc2 };
}

// Simulates the store applying CLI side effects to the live topology.
function applyEffects(t, effects) {
  for (const e of effects) {
    if (e.action === 'setIp') updateDevice(t, e.deviceId, { ip: e.ip, mask: e.mask });
    if (e.action === 'setStatus') updateDevice(t, e.deviceId, { status: e.status });
    if (e.action === 'setHostname') updateDevice(t, e.deviceId, { name: e.name });
  }
}

// Runs a command and applies its side effects, like the UI does.
function run(t, session, line) {
  const result = executeCommand(session, t, line);
  applyEffects(t, result.sideEffects);
  return result;
}

// 1. User mode starts correctly
{
  const { t, pc1 } = buildLab();
  const session = createCliSession(pc1);
  assert.equal(session.mode, 'user');
  assert.equal(getPrompt(session, t), 'PC1>');
  console.log('PASS 1: session starts in user EXEC, prompt "PC1>"');
}

// 2. enable -> privileged EXEC
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  const r = run(t, s, 'enable');
  assert.equal(r.session.mode, 'privilege');
  assert.equal(getPrompt(r.session, t), 'PC1#');
  console.log('PASS 2: enable -> privileged EXEC, prompt "PC1#"');
}

// 3. conf t -> global configuration
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  const r = run(t, s, 'conf t');
  assert.equal(r.session.mode, 'config');
  assert.equal(getPrompt(r.session, t), 'PC1(config)#');
  console.log('PASS 3: conf t -> global config, prompt "PC1(config)#"');
}

// 4. interface -> interface configuration
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  const r = run(t, s, 'interface FastEthernet0/0');
  assert.equal(r.session.mode, 'interface');
  assert.equal(r.session.interfaceName, 'FastEthernet0/0');
  assert.equal(getPrompt(r.session, t), 'PC1(config-if)#');
  console.log('PASS 4: interface FastEthernet0/0 -> "PC1(config-if)#"');
}

// 5. ip address produces setIp side effect and updates live topology
{
  const { t, pc1 } = buildLab();
  updateDevice(t, pc1.id, { ip: '', mask: '' });
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  s = run(t, s, 'interface FastEthernet0/0').session;
  const r = run(t, s, 'ip address 192.168.1.10 255.255.255.0');
  assert.ok(r.sideEffects.some((e) => e.action === 'setIp' && e.ip === '192.168.1.10' && e.mask === '255.255.255.0'));
  assert.equal(t.devices.find((d) => d.id === pc1.id).ip, '192.168.1.10');
  console.log('PASS 5: ip address -> setIp side effect applied to live topology');
}

// 6. no shut -> status up
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  s = run(t, s, 'interface FastEthernet0/0').session;
  const r = run(t, s, 'no shut');
  assert.ok(r.sideEffects.some((e) => e.action === 'setStatus' && e.status === 'up'));
  console.log('PASS 6: no shut -> setStatus up');
}

// 7. shut -> status down
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  s = run(t, s, 'interface FastEthernet0/0').session;
  const r = run(t, s, 'shutdown');
  assert.ok(r.sideEffects.some((e) => e.action === 'setStatus' && e.status === 'down'));
  console.log('PASS 7: shutdown -> setStatus down');
}

// 8. hostname produces setHostname side effect, prompt updates immediately
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  const r = run(t, s, 'hostname CLIENT1');
  assert.ok(r.sideEffects.some((e) => e.action === 'setHostname' && e.name === 'CLIENT1'));
  assert.equal(getPrompt(r.session, t), 'CLIENT1(config)#');
  console.log('PASS 8: hostname CLIENT1 -> prompt becomes "CLIENT1(config)#"');
}

// 9. show ip interface brief displays live state
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  const r = run(t, s, 'sh ip int br');
  const text = r.output.join('\n');
  assert.ok(text.includes('Interface'), 'table header missing');
  assert.ok(text.includes('192.168.1.10'), 'PC1 IP missing');
  assert.ok(text.includes('192.168.1.11'), 'PC2 IP missing');
  assert.ok(text.includes('up'), 'status missing');
  console.log('PASS 9: sh ip int br shows live IPs and status');
}

// 10. show running-config is generated from live state
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  const r = run(t, s, 'sh run');
  const text = r.output.join('\n');
  assert.ok(text.includes('hostname PC1'), 'hostname line missing');
  assert.ok(text.includes('interface FastEthernet0/0'), 'interface line missing');
  assert.ok(text.includes('ip address 192.168.1.10 255.255.255.0'), 'ip address line missing');
  assert.ok(text.includes('no shutdown'), 'no shutdown line missing');
  console.log('PASS 10: sh run renders live Cisco-style config');
}

// 11. supported abbreviations all work
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  assert.equal(s.mode, 'config', 'conf t');
  s = run(t, s, 'end').session;
  assert.equal(s.mode, 'privilege', 'end from config -> privileged EXEC');
  assert.equal(run(t, s, 'sh ip int br').output.length > 2, true, 'sh ip int br');
  assert.equal(run(t, s, 'sh run').output.length > 2, true, 'sh run');
  let s2 = createCliSession(pc1);
  s2 = run(t, s2, 'enable').session;
  s2 = run(t, s2, 'conf t').session;
  s2 = run(t, s2, 'interface FastEthernet0/0').session;
  assert.equal(run(t, s2, 'no shut').sideEffects[0].status, 'up', 'no shut');
  assert.equal(run(t, s2, 'shut').sideEffects[0].status, 'down', 'shut');
  console.log('PASS 11: abbreviations conf t / no shut / shut / sh ip int br / sh run');
}

// 12. exact invalid-command error
{
  const { t, pc1 } = buildLab();
  const s = createCliSession(pc1);
  const r = run(t, s, 'foo');
  assert.ok(r.output.includes(ERR_INVALID_INPUT));
  assert.equal(r.output[0], "% Invalid input detected at '^' marker.");
  console.log('PASS 12: unknown command -> "% Invalid input detected at \'^\' marker."');
}

// 13. exact wrong-mode error (enable in privileged EXEC)
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  const r = run(t, s, 'enable');
  assert.equal(r.output[0], ERR_ENABLE_MODE);
  console.log('PASS 13: enable in privileged EXEC -> "% Must be in user EXEC mode."');
}

// 14. exact wrong-mode error (ip address in global config)
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  const r = run(t, s, 'ip address 1.1.1.1 255.255.255.0');
  assert.equal(r.output[0], ERR_WRONG_MODE);
  console.log('PASS 14: ip address in global config -> "% Must be in interface configuration mode."');
}

// 15. exact invalid-IP error
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  s = run(t, s, 'interface FastEthernet0/0').session;
  const r = run(t, s, 'ip address 999.1.1.1 255.255.255.0');
  assert.equal(r.output[0], ERR_INVALID_IP);
  console.log('PASS 15: ip address 999.1.1.1 -> "% Invalid IP address."');
}

// 16. admin-down device fails ping with exact reason
{
  const { t, pc1, pc2 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  s = run(t, s, 'conf t').session;
  s = run(t, s, 'interface FastEthernet0/0').session;
  run(t, s, 'shutdown'); // applies setStatus down to PC1
  const direct = runPing(t, pc1.id, pc2.id);
  assert.equal(direct.success, false);
  assert.equal(direct.reason, 'Device is administratively down');
  // and via the CLI ping command
  let s2 = createCliSession(pc1);
  s2 = run(t, s2, 'enable').session;
  const cliPing = run(t, s2, 'ping 192.168.1.11');
  assert.ok(cliPing.output.includes('Success rate is 0 percent'));
  assert.ok(cliPing.output.includes('Reason: Device is administratively down'));
  console.log('PASS 16: shutdown device -> ping fails with "Device is administratively down"');
}

// 17. CLI ping uses the existing runPing engine (success path)
{
  const { t, pc1 } = buildLab();
  let s = createCliSession(pc1);
  s = run(t, s, 'enable').session;
  const r = run(t, s, 'ping 192.168.1.11');
  assert.ok(r.output.includes('Sending 5, 100-byte ICMP Echos to 192.168.1.11...'));
  assert.ok(r.output.includes('Success rate is 100 percent'));
  console.log('PASS 17: CLI ping 192.168.1.11 -> "Success rate is 100 percent"');
}

// 18. exit in user EXEC requests console close
{
  const { t, pc1 } = buildLab();
  const s = createCliSession(pc1);
  const r = run(t, s, 'exit');
  assert.ok(r.sideEffects.some((e) => e.action === 'closeConsole'));
  console.log('PASS 18: exit in user EXEC -> closeConsole side effect');
}

console.log('\nAll CLI engine tests passed.');
