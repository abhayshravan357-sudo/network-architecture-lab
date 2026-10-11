/**
 * Event timeline — the ordered list of engine decisions.
 *
 * Clicking an event focuses it in the canvas and opens it in the inspector.
 * Events are grouped by conceptual plane (data, control, service) because a
 * control-plane decision and a packet-processing event are not the same kind
 * of thing; orchestration actions are listed separately again, since they are
 * lifecycle events that packet flow does not trigger.
 */

import React, { memo, useEffect, useRef } from 'react';
import { JOURNEY_LAYERS } from '../../engine/simulation/journeyEventTypes.js';

const LAYOUT_SECTIONS = [
  { layer: JOURNEY_LAYERS.DATA, title: 'Data plane — packet path' },
  { layer: JOURNEY_LAYERS.CONTROL, title: 'Control plane — SDN decisions' },
  { layer: JOURNEY_LAYERS.SERVICE, title: 'Service chain — NFV processing' },
];

const OUTCOME_CLASS = {
  dropped: 'is-danger',
  deny: 'is-danger',
  miss: 'is-warning',
  'no-rule': 'is-warning',
  'missing-instance': 'is-warning',
  'off-path': 'is-warning',
  delivered: 'is-success',
  installed: 'is-success',
  hit: 'is-success',
};

function shortType(type) {
  return type.replace(/_/g, ' ').toLowerCase();
}

const TimelineItem = memo(function TimelineItem({ event, isActive, onSelect, showExplanations }) {
  const ref = useRef(null);

  useEffect(() => {
    if (isActive && ref.current?.scrollIntoView) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  return (
    <div
      ref={ref}
      className={`sim-timeline-item${isActive ? ' is-active' : ''}${event.terminal ? ' is-terminal' : ''}`}
      onClick={() => onSelect(event.seq)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(event.seq);
      }}
      title={event.decision}
    >
      <span className="sim-timeline-seq">{event.seq}</span>
      <span className={`sim-timeline-dot ${OUTCOME_CLASS[event.outcome] ?? ''}`} aria-hidden="true" />
      <span className="sim-timeline-body">
        <span className="sim-timeline-head">
          <span className="sim-timeline-type">{shortType(event.type)}</span>
          <span className="sim-timeline-device">{event.deviceId}</span>
        </span>
        <span className="sim-timeline-decision">{event.decision}</span>
        {showExplanations && isActive && (
          <span className="sim-timeline-explanation">{event.explanation?.what}</span>
        )}
      </span>
    </div>
  );
});

export default function SimTimeline({ events, activeSeq, onSelect, showExplanations }) {
  return (
    <div className="sim-timeline">
      <div className="sim-panel-head">
        <span className="eyebrow">Event timeline</span>
        <span className="sim-panel-count">{events.length} events</span>
      </div>

      <div className="sim-timeline-scroll">
        {LAYOUT_SECTIONS.map((section) => {
          const sectionEvents = events.filter((e) => e.layer === section.layer);
          if (sectionEvents.length === 0) return null;
          return (
            <div key={section.layer} className="sim-timeline-section">
              <div className="sim-timeline-section-title">{section.title}</div>
              {sectionEvents.map((event) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  isActive={event.seq === activeSeq}
                  onSelect={onSelect}
                  showExplanations={showExplanations}
                />
              ))}
            </div>
          );
        })}

        {events.length === 0 && (
          <p style={{ color: 'var(--c-text-dim)', fontSize: '0.82rem', padding: '12px 4px' }}>
            No events yet — run a journey to populate the timeline.
          </p>
        )}
      </div>
    </div>
  );
}
