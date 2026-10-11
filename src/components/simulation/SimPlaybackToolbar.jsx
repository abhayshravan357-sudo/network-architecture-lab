/**
 * Playback toolbar — every control changes playback state only.
 *
 * Nothing here re-runs the network engine, so play, pause, step, restart and
 * speed can never change the simulation's outcome.
 */

import React from 'react';
import { SPEED_OPTIONS } from './useJourneyPlayback.js';

function ToolbarButton({ label, title, onClick, disabled, variant = 'ghost' }) {
  return (
    <button
      className={`btn btn-${variant} btn-sm sim-tool`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  );
}

export default function SimPlaybackToolbar({
  playback,
  showLabels,
  onToggleLabels,
  showExplanations,
  onToggleExplanations,
  onSelectPacket,
  outcome,
  stale,
}) {
  const isPlaying = playback.status === 'playing';

  return (
    <div className="sim-toolbar">
      <div className="sim-toolbar-group">
        <ToolbarButton
          label={isPlaying ? '⏸ Pause' : '▶ Play'}
          title={isPlaying ? 'Pause playback' : 'Play the journey'}
          onClick={playback.toggle}
          disabled={playback.eventCount === 0}
          variant={isPlaying ? 'warning' : 'primary'}
        />
        <ToolbarButton
          label="⏮ Back"
          title="Step to the previous event"
          onClick={playback.stepBackward}
          disabled={playback.isFirst}
        />
        <ToolbarButton
          label="⏭ Forward"
          title="Step to the next event"
          onClick={playback.stepForward}
          disabled={playback.isLast}
        />
        <ToolbarButton label="⟳ Restart" title="Restart from the first event" onClick={playback.restart} />
      </div>

      <div className="sim-toolbar-group">
        <span className="sim-toolbar-label">Speed</span>
        <select
          className="field sim-speed"
          value={playback.speed}
          onChange={(e) => playback.setSpeed(Number(e.target.value))}
          aria-label="Playback speed"
        >
          {SPEED_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}x
            </option>
          ))}
        </select>
      </div>

      <div className="sim-toolbar-group">
        <button
          className={`btn btn-ghost btn-sm sim-toggle${showLabels ? ' is-on' : ''}`}
          onClick={onToggleLabels}
          aria-pressed={showLabels}
        >
          Packet labels
        </button>
        <button
          className={`btn btn-ghost btn-sm sim-toggle${showExplanations ? ' is-on' : ''}`}
          onClick={onToggleExplanations}
          aria-pressed={showExplanations}
        >
          Explanations
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onSelectPacket} title="Inspect the packet record">
          Packet
        </button>
      </div>

      <div className="sim-toolbar-status">
        <span className="mono">
          Event {playback.eventCount ? playback.index + 1 : 0} / {playback.eventCount}
        </span>
        {outcome && <span className={`sim-outcome-chip is-${outcome.kind}`}>{outcome.label}</span>}
        {stale && <span className="sim-outcome-chip is-warning">Configuration changed — re-run</span>}
      </div>
    </div>
  );
}
