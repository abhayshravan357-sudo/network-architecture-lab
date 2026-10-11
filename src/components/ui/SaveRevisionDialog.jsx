import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../../state/gameStore.js';

export default function SaveRevisionDialog({
  isOpen,
  onClose,
  onSave,
  unsavedChanges,
  baseRevisionId,
  currentBranch,
}) {
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const [branchName, setBranchName] = useState(currentBranch);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const messageRef = useRef(null);

  // Auto-generate message based on changes
  useEffect(() => {
    if (isOpen && !message) {
      const state = useGameStore.getState();
      const changes = [];
      if (state.network.rfNodes.length > 0) changes.push('network topology');
      if (state.sdnState?.policies?.length) changes.push('SDN policies');
      if (state.nfvState?.deployments?.length) changes.push('NFV deployments');
      if (state.orchestrationState?.instances?.length) changes.push('orchestration instances');
      if (state.validationResult) changes.push('validation');
      
      if (changes.length > 0) {
        setMessage(`Updated ${changes.join(', ')}`);
      } else {
        setMessage('Save checkpoint');
      }
    }
  }, [isOpen, message]);

  // Focus message input on open
  useEffect(() => {
    if (isOpen && messageRef.current) {
      messageRef.current.focus();
      messageRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter a revision message');
      return;
    }
    setSaving(true);
    setError('');
    onSave(message.trim(), description.trim(), branchName.trim() || 'main');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="save-revision-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose} onKeyDown={handleKeyDown}>
      <form onSubmit={handleSubmit} style={{
        width: '90%',
        maxWidth: '480px',
        background: 'var(--c-bg-elevated)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideUp 0.25s ease',
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--c-border)',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--c-text)' }}>Save Revision</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--c-text-dim)' }}>
              Create a named checkpoint of your current work
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--c-text-dim)',
              fontSize: '1.25rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
            title="Cancel"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--c-error)',
              fontSize: '0.75rem',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: '6px', fontWeight: 500 }}>
              Title <span style={{ color: 'var(--c-error)' }}>*</span>
            </label>
            <input
              ref={messageRef}
              type="text"
              value={message}
              onChange={e => { setMessage(e.target.value); setError(''); }}
              placeholder="e.g., Added firewall and fixed routing"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--c-bg-deep)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--c-text)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: '6px', fontWeight: 500 }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what changed and why…"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--c-bg-deep)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--c-text)',
                fontSize: '0.8rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: '6px', fontWeight: 500 }}>
              Branch
            </label>
            <input
              type="text"
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--c-bg-deep)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--c-text)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {baseRevisionId && (
            <div style={{ 
              padding: '10px', 
              background: 'var(--c-bg-glass)', 
              border: '1px solid var(--c-border)', 
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '0.7rem',
            }}>
              <strong style={{ color: 'var(--c-text)' }}>Based on:</strong> Revision {baseRevisionId.slice(0, 8)}… ({currentBranch})
            </div>
          )}

          <div style={{ 
            padding: '10px', 
            background: 'var(--c-bg-glass)', 
            border: '1px solid var(--c-border)', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.7rem',
            color: 'var(--c-text-muted)',
          }}>
            <strong>Will include:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: '16px' }}>
              <li>Network topology (nodes, links, device configs)</li>
              <li>IP addresses, VLANs, routing</li>
              <li>SDN policies & flow rules</li>
              <li>NFV deployments & service chain</li>
              <li>Orchestration instances & load config</li>
              <li>Validation scores & stage progress</li>
            </ul>
            <p style={{ margin: '8px 0 0', fontSize: '0.65rem' }}>
              <em>Simulation playback state and UI viewport are not saved.</em>
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !message.trim()}
              className="btn btn-primary btn-sm"
            >
              {saving ? 'Saving…' : 'Save Revision'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}