import React from 'react';
import { useGameStore, STAGES, STAGE_ORDER, STAGE_LABELS } from '../../state/gameStore.js';

const STAGE_STATUS = {
  [STAGES.HOME]: 'ready',
  [STAGES.SCENARIO_SELECT]: 'ready',
  [STAGES.SCENARIO_BRIEFING]: 'active',
  [STAGES.PLANNING_QUIZ]: 'active',
  [STAGES.RESOURCE_POOL]: 'active',
  [STAGES.BUILD]: 'active',
  [STAGES.VALIDATE]: 'active',
  [STAGES.LEARN]: 'active',
  [STAGES.SDN]: 'active',
  [STAGES.NFV]: 'active',
  [STAGES.ORCHESTRATION]: 'active',
  [STAGES.SIMULATION]: 'active',
  [STAGES.RESULTS]: 'complete',
};

const LEARNING_STAGES = [
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

const STAGE_SCORE_KEYS = {
  [STAGES.PLANNING_QUIZ]: 'planning',
  [STAGES.VALIDATE]: 'architecture',
  [STAGES.SDN]: 'sdn',
  [STAGES.NFV]: 'nfv',
  [STAGES.ORCHESTRATION]: 'orchestration',
  [STAGES.SIMULATION]: 'simulation',
  [STAGES.RESULTS]: 'overall',
};

export default function ProgressBar() {
  const currentStage = useGameStore((s) => s.currentStage);
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const scores = useGameStore((s) => s.scores);

  if (!activeScenarioId && currentStage === STAGES.HOME) return null;

  const currentIdx = LEARNING_STAGES.indexOf(currentStage);
  const isComplete = currentStage === STAGES.RESULTS;

  return (
    <div className="progress-bar" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', flexWrap: 'wrap' }}>
      {LEARNING_STAGES.map((stage, i) => {
        const isActive = stage === currentStage;
        const isPast = i < currentIdx || isComplete;
        const scoreKey = STAGE_SCORE_KEYS[stage];
        const score = scoreKey != null ? scores[scoreKey] : null;
        return (
          <React.Fragment key={stage}>
            {i > 0 && <span className="topnav-chevron" style={{ color: 'var(--c-text-dim)', fontSize: '0.8rem' }}>›</span>}
            <span
              className={`progress-step ${isActive ? 'active' : ''} ${isPast ? 'complete' : ''}`}
              title={isPast && score != null ? `${STAGE_LABELS[stage]}: ${score}%` : STAGE_LABELS[stage]}
              style={{
                fontSize: '0.68rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--c-accent-soft)' : isPast ? 'var(--c-text-muted)' : 'var(--c-text-dim)',
                cursor: 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              {isPast && <span style={{ color: 'var(--c-success)', fontSize: '0.7rem' }}>✓</span>}
              {isActive && <span style={{ color: 'var(--c-accent)', fontSize: '0.6rem' }}>●</span>}
              {STAGE_LABELS[stage]}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
