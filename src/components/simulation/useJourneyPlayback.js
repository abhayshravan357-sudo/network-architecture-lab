/**
 * Journey playback — playback state only.
 *
 * The journey events are produced once by the engine (journeyEvents.js) and
 * are never recomputed here. This hook owns:
 *   - the current event index and play/pause state,
 *   - playback speed (timing only — never changes the network result),
 *   - a tiny external store for per-frame progress so that only the moving
 *     packet marker re-renders while the topology stays untouched.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { JOURNEY_EVENT_TYPES } from '../../engine/simulation/journeyEventTypes.js';

/**
 * Baseline duration of each event type at 1x speed, in milliseconds.
 * Traversal events are slower because the packet actually crosses a link.
 */
export const EVENT_DURATION_MS = {
  [JOURNEY_EVENT_TYPES.PACKET_CREATED]: 700,
  [JOURNEY_EVENT_TYPES.ADDRESS_RESOLUTION]: 900,
  [JOURNEY_EVENT_TYPES.SWITCH_RECEIVED_FRAME]: 650,
  [JOURNEY_EVENT_TYPES.MAC_LEARNED]: 650,
  [JOURNEY_EVENT_TYPES.MAC_LOOKUP]: 700,
  [JOURNEY_EVENT_TYPES.FLOW_TABLE_LOOKUP]: 850,
  [JOURNEY_EVENT_TYPES.TABLE_MISS]: 700,
  [JOURNEY_EVENT_TYPES.CONTROLLER_REQUEST]: 950,
  [JOURNEY_EVENT_TYPES.FLOW_RULE_INSTALLED]: 850,
  [JOURNEY_EVENT_TYPES.ROUTE_SELECTED]: 900,
  [JOURNEY_EVENT_TYPES.POLICY_DECISION]: 950,
  [JOURNEY_EVENT_TYPES.VNF_PROCESSING_STARTED]: 900,
  [JOURNEY_EVENT_TYPES.VNF_PROCESSING_COMPLETED]: 800,
  [JOURNEY_EVENT_TYPES.VNF_UNAVAILABLE]: 900,
  [JOURNEY_EVENT_TYPES.PACKET_FORWARDED]: 1100,
  [JOURNEY_EVENT_TYPES.PACKET_FLOODED]: 1100,
  [JOURNEY_EVENT_TYPES.PACKET_DROPPED]: 1300,
  [JOURNEY_EVENT_TYPES.PACKET_DELIVERED]: 1400,
  [JOURNEY_EVENT_TYPES.SERVICE_CHAIN_NOTE]: 600,
  [JOURNEY_EVENT_TYPES.ORCHESTRATION_ACTION]: 600,
  [JOURNEY_EVENT_TYPES.SIMULATION_COMPLETED]: 700,
};

export const SPEED_OPTIONS = [0.5, 1, 2, 4];

/**
 * A minimal external store for animation progress.
 * Only components that subscribe (the packet marker) re-render per frame.
 */
export function createJourneyClock(initialProgress = 1) {
  let progress = initialProgress;
  const listeners = new Set();
  return {
    get() {
      return progress;
    },
    set(next) {
      const clamped = Math.max(0, Math.min(1, next));
      if (clamped === progress) return;
      progress = clamped;
      for (const listener of [...listeners]) listener(clamped);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Subscribe a component to the animation clock. */
export function useJourneyClock(clock) {
  return useSyncExternalStore(clock.subscribe, clock.get, clock.get);
}

function durationFor(event, speed, reducedMotion) {
  if (reducedMotion) return 0;
  const base = EVENT_DURATION_MS[event?.type] ?? 700;
  // Guard against a zero/negative speed making progress never advance.
  return Math.max(1, base / (speed > 0 ? speed : 1));
}

/**
 * @param {Array} events  ordered journey events
 * @param {{ reducedMotion?: boolean }} [options]
 */
export function useJourneyPlayback(events, options = {}) {
  const { reducedMotion = false } = options;
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | playing | paused | ended
  const [speed, setSpeed] = useState(1);
  const clock = useMemo(() => createJourneyClock(1), []);
  const eventCount = events?.length ?? 0;

  // A new run always replaces the previous one.
  const runRef = useRef(events);
  useEffect(() => {
    if (runRef.current === events) return;
    runRef.current = events;
    setIndex(0);
    setStatus('idle');
    clock.set(1);
  }, [events, clock]);

  const play = useCallback(() => {
    if (eventCount === 0) return;
    setStatus((prev) => {
      if (prev === 'ended') setIndex(0);
      return 'playing';
    });
  }, [eventCount]);

  const pause = useCallback(() => {
    setStatus((prev) => (prev === 'playing' ? 'paused' : prev));
  }, []);

  const toggle = useCallback(() => {
    if (status === 'playing') pause();
    else play();
  }, [status, play, pause]);

  const stepForward = useCallback(() => {
    setStatus('paused');
    setIndex((prev) => Math.min(prev + 1, Math.max(0, eventCount - 1)));
  }, [eventCount]);

  const stepBackward = useCallback(() => {
    setStatus('paused');
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const jumpTo = useCallback(
    (nextIndex) => {
      setStatus('paused');
      setIndex(Math.max(0, Math.min(nextIndex, Math.max(0, eventCount - 1))));
    },
    [eventCount]
  );

  const restart = useCallback(() => {
    setStatus('idle');
    setIndex(0);
    clock.set(1);
  }, [clock]);

  // Advance the animation. One requestAnimationFrame loop per run; it is
  // cancelled whenever playback stops, the event changes or the speed changes,
  // so there is never more than one active timer.
  useEffect(() => {
    if (status !== 'playing' || eventCount === 0) return undefined;

    const duration = durationFor(events[index], speed, reducedMotion);
    const startedAt = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      clock.set(progress);
      if (progress >= 1) {
        if (index >= eventCount - 1) {
          setStatus('ended');
          return;
        }
        setIndex((prev) => Math.min(prev + 1, eventCount - 1));
        return;
      }
      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [status, index, speed, events, eventCount, clock, reducedMotion]);

  // While paused or stepping the packet rests at the end of its hop; while
  // playing it starts from the beginning of the hop.
  useEffect(() => {
    clock.set(status === 'playing' ? 0 : 1);
  }, [index, status, clock]);

  return {
    clock,
    index,
    status,
    speed,
    setSpeed,
    play,
    pause,
    toggle,
    stepForward,
    stepBackward,
    jumpTo,
    restart,
    currentEvent: events?.[index] ?? null,
    isFirst: index <= 0,
    isLast: index >= eventCount - 1,
    atEnd: status === 'ended' || (eventCount > 0 && index >= eventCount - 1),
    eventCount,
  };
}

export default {
  createJourneyClock,
  useJourneyClock,
  useJourneyPlayback,
  EVENT_DURATION_MS,
  SPEED_OPTIONS,
};
