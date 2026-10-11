import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';

export default function ProjectMenu({
  projectId,
  isConnected,
  peerCount,
  onSaveRevision,
  onShowHistory,
  onCreateWorkingCopy,
  onProposeChanges,
  onStartLiveSession,
  onCopyLink,
  unsavedChanges,
  baseRevisionId,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const fullUrl = `${window.location.origin}${window.location.pathname}?project=${projectId}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClickOutside = (e) => {
    if (isOpen && menuRef.current && !menuRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const menuItems = [
    { 
      label: 'Save Revision…', 
      shortcut: 'Ctrl+S',
      action: onSaveRevision,
      disabled: false,
      icon: '💾',
    },
    { 
      label: 'Revision History…', 
      shortcut: 'Ctrl+H',
      action: onShowHistory,
      disabled: false,
      icon: '📜',
    },
    { type: 'separator' },
    { 
      label: 'Create Working Copy…', 
      shortcut: 'Ctrl+Shift+S',
      action: onCreateWorkingCopy,
      disabled: false,
      icon: '📋',
    },
    { 
      label: 'Propose Changes…', 
      shortcut: 'Ctrl+Shift+P',
      action: onProposeChanges,
      disabled: !unsavedChanges || !baseRevisionId,
      icon: '📤',
    },
    { type: 'separator' },
    { 
      label: 'Live Collaboration', 
      action: null,
      disabled: false,
      isHeader: true,
      icon: '👥',
    },
    { 
      label: 'Start Session…', 
      action: onStartLiveSession,
      disabled: !isConnected,
      icon: '▶️',
    },
    { 
      label: 'Join Session…', 
      action: () => alert('Enter a Session ID to join a live collaboration session.'),
      disabled: !isConnected,
      icon: '🔗',
    },
    { type: 'separator' },
    { 
      label: 'Export Project (.json)', 
      action: () => exportProject(),
      disabled: false,
      icon: '⬇️',
    },
    { 
      label: 'Import Project (.json)', 
      action: () => importProject(),
      disabled: false,
      icon: '⬆️',
    },
    { type: 'separator' },
    { 
      label: 'Share Project Link…', 
      shortcut: 'Ctrl+L',
      action: onCopyLink,
      disabled: false,
      icon: '🔗',
    },
  ];

  return (
    <div className="topnav-project-menu" ref={menuRef} style={{ position: 'relative' }}>
      <button
        className="topnav-project-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'var(--c-bg-glass)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--c-text)',
          fontSize: '0.7rem',
          fontFamily: 'monospace',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="Project Menu"
      >
        <span 
          className={`collab-indicator ${isConnected ? 'connected' : 'disconnected'}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isConnected ? 'var(--c-success)' : 'var(--c-warning)',
            boxShadow: isConnected ? '0 0 8px var(--c-success)' : 'none',
            transition: 'all 0.3s ease',
            flexShrink: 0,
          }}
        />
        {isConnected && peerCount > 0 && (
          <span style={{ 
            fontSize: '0.6rem', 
            color: 'var(--c-accent)', 
            background: 'var(--c-accent-soft)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
          }}>
            +{peerCount}
          </span>
        )}
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {projectId?.slice(0, 8)}…
        </span>
        <span style={{ color: 'var(--c-text-dim)', marginLeft: 4 }}>▼</span>
        {unsavedChanges && (
          <span style={{ 
            color: 'var(--c-warning)', 
            fontSize: '0.6rem',
            background: 'rgba(245, 158, 11, 0.15)',
            padding: '1px 4px',
            borderRadius: 'var(--radius-sm)',
          }}>
            ● unsaved
          </span>
        )}
      </button>

      {isOpen && (
        <div className="topnav-project-dropdown" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '6px',
          padding: '6px',
          background: 'var(--c-bg-elevated)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '280px',
          zIndex: 100,
          fontSize: '0.75rem',
        }}>
          <div style={{ 
            padding: '8px 10px', 
            marginBottom: '4px',
            borderBottom: '1px solid var(--c-border)',
            fontSize: '0.65rem',
            color: 'var(--c-text-dim)',
            fontFamily: 'monospace',
          }}>
            <strong style={{ color: 'var(--c-text)' }}>Project</strong>
            {baseRevisionId && (
              <span style={{ marginLeft: '8px' }}>Based on: {baseRevisionId.slice(0, 8)}…</span>
            )}
          </div>

          {menuItems.map((item, idx) => {
            if (item.type === 'separator') {
              return <div key={idx} style={{ height: 1, background: 'var(--c-border)', margin: '4px 0' }} />;
            }
            if (item.isHeader) {
              return (
                <div key={idx} style={{ 
                  padding: '6px 8px 2px', 
                  fontSize: '0.6rem', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--c-text-dim)',
                  fontWeight: 600,
                }}>
                  {item.icon} {item.label}
                </div>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => { item.action?.(); setIsOpen(false); }}
                disabled={item.disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 10px',
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: item.disabled ? 'var(--c-text-muted)' : 'var(--c-text)',
                  fontSize: '0.75rem',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--c-bg-glass)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ fontSize: '0.9rem' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <span style={{ color: 'var(--c-text-dim)', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}

          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid var(--c-border)',
            fontSize: '0.6rem',
            color: 'var(--c-text-dim)',
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <input 
                type="text" 
                value={fullUrl} 
                readOnly 
                style={{ 
                  flex: 1, 
                  padding: '6px 8px', 
                  background: 'var(--c-bg-deep)', 
                  border: '1px solid var(--c-border)', 
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--c-text)',
                  fontFamily: 'monospace',
                  fontSize: '0.65rem'
                }}
              />
              <button 
                onClick={() => { handleCopyUrl(); setIsOpen(false); }}
                className="btn btn-primary btn-sm"
                style={{ whiteSpace: 'nowrap', padding: '6px 10px', fontSize: '0.65rem' }}
              >
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function exportProject() {
  const state = useGameStore.getState();
  const data = {
    projectId: state.projectId,
    projectName: state.projectName || 'Unnamed Project',
    version: 1,
    exportedAt: Date.now(),
    network: state.network,
    scenario: {
      activeScenarioId: state.activeScenarioId,
      gameMode: state.gameMode,
    },
    planningAnswers: state.planningAnswers,
    hintsUsed: state.hintsUsed,
    quizScore: state.quizScore,
    validationResult: state.validationResult,
    scores: state.scores,
    sdnState: state.sdnState,
    nfvState: state.nfvState,
    orchestrationState: state.orchestrationState,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.projectName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // Import logic would go here - for now just alert
      alert('Project import functionality will load the saved project state. Implementation pending.');
    } catch (err) {
      alert('Failed to import project: ' + err.message);
    }
  };
  input.click();
}