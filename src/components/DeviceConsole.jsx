import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import {
  createCliSession,
  executeCommand,
  getPrompt,
} from '../engine/cli/cliEngine.js';
import { useTopologyStore } from '../store/topologyStore.js';

// xterm.js wrapper around the pure cliEngine.
// All state mutation happens through store.applySideEffect().
export default function DeviceConsole({ deviceId }) {
  const mountRef = useRef(null);
  const sessionRef = useRef(null);
  const inputRef = useRef('');

  useEffect(() => {
    const store = useTopologyStore.getState();
    const device = store.topology.devices.find((d) => d.id === deviceId);

    const term = new Terminal({
      fontSize: 13,
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      convertEol: true,
      cursorBlink: true,
      rows: 14,
      cols: 68,
      theme: {
        background: '#0a1424',
        foreground: '#eaf2ff',
        cursor: '#7dd3fc',
        selectionBackground: 'rgba(125, 211, 252, 0.3)',
      },
    });

    sessionRef.current = createCliSession(device);
    inputRef.current = '';
    term.open(mountRef.current);
    term.writeln('Cisco IOS-style simulator console (MVP subset)');
    term.writeln('Type ? for context help. Type exit to close.');
    term.writeln('');
    term.write(`${getPrompt(sessionRef.current, store.topology)} `);

    const writePrompt = () => {
      const topology = useTopologyStore.getState().topology;
      term.write(`${getPrompt(sessionRef.current, topology)} ${inputRef.current}`);
    };

    const onData = (data) => {
      if (data === '\r') {
        const line = inputRef.current;
        inputRef.current = '';
        term.write('\r\n');
        const topology = useTopologyStore.getState().topology;
        const result = executeCommand(sessionRef.current, topology, line);
        sessionRef.current = result.session;
        result.output.forEach((line) => term.writeln(line));
        result.sideEffects.forEach((effect) => {
          useTopologyStore.getState().applySideEffect(effect);
        });
        // exit in user EXEC closes the console via side effect.
        if (useTopologyStore.getState().consoleDeviceId !== deviceId) return;
        writePrompt();
        return;
      }
      if (data === '\x7f') {
        if (inputRef.current.length > 0) {
          inputRef.current = inputRef.current.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }
      if (data === '\x03') {
        inputRef.current = '';
        term.write('\r\n');
        writePrompt();
        return;
      }
      if (data.length === 1 && data >= ' ') {
        inputRef.current += data;
        term.write(data);
      }
    };

    term.onData(onData);

    return () => {
      // xterm.js <5.4 bug (xtermjs/xterm.js#4775): each write burst
      // leaves a self-damping Viewport refresh chain running for
      // several frames (_innerRefresh -> scrollTop -> syncScrollArea
      // -> rAF -> _innerRefresh ...), and _innerRefresh reads
      // RenderService.dimensions, which throws once the renderer is
      // destroyed. Disposing while a refresh rAF is still queued
      // (React 18 StrictMode double-mounts effects; also happens on
      // real unmounts) triggers
      // "Cannot read properties of undefined (reading 'dimensions')".
      // xterm has no API to cancel pending viewport rAFs (fixed in
      // 5.4.0 by caching render dimensions), so defer disposal until
      // the refresh chain has settled.
      setTimeout(() => term.dispose(), 500);
    };
  }, [deviceId]);

  return <div ref={mountRef} className="device-console" />;
}
