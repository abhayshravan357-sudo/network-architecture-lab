import React from 'react';
import { useTopologyStore } from '../store/topologyStore.js';
import { checkMission } from '../engine/validation/validationEngine.js';

export default function MissionPanel() {
  const mission = useTopologyStore((s) => s.mission);
  const topology = useTopologyStore((s) => s.topology);
  const pingResult = useTopologyStore((s) => s.pingResult);
  const xp = useTopologyStore((s) => s.xp);
  const missionCompleted = useTopologyStore((s) => s.missionCompleted);

  const verdict = checkMission(mission, topology, pingResult);

  return (
    <div className="panel mission-panel">
      <div className="mission-header">
        <div>
          <p className="eyebrow">MISSION 01</p>
          <h3>{mission.title}</h3>
          <p className="mission-description">{mission.description}</p>
        </div>
        <div className="xp-display">
          <span className="xp-label">XP</span>
          <span className="xp-value">{xp}</span>
        </div>
      </div>

      {missionCompleted && (
        <div className="mission-complete-banner">
          <strong>MISSION COMPLETE</strong>
          <span>+{mission.rewardXp} XP</span>
        </div>
      )}

      <ul className="mission-checks">
        {verdict.checks.map((check) => (
          <li key={check.name} className={check.passed ? 'passed' : 'failed'}>
            <span className="check-icon">{check.passed ? '✓' : '✗'}</span>
            <span>{check.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
