import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { CliEngine } from '../../engine/cli/cliEngine.js';

export default function DeviceConsole({ node, onClose, updateNodeData }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const cliRef = useRef(null);
  const lineRef = useRef('');

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0b1829',
        foreground: '#eaf2ff',
        cursor: '#38bdf8',
        selection: 'rgba(56,189,248,0.3)',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 500,
    });

    term.open(containerRef.current);
    termRef.current = term;

    const cli = new CliEngine(
      (id) => node,
      (id, data) => updateNodeData(id, data),
      (text) => term.writeln(`\x1b[0m${text}`)
    );
    cli.setDevice(node);
    cliRef.current = cli;

    term.write(`\x1b[38;5;110mNetwork Architecture Lab — Device Console\x1b[0m\r\n`);
    term.write(`\x1b[90mConnected to ${node.data.label || node.data.type}\x1b[0m\r\n\r\n`);
    term.write('\x1b[38;5;110mType "help" for available commands.\x1b[0m\r\n\r\n');
    term.write(cli.prompt + ' ');

    term.onData((data) => {
      const code = data.charCodeAt(0);
      if (code === 13) {
        term.write('\r\n');
        const line = lineRef.current;
        lineRef.current = '';
        if (cliRef.current) cliRef.current.execute(line);
        term.write(cliRef.current.prompt + ' ');
      } else if (code === 127 || code === 8) {
        if (lineRef.current.length > 0) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code >= 32 && code < 127) {
        lineRef.current += data;
        term.write(data);
      }
    });

    return () => { term.dispose(); };
  }, []);

  useEffect(() => {
    if (cliRef.current) {
      cliRef.current.setDevice(node);
    }
  }, [node]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b1829', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--c-bg-elevated)', borderBottom: '1px solid var(--c-border)' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {node.data.label || node.data.type} — Console
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--c-text-dim)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
      </div>
      <div ref={containerRef} style={{ flex: 1, padding: '8px', overflow: 'hidden' }} />
    </div>
  );
}
