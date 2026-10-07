// Pure Cisco IOS-style CLI engine (subset) for Phase 3.
// Concept reference: joxorsayan/netsim app/engine/cli.py + clihelp.py (MIT) —
// mode hierarchy, abbreviation and context-help behavior, reimplemented in JS.
//
// Architecture rule: this module is PURE.
// It imports no React and no Zustand. It returns sideEffects;
// the store applies them to the live topology.

import { runPing } from '../simulation/ping.js';

export const ERR_INVALID_INPUT = "% Invalid input detected at '^' marker.";
export const ERR_WRONG_MODE = '% Must be in interface configuration mode.';
export const ERR_ENABLE_MODE = '% Must be in user EXEC mode.';
export const ERR_INVALID_IP = '% Invalid IP address.';

export function createCliSession(device) {
  return {
    deviceId: device?.id ?? null,
    mode: 'user',
    interfaceName: 'FastEthernet0/0',
    history: [],
  };
}

export function getPrompt(session, topology) {
  const device = topology?.devices?.find((d) => d.id === session?.deviceId);
  const name = device?.name || 'Device';
  switch (session?.mode) {
    case 'privilege':
      return `${name}#`;
    case 'config':
      return `${name}(config)#`;
    case 'interface':
      return `${name}(config-if)#`;
    case 'user':
    default:
      return `${name}>`;
  }
}

export function isValidIp(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function helpFor(mode) {
  switch (mode) {
    case 'user':
      return ['Available commands:', '  enable        Enter privileged EXEC mode', '  ping <ip>     Send ICMP echo requests', '  ?             Show this help', '  exit          Close the console'];
    case 'privilege':
      return ['Available commands:', '  configure terminal (conf t)   Enter global configuration', '  show ip interface brief (sh ip int br)', '  show running-config (sh run)', '  ping <ip>', '  end / exit    Return to user EXEC', '  ?             Show this help'];
    case 'config':
      return ['Available commands:', '  interface <type> <port>   Enter interface configuration', '  hostname <name>           Rename this device', '  end / exit                Return to privileged EXEC', '  ?                         Show this help'];
    case 'interface':
      return ['Available commands:', '  ip address <ip> <mask>    Set the interface address', '  no shutdown (no shut)     Enable the interface', '  shutdown (shut)           Disable the interface', '  end / exit                Leave interface configuration', '  ?                         Show this help'];
    default:
      return [];
  }
}

function interfaceBrief(topology, session) {
  const device = topology.devices.find((d) => d.id === session.deviceId);
  const iface = device ? session.interfaceName : 'FastEthernet0/0';
  const lines = [
    'Interface        IP Address       Mask              Status',
    '---------------  ---------------  ----------------  ------',
  ];
  for (const d of topology.devices) {
    const name = d.id === session.deviceId ? iface : 'FastEthernet0/0';
    const ip = d.ip || 'unassigned';
    const mask = d.mask || '—';
    const status = d.status || 'up';
    lines.push(
      `${name.padEnd(15)}  ${ip.padEnd(15)}  ${mask.padEnd(17)}  ${status}`,
    );
  }
  return lines;
}

function runningConfig(topology, session) {
  const device = topology.devices.find((d) => d.id === session.deviceId);
  if (!device) return ['% Device not found.'];
  const lines = [`hostname ${device.name}`, '!'];
  lines.push(`interface ${session.interfaceName}`);
  if (device.ip && device.mask) {
    lines.push(` ip address ${device.ip} ${device.mask}`);
  } else {
    lines.push(' no ip address');
  }
  lines.push(device.status === 'down' ? ' shutdown' : ' no shutdown');
  lines.push('!');
  lines.push('end');
  return lines;
}

function pingOutput(topology, sourceId, targetIp) {
  const header = `Sending 5, 100-byte ICMP Echos to ${targetIp}...`;
  const target = topology.devices.find((d) => d.ip && d.ip === targetIp);
  if (!target) {
    return [header, 'Success rate is 0 percent', '% Unknown host'];
  }
  const result = runPing(topology, sourceId, target.id);
  if (result.success) {
    return [header, 'Success rate is 100 percent'];
  }
  return [header, 'Success rate is 0 percent', `Reason: ${result.reason}`];
}

export function executeCommand(session, topology, commandLine) {
  const raw = (commandLine || '').trim();
  const next = {
    ...session,
    history: [...(session.history || []), raw],
  };
  const output = [];
  const sideEffects = [];

  if (!raw) return { output, session: next, sideEffects };

  const parts = raw.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  const mode = session.mode;

  // ping is valid in user EXEC and privileged EXEC.
  if (command === 'ping' && (mode === 'user' || mode === 'privilege')) {
    const targetIp = args[0];
    if (!targetIp || !isValidIp(targetIp)) {
      output.push(ERR_INVALID_INPUT);
    } else {
      output.push(...pingOutput(topology, session.deviceId, targetIp));
    }
    return { output, session: next, sideEffects };
  }

  if (command === '?') {
    output.push(...helpFor(mode));
    return { output, session: next, sideEffects };
  }

  switch (mode) {
    case 'user': {
      if (command === 'enable') {
        next.mode = 'privilege';
      } else if (command === 'exit') {
        output.push('Connection closed.');
        sideEffects.push({ action: 'closeConsole', deviceId: session.deviceId });
      } else {
        output.push(ERR_INVALID_INPUT);
      }
      break;
    }

    case 'privilege': {
      if (command === 'configure' && args[0] === 'terminal') {
        next.mode = 'config';
      } else if (command === 'conf' && args[0] === 't') {
        next.mode = 'config';
      } else if (
        (command === 'show' && args[0] === 'ip' && args[1] === 'interface' && args[2] === 'brief') ||
        (command === 'sh' && args[0] === 'ip' && args[1] === 'int' && args[2] === 'br')
      ) {
        output.push(...interfaceBrief(topology, session));
      } else if (
        (command === 'show' && args[0] === 'running-config') ||
        (command === 'sh' && args[0] === 'run')
      ) {
        output.push(...runningConfig(topology, session));
      } else if (command === 'exit' || command === 'end') {
        next.mode = 'user';
      } else if (command === 'enable') {
        output.push(ERR_ENABLE_MODE);
      } else {
        output.push(ERR_INVALID_INPUT);
      }
      break;
    }

    case 'config': {
      // Accept both "interface FastEthernet0/0" (joined) and
      // "interface FastEthernet 0/0" (spaced), like real IOS.
      if (command === 'interface' && args.length >= 1) {
        next.interfaceName = args.join(' ');
        next.mode = 'interface';
      } else if (command === 'hostname' && args.length >= 1) {
        sideEffects.push({ action: 'setHostname', deviceId: session.deviceId, name: args.join(' ') });
      } else if (command === 'exit' || command === 'end') {
        next.mode = 'privilege';
      } else if (command === 'ip' && args[0] === 'address') {
        output.push(ERR_WRONG_MODE);
      } else {
        output.push(ERR_INVALID_INPUT);
      }
      break;
    }

    case 'interface': {
      if (command === 'ip' && args[0] === 'address') {
        const [ip, mask] = args.slice(1);
        if (!ip || !mask) {
          output.push(ERR_INVALID_INPUT);
        } else if (!isValidIp(ip) || !isValidIp(mask)) {
          output.push(ERR_INVALID_IP);
        } else {
          sideEffects.push({ action: 'setIp', deviceId: session.deviceId, ip, mask });
        }
      } else if ((command === 'no' && args[0] === 'shutdown') || (command === 'no' && args[0] === 'shut')) {
        sideEffects.push({ action: 'setStatus', deviceId: session.deviceId, status: 'up' });
      } else if (command === 'shutdown' || command === 'shut') {
        sideEffects.push({ action: 'setStatus', deviceId: session.deviceId, status: 'down' });
      } else if (command === 'exit') {
        next.mode = 'config';
      } else if (command === 'end') {
        next.mode = 'privilege';
      } else {
        output.push(ERR_INVALID_INPUT);
      }
      break;
    }

    default: {
      output.push(ERR_INVALID_INPUT);
    }
  }

  return { output, session: next, sideEffects };
}
