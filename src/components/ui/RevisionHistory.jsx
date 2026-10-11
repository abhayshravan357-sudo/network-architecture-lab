import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../state/gameStore.js';

export default function RevisionHistory({
  isOpen,
  onClose,
  onLoadRevision,
  onCompareRevision,
  onRestoreAsNew,
  onCreateWorkingCopy,
  onDeleteRevision,
  currentRevisionId,
  unsavedChanges,
}) {
  const [revisions, setRevisions] = useState([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState(null);
  const [filterBranch, setFilterBranch] = useState('all');
  const [loading, setLoading] = useState(true);

  // Load revisions from localStorage
  useEffect(() => {
    if (isOpen) {
      loadRevisions();
    }
  }, [isOpen]);

  const loadRevisions = useCallback(() => {
    setLoading(true);
    try {
      const indexKey = 'nal-revisions-index';
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
      const revs = [];
      
      for (const revId of index) {
        const data = localStorage.getItem(`nal-revision-${revId}`);
        if (data) {
          revs.push(JSON.parse(data));
        }
      }
      
      // Sort by timestamp descending
      revs.sort((a, b) => b.timestamp - a.timestamp);
      setRevisions(revs);
    } catch (err) {
      console.error('Failed to load revisions:', err);
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getBranchList = useCallback(() => {
    const branches = new Set();
    revisions.forEach(r => branches.add(r.branchName));
    return ['all', ...Array.from(branches).sort()];
  }, [revisions]);

  const filteredRevisions = revisions.filter(r => 
    filterBranch === 'all' || r.branchName === filterBranch
  );

  const formatTime = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatScore = (score) => {
    if (score >= 80) return { color: 'var(--c-success)', label: `${score}%` };
    if (score >= 60) return { color: 'var(--c-warning)', label: `${score}%` };
    return { color: 'var(--c-error)', label: `${score}%` };
  };

  if (!isOpen) return null;

  return (
    <div className="revision-history-modal" style={{
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
    }} onClick={onClose}>
      <div className="revision-history-panel" style={{
        width: '90%',
        maxWidth: '720px',
        maxHeight: '85vh',
        background: 'var(--c-bg-elevated)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--c-text)' }}>Revision History</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--c-text-dim)' }}>
              {revisions.length} revision{revisions.length !== 1 ? 's' : ''} • {getBranchList().length - 1} branch{getBranchList().length !== 2 ? 'es' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--c-text-dim)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Branch Filter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderBottom: '1px solid var(--c-border)',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch:</span>
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'var(--c-bg-deep)',
              border: '1px solid var(--c-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--c-text)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {getBranchList().map(b => (
              <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)' }}>
            {filteredRevisions.length} of {revisions.length}
          </span>
        </div>

        {/* Revision List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '200px',
              color: 'var(--c-text-dim)' 
            }}>
              Loading revisions…
            </div>
          ) : filteredRevisions.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '200px',
              color: 'var(--c-text-dim)',
              textAlign: 'center',
              padding: '20px',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📜</div>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No revisions saved yet</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.7rem' }}>
                Make changes to your network and click <strong>Save Revision</strong> to create a checkpoint.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredRevisions.map((rev, idx) => {
                const isCurrent = rev.revisionId === currentRevisionId;
                const isSelected = rev.revisionId === selectedRevisionId;
                const scoreInfo = formatScore(rev.metadata.validationScore);
                
                return (
                  <div
                    key={rev.revisionId}
                    onClick={() => setSelectedRevisionId(rev.revisionId)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      background: isSelected ? 'var(--c-accent-soft)' : (isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'transparent'),
                      border: isSelected ? '1px solid var(--c-accent)' : (isCurrent ? '1px solid var(--c-info)' : '1px solid transparent'),
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--c-bg-glass)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'transparent'; }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isCurrent ? 'var(--c-info)' : 'var(--c-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: isCurrent ? 'var(--c-bg)' : 'var(--c-text-dim)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}>
                      {isCurrent ? '●' : (idx + 1)}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          fontWeight: 600, 
                          color: 'var(--c-text)',
                          fontSize: '0.8rem',
                        }}>
                          {rev.message}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: '0.55rem',
                            background: 'var(--c-info)',
                            color: 'var(--c-bg)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                          }}>
                            CURRENT
                          </span>
                        )}
                        <span style={{ 
                          fontSize: '0.6rem', 
                          color: 'var(--c-text-dim)',
                          background: 'var(--c-bg-glass)',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          {rev.branchName}
                        </span>
                        <span style={{ 
                          fontSize: '0.6rem', 
                          color: scoreInfo.color,
                          fontWeight: 600,
                        }}>
                          {scoreInfo.label}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.65rem', color: 'var(--c-text-dim)' }}>
                        <span>📦 {rev.metadata.deviceCount} devices</span>
                        <span>🔗 {rev.metadata.linkCount} links</span>
                        <span>⏱ {formatTime(rev.timestamp)}</span>
                        <span>by {rev.author}</span>
                      </div>
                      
                      {rev.description && (
                        <div style={{ 
                          marginTop: '6px', 
                          fontSize: '0.65rem', 
                          color: 'var(--c-text-muted)',
                          lineHeight: 1.4,
                        }}>
                          {rev.description}
                        </div>
                      )}
                      
                      {rev.parentRevisionId && (
                        <div style={{ marginTop: '4px', fontSize: '0.6rem', color: 'var(--c-text-muted)' }}>
                          Parent: {rev.parentRevisionId.slice(0, 8)}…
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onCompareRevision(rev); }}
                        disabled={isCurrent}
                        title="Compare with current working copy"
                        style={{
                          padding: '6px 10px',
                          background: 'var(--c-bg-deep)',
                          border: '1px solid var(--c-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: isCurrent ? 'var(--c-text-muted)' : 'var(--c-text)',
                          fontSize: '0.65rem',
                          cursor: isCurrent ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Compare
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onLoadRevision(rev); }}
                        disabled={isCurrent || unsavedChanges}
                        title={unsavedChanges ? 'Save or discard unsaved changes first' : 'Load this revision'}
                        style={{
                          padding: '6px 10px',
                          background: 'var(--c-bg-deep)',
                          border: '1px solid var(--c-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: (isCurrent || unsavedChanges) ? 'var(--c-text-muted)' : 'var(--c-text)',
                          fontSize: '0.65rem',
                          cursor: (isCurrent || unsavedChanges) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRestoreAsNew(rev); }}
                        title="Create new revision from this one"
                        style={{
                          padding: '6px 10px',
                          background: 'var(--c-bg-deep)',
                          border: '1px solid var(--c-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--c-text)',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Restore as New
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onCreateWorkingCopy(rev); }}
                        title="Create independent working copy from this revision"
                        style={{
                          padding: '6px 10px',
                          background: 'var(--c-bg-deep)',
                          border: '1px solid var(--c-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--c-text)',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        New Working Copy
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteRevision(rev.revisionId); }}
                          title="Delete this revision"
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--c-error)',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '16px 20px',
          borderTop: '1px solid var(--c-border)',
        }}>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}