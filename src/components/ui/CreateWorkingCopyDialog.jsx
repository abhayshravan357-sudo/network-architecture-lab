import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../../state/gameStore.js';

export default function CreateWorkingCopyDialog({
  isOpen,
  onClose,
  onCreate,
  sourceRevisionId,
  sourceRevisionMessage,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [branchName, setBranchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  // Auto-generate name from source revision
  useEffect(() => {
    if (isOpen && !name) {
      const base = sourceRevisionMessage || 'revision';
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '-');
      setName(`${base}-${timestamp}`);
      setBranchName(`feature/${base.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`);
    }
  }, [isOpen, name, sourceRevisionMessage]);

  useEffect(() => {
    if (isOpen && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a working copy name');
      return;
    }
    if (!branchName.trim()) {
      setError('Please enter a branch name');
      return;
    }
    setCreating(true);
    setError('');
    onCreate(name.trim(), description.trim(), branchName.trim(), sourceRevisionId);
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
    <div className="create-working-copy-modal" style={{
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
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--c-text)' }}>Create Working Copy</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--c-text-dim)' }}>
              Start an independent line of work from a saved revision
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--c-text-dim)',
              fontSize: '1.25rem',
              cursor: creating ? 'not-allowed' : 'pointer',
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

          <div style={{ 
            padding: '12px', 
            background: 'var(--c-bg-glass)', 
            border: '1px solid var(--c-border)', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ 
                fontSize: '0.6rem', 
                background: 'var(--c-accent)', 
                color: 'var(--c-bg)', 
                padding: '2px 6px', 
                borderRadius: 'var(--radius-sm)', 
                fontWeight: 600,
              }}>
                SOURCE
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)' }}>
                {sourceRevisionId.slice(0, 8)}…
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--c-text)' }}>
              {sourceRevisionMessage}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: '6px', fontWeight: 500 }}>
              Working Copy Name <span style={{ color: 'var(--c-error)' }}>*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g., campus-network-dmz-experiment"
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
              Branch Name <span style={{ color: 'var(--c-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={branchName}
              onChange={e => { setBranchName(e.target.value); setError(''); }}
              placeholder="e.g., feature/dmz-firewall-rules"
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
            <p style={{ margin: '6px 0 0', fontSize: '0.65rem', color: 'var(--c-text-dim)' }}>
              Use <code>feature/</code> prefix for feature branches, <code>fix/</code> for bug fixes
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-dim)', marginBottom: '6px', fontWeight: 500 }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What will you explore in this working copy?"
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

          <div style={{ 
            padding: '12px', 
            background: 'var(--c-info-soft)', 
            border: '1px solid var(--c-info)', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.7rem',
            color: 'var(--c-info)',
          }}>
            <strong>ℹ Independent Working Copy</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: '16px' }}>
              <li>Changes here will NOT affect the original project</li>
              <li>Save revisions to create checkpoints in this branch</li>
              <li>When ready, use <strong>Propose Changes</strong> to submit for review</li>
              <li>Original revision ({sourceRevisionId.slice(0, 8)}…) remains unchanged</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim() || !branchName.trim()}
              className="btn btn-primary btn-sm"
            >
              {creating ? 'Creating…' : 'Create Working Copy'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}