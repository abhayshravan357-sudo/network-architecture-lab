export class CliEngine {
  constructor(getNode, setNode, log) {
    this.getNode = getNode;
    this.setNode = setNode;
    this.log = log;
    this.prompt = '>';
    this.mode = 'user';
    this.configMode = null;
    this.interfaceMode = null;
    this.device = null;
  }

  setDevice(node) {
    this.device = node;
    this.updatePrompt();
  }

  execute(input) {
    const trimmed = input.trim();
    if (!trimmed) return;
    this.log(trimmed);
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === 'help' || cmd === '?') this.cmdHelp();
    else if (cmd === 'enable') this.cmdEnable();
    else if (cmd === 'disable') this.cmdDisable();
    else if (cmd === 'exit') this.cmdExit();
    else if (cmd === 'configure' && args[0] === 'terminal') this.cmdConfigure();
    else if (cmd === 'hostname') this.cmdHostname(args);
    else if (cmd === 'interface') this.cmdInterface(args);
    else if (cmd === 'ip' && args[0] === 'address') this.cmdIpAddress(args.slice(1));
    else if (cmd === 'no' && args[0] === 'shutdown') this.cmdNoShutdown();
    else if (cmd === 'shutdown') this.cmdShutdown();
    else if (cmd === 'show') this.cmdShow(args);
    else this.log(`%cUnknown command: ${cmd}`, 'color:#f87171');

    this.updatePrompt();
  }

  updatePrompt() {
    if (!this.device) return;
    const label = this.device.data.label || this.device.data.type;
    if (this.mode === 'user') this.prompt = `${label}>`;
    else if (this.mode === 'enable') this.prompt = `${label}#`;
    else if (this.mode === 'config') this.prompt = `${label}(config)#`;
    else if (this.mode === 'interface') this.prompt = `${label}(config-if)#`;
  }

  cmdHelp() {
    this.log('%cAvailable commands:', 'color:#38bdf8;font-weight:bold');
    this.log('  ?, help              Show this help');
    this.log('  enable               Enter privileged mode');
    this.log('  disable              Exit privileged mode');
    this.log('  configure terminal   Enter global config');
    this.log('  hostname <name>      Set device name');
    this.log('  interface <id>       Enter interface config');
    this.log('  ip address <ip/mask> Set IP address');
    this.log('  no shutdown          Enable interface');
    this.log('  shutdown             Disable interface');
    this.log('  show ip interface    Display interfaces');
    this.log('  show ip route        Display routing table');
    this.log('  show vlan            Display VLANs');
    this.log('  show running-config  Display config');
    this.log('  exit                 Exit current mode');
  }

  cmdEnable() {
    if (this.mode === 'user') { this.mode = 'enable'; this.configMode = null; this.interfaceMode = null; this.log('%cEntered privileged mode', 'color:#34d399'); }
  }

  cmdDisable() {
    if (this.mode === 'enable') { this.mode = 'user'; this.log('%cExited to user mode', 'color:#94b8d8'); }
    else if (this.mode === 'config' || this.mode === 'interface') { this.mode = 'enable'; this.configMode = null; this.interfaceMode = null; this.log('%cExited to privileged mode', 'color:#94b8d8'); }
  }

  cmdExit() {
    if (this.mode === 'interface') { this.mode = 'config'; this.interfaceMode = null; }
    else if (this.mode === 'config') { this.mode = 'enable'; this.configMode = null; }
    else if (this.mode === 'enable') { this.mode = 'user'; }
  }

  cmdConfigure() {
    if (this.mode === 'enable') { this.mode = 'config'; this.configMode = 'global'; this.interfaceMode = null; this.log('%cEntered global configuration mode', 'color:#34d399'); }
    else this.log('%cMust be in enable mode', 'color:#f87171');
  }

  cmdHostname(args) {
    if (this.mode === 'config' && args[0]) {
      const newName = args[0];
      this.setNode(this.device.id, { label: newName });
      this.log(`%cHostname set to ${newName}`, 'color:#34d399');
    } else {
      this.log('%cUsage: hostname <name>', 'color:#f87171');
    }
  }

  cmdInterface(args) {
    if (this.mode === 'config' && args[0]) {
      const ifaceId = args[0].toLowerCase();
      this.mode = 'interface';
      this.interfaceMode = ifaceId;
      this.log(`%cEntered interface ${ifaceId} configuration mode`, 'color:#34d399');
    } else {
      this.log('%cUsage: interface <g0|g1|...>', 'color:#f87171');
    }
  }

  cmdIpAddress(args) {
    if (this.mode === 'interface' && args[0]) {
      const [ip, maskStr] = args[0].split('/');
      const mask = maskStr ? parseInt(maskStr, 10) : 24;
      if (!ip || isNaN(mask) || mask < 8 || mask > 30) {
        this.log('%cInvalid IP address or mask. Use format: ip address 192.168.1.1/24', 'color:#f87171');
        return;
      }
      const ifaces = this.device.data.interfaces || [];
      const existing = ifaces.find(i => i.name === this.interfaceMode);
      const newIface = { name: this.interfaceMode, ip, mask, status: 'up' };
      const updated = existing
        ? ifaces.map(i => i.name === this.interfaceMode ? newIface : i)
        : [...ifaces, newIface];
      this.setNode(this.device.id, { interfaces: updated });
      this.log(`%cIP address ${ip}/${mask} set on ${this.interfaceMode}`, 'color:#34d399');
    } else {
      this.log('%cUsage: ip address <ip/mask>', 'color:#f87171');
    }
  }

  cmdNoShutdown() {
    if (this.mode === 'interface') {
      const ifaces = this.device.data.interfaces || [];
      const updated = ifaces.map(i => i.name === this.interfaceMode ? { ...i, status: 'up' } : i);
      this.setNode(this.device.id, { interfaces: updated });
      this.log(`%cInterface ${this.interfaceMode} is now up`, 'color:#34d399');
    } else {
      this.log('%cMust be in interface config mode', 'color:#f87171');
    }
  }

  cmdShutdown() {
    if (this.mode === 'interface') {
      const ifaces = this.device.data.interfaces || [];
      const updated = ifaces.map(i => i.name === this.interfaceMode ? { ...i, status: 'down' } : i);
      this.setNode(this.device.id, { interfaces: updated });
      this.log(`%cInterface ${this.interfaceMode} is shut down`, 'color:#fbbf24');
    } else {
      this.log('%cMust be in interface config mode', 'color:#f87171');
    }
  }

  cmdShow(args) {
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'ip' && args[1] === 'interface') this.cmdShowInterfaces();
    else if (sub === 'interfaces') this.cmdShowInterfaces();
    else if (sub === 'ip' && args[1] === 'route') this.cmdShowRoutes();
    else if (sub === 'vlan') this.cmdShowVlans();
    else if (sub === 'running-config') this.cmdShowRunningConfig();
    else this.log('%cUsage: show ip interface | show interfaces | show ip route | show vlan | show running-config', 'color:#f87171');
  }

  cmdShowInterfaces() {
    this.log('%cInterfaces:', 'color:#38bdf8;font-weight:bold');
    const ifaces = this.device.data.interfaces || [];
    if (ifaces.length === 0) { this.log('  None configured'); return; }
    for (const iface of ifaces) {
      const isUp = iface.status !== 'down';
      const statusColor = isUp ? 'color:#34d399' : 'color:#f87171';
      const statusText = isUp ? 'up' : 'down';
      const ipStr = iface.ip ? `${iface.ip}${iface.mask ? '/' + iface.mask : ''}` : 'no ip';
      this.log(`  ${iface.name}: ${ipStr} - ${statusText}`, statusColor);
    }
  }

  cmdShowRoutes() {
    this.log('%cRouting Table:', 'color:#38bdf8;font-weight:bold');
    if (this.device.data.type !== 'router') { this.log('  This device is not a router'); return; }
    const ifaces = this.device.data.interfaces || [];
    const routes = ifaces.filter(i => i.ip && i.mask).map(i => `C ${i.ip}/${i.mask} is directly connected, ${i.name}`);
    if (routes.length === 0) this.log('  No routes');
    else routes.forEach(r => this.log(`  ${r}`));
  }

  cmdShowVlans() {
    this.log('%cVLANs:', 'color:#38bdf8;font-weight:bold');
    const vlans = this.device.data.vlans || [];
    if (vlans.length === 0) { this.log('  None configured'); return; }
    vlans.forEach(v => this.log(`  VLAN ${v}`));
  }

  cmdShowRunningConfig() {
    this.log('%cRunning configuration:', 'color:#38bdf8;font-weight:bold');
    this.log(`  hostname ${this.device.data.label || this.device.data.type}`);
    this.log('  !');
    const ifaces = this.device.data.interfaces || [];
    for (const iface of ifaces) {
      this.log(`  interface ${iface.name}`);
      if (iface.ip) this.log(`    ip address ${iface.ip}${iface.mask ? '/' + iface.mask : ''}`);
      if (iface.status === 'down') this.log('    shutdown');
      else this.log('    no shutdown');
    }
    if (ifaces.length === 0) this.log('  ! No interfaces configured');
  }
}
