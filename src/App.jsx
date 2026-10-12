import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { useGameStore, STAGES, STAGE_ORDER, STAGE_LABELS } from './state/gameStore.js';
import { uiAssets } from './assets/assetMap.js';
import ProgressBar from './components/ui/ProgressBar.jsx';
import NetworkStatus from './components/ui/NetworkStatus.jsx';
import { CollaborationProvider, useCollaboration } from './collaboration/CollaborationProvider.jsx';
import ProjectMenu from './components/ui/ProjectMenu.jsx';
import RevisionHistory from './components/ui/RevisionHistory.jsx';
import SaveRevisionDialog from './components/ui/SaveRevisionDialog.jsx';
import CreateWorkingCopyDialog from './components/ui/CreateWorkingCopyDialog.jsx';
import { 
  getOrCreateProject, 
  createWorkingCopy, 
  createRevision, 
  listRevisions, 
  listWorkingCopies,
  getRevision,
  migrateExistingProject,
  extractProjectData 
} from './collaboration/ProjectManager.js';
import './index.css';

// ── Lazy-loaded stage components ───────────────────────────────────────────
const HomeScreen        = lazy(() => import('./components/home/HomeScreen.jsx'));
const ScenarioSelect    = lazy(() => import('./components/scenario/ScenarioSelect.jsx'));
const ScenarioBriefing  = lazy(() => import('./components/scenario/ScenarioBriefing.jsx'));
const PlanningQuiz      = lazy(() => import('./components/planning/PlanningQuiz.jsx'));
const ResourcePool      = lazy(() => import('./components/planning/ResourcePool.jsx'));
const NetworkBuilder    = lazy(() => import('./components/builder/NetworkBuilder.jsx'));
const ValidationResults = lazy(() => import('./components/validation/ValidationResults.jsx'));
const WhyExplainer      = lazy(() => import('./components/learning/WhyExplainer.jsx'));
const SdnStage          = lazy(() => import('./components/sdn/SdnStage.jsx'));
const NfvStage          = lazy(() => import('./components/nfv/NfvStage.jsx'));
const OrchestrationStage = lazy(() => import('./components/orchestration/OrchestrationStage.jsx'));
const SimulationStage   = lazy(() => import('./components/simulation/SimulationStage.jsx'));
const ResultsScreen     = lazy(() => import('./components/results/ResultsScreen.jsx'));
const PracticeLab       = lazy(() => import('./components/practice/PracticeLab.jsx'));
const LearnConcepts     = lazy(() => import('./components/learning/LearnConcepts.jsx'));

// ── Stages visible in the breadcrumb (excludes HOME, SCENARIO_SELECT) ────
const BREADCRUMB_STAGES = [
  STAGES.SCENARIO_BRIEFING,
  STAGES.PLANNING_QUIZ,
  STAGES.RESOURCE_POOL,
  STAGES.BUILD,
  STAGES.VALIDATE,
  STAGES.LEARN,
  STAGES.SDN,
  STAGES.NFV,
  STAGES.ORCHESTRATION,
  STAGES.SIMULATION,
  STAGES.RESULTS,
  STAGES.PRACTICE_LAB,
  STAGES.LEARN_CONCEPTS,
];

// ── Top Navigation Bar ─────────────────────────────────────────────────────

function TopNav() {
  const currentStage = useGameStore((s) => s.currentStage);
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const projectId = useGameStore((s) => s.projectId);
  const projectName = useGameStore((s) => s.projectName);
  const workingCopyId = useGameStore((s) => s.workingCopyId);
  const baseRevisionId = useGameStore((s) => s.baseRevisionId);
  const branchName = useGameStore((s) => s.branchName);
  const unsavedChanges = useGameStore((s) => s.unsavedChanges);
  const goToHome = useGameStore((s) => s.goToHome);
  const goToStage = useGameStore((s) => s.goToStage);
  const resetAll = useGameStore((s) => s.resetAll);
  const markSaved = useGameStore((s) => s.markSaved);
  const { isConnected, peerCount } = useCollaboration();

  const showBreadcrumb = BREADCRUMB_STAGES.includes(currentStage);
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  // Helper to confirm navigation when unsaved changes exist
  const confirmNavigation = useCallback((action) => {
    if (unsavedChanges) {
      if (window.confirm('You have unsaved changes. Discard changes and navigate away?')) {
        action();
      }
    } else {
      action();
    }
  }, [unsavedChanges]);

  const handleBrandClick = () => {
    confirmNavigation(() => {
      if (activeScenarioId && currentStage !== STAGES.HOME) {
        goToHome();
      } else {
        goToHome();
      }
    });
  };

  // Dialog states
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveRevision, setShowSaveRevision] = useState(false);
  const [showCreateWorkingCopy, setShowCreateWorkingCopy] = useState(false);
  const [selectedRevisionForCopy, setSelectedRevisionForCopy] = useState(null);

  const handleSaveRevision = () => setShowSaveRevision(true);
  const handleShowHistory = () => setShowHistory(true);
  const handleCreateWorkingCopy = (revisionId) => {
    if (revisionId) {
      const rev = getRevision(revisionId);
      if (rev) {
        setSelectedRevisionForCopy(rev);
        setShowCreateWorkingCopy(true);
      }
    } else {
      setShowCreateWorkingCopy(true);
    }
  };
  const handleProposeChanges = () => {
    alert('Propose Changes - Phase 3 implementation pending');
  };
  const handleStartLiveSession = () => {
    alert('Start Live Session - Phase 6 implementation pending');
  };
  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${window.location.pathname}?project=${projectId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      alert('Project link copied to clipboard!');
    });
  };

  const handleSaveRevisionSubmit = (message, description, branch) => {
    const state = useGameStore.getState();
    const revision = createRevision(
      projectId,
      baseRevisionId,
      branch,
      message,
      description,
      'Anonymous', // TODO: get actual user name
      extractProjectData(state)
    );
    markSaved();
    useGameStore.setState({ baseRevisionId: revision.revisionId });
    setShowSaveRevision(false);
  };

  const handleCreateWorkingCopySubmit = (name, description, branch, sourceRevisionId) => {
    const state = useGameStore.getState();
    const copy = createWorkingCopy(
      projectId,
      sourceRevisionId,
      name,
      description,
      branch,
      extractProjectData(state)
    );
    useGameStore.setState({ 
      workingCopyId: copy.workingCopyId, 
      baseRevisionId: copy.baseRevisionId,
      branchName: copy.branchName,
      unsavedChanges: false,
    });
    setShowCreateWorkingCopy(false);
    setSelectedRevisionForCopy(null);
  };

  const handleLoadRevision = (revision) => {
    if (unsavedChanges && !window.confirm('You have unsaved changes. Load this revision anyway?')) {
      return;
    }
    useGameStore.getState().loadProjectData(revision.data);
    useGameStore.setState({ 
      baseRevisionId: revision.revisionId,
      branchName: revision.branchName,
      unsavedChanges: false,
    });
    setShowHistory(false);
  };

  const handleCompareRevision = (revision) => {
    alert(`Compare with ${revision.revisionId.slice(0, 8)}… - Phase 2 implementation pending`);
  };

  const handleRestoreAsNew = (revision) => {
    const state = useGameStore.getState();
    const newRev = createRevision(
      projectId,
      revision.parentRevisionId,
      revision.branchName,
      `Restored: ${revision.message}`,
      `Restored from ${revision.revisionId.slice(0, 8)}`,
      'Anonymous',
      revision.data
    );
    useGameStore.getState().loadProjectData(newRev.data);
    useGameStore.setState({ 
      baseRevisionId: newRev.revisionId,
      branchName: newRev.branchName,
      unsavedChanges: false,
    });
    setShowHistory(false);
  };

  const handleCreateWorkingCopyFromRevision = (revision) => {
    setSelectedRevisionForCopy(revision);
    setShowCreateWorkingCopy(true);
  };

  const handleDeleteRevision = (revisionId) => {
    if (window.confirm('Delete this revision? This cannot be undone.')) {
      // deleteRevision(revisionId); // Need to import
      alert('Delete revision - implementation pending');
    }
  };

  return (
    <>
      <header className="topnav">
      {/* Brand */}
      <button
        className="topnav-brand"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={handleBrandClick}
        title="Return to Home"
      >
        <img src={uiAssets.logo} alt="" className="topnav-brand-icon" />
        <span className="topnav-brand-name">Network Lab</span>
      </button>

      {showBreadcrumb && (
        <>
          <div className="topnav-divider" />
          <nav className="topnav-breadcrumb" aria-label="Mission progress">
            {BREADCRUMB_STAGES.map((stage, i) => {
              const stageIdx = STAGE_ORDER.indexOf(stage);
              const isActive = stage === currentStage;
              const isCompleted = stageIdx < currentIdx;
              const isReachable = stageIdx <= currentIdx;

              return (
                <React.Fragment key={stage}>
                  {i > 0 && <span className="topnav-chevron">›</span>}
                  <button
                    className={`topnav-stage ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    style={{ background: 'none', border: isActive ? undefined : 'none', cursor: isReachable ? 'pointer' : 'default', padding: isActive ? undefined : '4px 6px' }}
                    onClick={() => isReachable && confirmNavigation(() => goToStage(stage))}
                    title={isCompleted ? `Go back to ${STAGE_LABELS[stage]}` : STAGE_LABELS[stage]}
                    disabled={!isReachable}
                  >
                    {isCompleted && <span className="topnav-stage-dot" />}
                    {STAGE_LABELS[stage]}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Project Menu - replaces old collaboration status */}
      <ProjectMenu
        projectId={projectId}
        isConnected={isConnected}
        peerCount={peerCount}
        onSaveRevision={handleSaveRevision}
        onShowHistory={handleShowHistory}
        onCreateWorkingCopy={handleCreateWorkingCopy}
        onProposeChanges={handleProposeChanges}
        onStartLiveSession={handleStartLiveSession}
        onCopyLink={handleCopyLink}
        unsavedChanges={unsavedChanges}
        baseRevisionId={baseRevisionId}
      />

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div className="topnav-actions">
        {activeScenarioId && currentStage !== STAGES.HOME && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => confirmNavigation(() => { if (window.confirm('Abandon this mission? Progress will be reset.')) resetAll(); })}
            title="Abandon mission"
          >
            ✕ Quit
          </button>
        )}
      </div>
    </header>
    <>
      <RevisionHistory
      isOpen={showHistory}
      onClose={() => setShowHistory(false)}
      onLoadRevision={handleLoadRevision}
      onCompareRevision={handleCompareRevision}
      onRestoreAsNew={handleRestoreAsNew}
      onCreateWorkingCopy={handleCreateWorkingCopyFromRevision}
      onDeleteRevision={handleDeleteRevision}
      currentRevisionId={baseRevisionId}
      unsavedChanges={unsavedChanges}
    />
    <SaveRevisionDialog
      isOpen={showSaveRevision}
      onClose={() => setShowSaveRevision(false)}
      onSave={handleSaveRevisionSubmit}
      unsavedChanges={unsavedChanges}
      baseRevisionId={baseRevisionId}
      currentBranch={branchName}
    />
    <CreateWorkingCopyDialog
      isOpen={showCreateWorkingCopy}
      onClose={() => { setShowCreateWorkingCopy(false); setSelectedRevisionForCopy(null); }}
      onCreate={handleCreateWorkingCopySubmit}
      sourceRevisionId={selectedRevisionForCopy?.revisionId || baseRevisionId}
      sourceRevisionMessage={selectedRevisionForCopy?.message || 'Current working copy'}
    />
    </>
    </>
  );
}

// ── Stage Router ───────────────────────────────────────────────────────────

function StageRouter() {
  const currentStage = useGameStore((s) => s.currentStage);

  const fallback = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#7dd3fc', gap: 12, fontSize: '1rem' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="40" strokeDashoffset="10" />
      </svg>
      Loading…
    </div>
  );

  return (
    <main className="page">
      <Suspense fallback={fallback}>
        {currentStage === STAGES.HOME            && <HomeScreen />}
        {currentStage === STAGES.SCENARIO_SELECT && <ScenarioSelect />}
        {currentStage === STAGES.SCENARIO_BRIEFING && <ScenarioBriefing />}
        {currentStage === STAGES.PLANNING_QUIZ   && <PlanningQuiz />}
        {currentStage === STAGES.RESOURCE_POOL   && <ResourcePool />}
        {currentStage === STAGES.BUILD           && <NetworkBuilder />}
        {currentStage === STAGES.VALIDATE        && <ValidationResults />}
        {currentStage === STAGES.LEARN           && <WhyExplainer />}
        {currentStage === STAGES.SDN             && <SdnStage />}
        {currentStage === STAGES.NFV             && <NfvStage />}
        {currentStage === STAGES.ORCHESTRATION   && <OrchestrationStage />}
        {currentStage === STAGES.SIMULATION      && <SimulationStage />}
        {currentStage === STAGES.RESULTS         && <ResultsScreen />}
        {currentStage === STAGES.PRACTICE_LAB    && <PracticeLab />}
        {currentStage === STAGES.LEARN_CONCEPTS  && <LearnConcepts />}
      </Suspense>
    </main>
  );
}

// ── App Inner (runs inside CollaborationProvider) ────────────────────────────

function AppInner() {
  const projectId = useGameStore((s) => s.projectId);
  const workingCopyId = useGameStore((s) => s.workingCopyId);
  const initializeProject = useGameStore((s) => s.initializeProject);
  const setWorkingCopy = useGameStore((s) => s.setWorkingCopy);
  const markSaved = useGameStore((s) => s.markSaved);
  const unsavedChanges = useGameStore((s) => s.unsavedChanges);
  const { isConnected } = useCollaboration();

  // Beforeunload handler for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (unsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  // Initialize project on first load
  useEffect(() => {
    if (!projectId) {
      const params = new URLSearchParams(window.location.search);
      const urlProjectId = params.get('project');
      const finalProjectId = urlProjectId || generateId();
      
      if (!urlProjectId) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('project', finalProjectId);
        window.history.replaceState({}, '', newUrl);
      }
      
      const project = getOrCreateProject(finalProjectId);
      initializeProject(finalProjectId, project.name);
      
      // Check for existing working copy or migrate from localStorage
      const existingCopies = listWorkingCopies(finalProjectId);
      if (existingCopies.length > 0) {
        // Load the most recent working copy
        const latestCopy = existingCopies.sort((a, b) => b.lastSaved - a.lastSaved)[0];
        setWorkingCopy(latestCopy.workingCopyId, latestCopy.baseRevisionId);
        useGameStore.getState().loadProjectData(latestCopy.data);
        markSaved();
      } else {
        // Migrate from old localStorage state
        const copy = migrateExistingProject(finalProjectId, useGameStore.getState());
        setWorkingCopy(copy.workingCopyId, copy.baseRevisionId);
        markSaved();
      }
    }
  }, [projectId, isConnected]);

  return (
    <div className="app-shell">
      <TopNav />
      <ProgressBar />
      <NetworkStatus />
      <StageRouter />
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <CollaborationProvider>
      <AppInner />
    </CollaborationProvider>
  );
}

// Helper for generating ID
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
