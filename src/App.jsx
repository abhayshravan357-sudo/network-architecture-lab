import React, { Suspense, lazy } from 'react';
import { useGameStore, STAGES, STAGE_ORDER, STAGE_LABELS } from './state/gameStore.js';
import { uiAssets } from './assets/assetMap.js';
import ProgressBar from './components/ui/ProgressBar.jsx';
import NetworkStatus from './components/ui/NetworkStatus.jsx';
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
];

// ── Top Navigation Bar ─────────────────────────────────────────────────────

function TopNav() {
  const currentStage = useGameStore((s) => s.currentStage);
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToHome = useGameStore((s) => s.goToHome);
  const goToStage = useGameStore((s) => s.goToStage);
  const resetAll = useGameStore((s) => s.resetAll);

  const showBreadcrumb = BREADCRUMB_STAGES.includes(currentStage);
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  const handleBrandClick = () => {
    if (activeScenarioId && currentStage !== STAGES.HOME) {
      if (window.confirm('Return to home? Your progress will be saved.')) {
        goToHome();
      }
    } else {
      goToHome();
    }
  };

  return (
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
                    onClick={() => isCompleted && goToStage(stage)}
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

      {/* Actions */}
      <div className="topnav-actions">
        {activeScenarioId && currentStage !== STAGES.HOME && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { if (window.confirm('Abandon this mission? Progress will be reset.')) resetAll(); }}
            title="Abandon mission"
          >
            ✕ Quit
          </button>
        )}
      </div>
    </header>
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
      </Suspense>
    </main>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <ProgressBar />
      <NetworkStatus />
      <StageRouter />
    </div>
  );
}
