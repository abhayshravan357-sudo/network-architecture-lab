/**
 * Simulation link edge — draws the real link between two devices and, when the
 * current event traverses it, the moving packet marker.
 *
 * The marker subscribes to the animation clock directly, so per-frame updates
 * re-render this one component instead of the whole topology. Edges that are
 * not the active traversal render statically with no subscription.
 */

import React, { memo } from 'react';
import { useJourneyClock } from './useJourneyPlayback.js';

const STATUS_STYLE = {
  idle: { stroke: 'var(--c-border-lit)', width: 1.8 },
  traversed: { stroke: 'rgba(52, 211, 153, 0.55)', width: 2 },
  active: { stroke: 'var(--c-accent)', width: 3 },
  drop: { stroke: 'var(--c-danger)', width: 3 },
};

function pathBetween(sourceX, sourceY, targetX, targetY) {
  return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
}

function midPoint(sourceX, sourceY, targetX, targetY) {
  return { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
}

function linkLabel(data) {
  if (data?.label) return data.label;
  if (data?.status === 'drop') return 'dropped';
  return null;
}

/** Static link: no clock subscription, memoized so it never re-renders. */
const StaticSimLinkEdge = memo(function StaticSimLinkEdge({ sourceX, sourceY, targetX, targetY, data }) {
  const variant = data?.variant ?? 'link';
  const style = STATUS_STYLE[data?.status ?? 'idle'] ?? STATUS_STYLE.idle;
  const mid = midPoint(sourceX, sourceY, targetX, targetY);
  const label = linkLabel(data);

  if (variant === 'control') {
    return (
      <g>
        <path
          d={pathBetween(sourceX, sourceY, targetX, targetY)}
          stroke="var(--c-accent)"
          strokeWidth={1.4}
          strokeDasharray="4 5"
          fill="none"
          opacity={0.8}
        />
        <circle cx={targetX} cy={targetY} r={2.6} fill="var(--c-accent)" />
      </g>
    );
  }

  if (variant === 'chain') {
    return (
      <g>
        <path
          d={pathBetween(sourceX, sourceY, targetX, targetY)}
          stroke="rgba(167, 139, 250, 0.85)"
          strokeWidth={1.6}
          strokeDasharray="6 4"
          fill="none"
        />
        <g transform={`translate(${mid.x}, ${mid.y})`}>
          <circle r={8} fill="rgba(167,139,250,0.18)" stroke="rgba(167,139,250,0.7)" strokeWidth={1} />
          <text y={3} textAnchor="middle" fontSize="9" fill="#c4b5fd" fontFamily="monospace">
            {data?.order ?? ''}
          </text>
        </g>
      </g>
    );
  }

  return (
    <g>
      <path
        d={pathBetween(sourceX, sourceY, targetX, targetY)}
        stroke={style.stroke}
        strokeWidth={style.width}
        strokeDasharray={data?.status === 'active' ? '8 5' : undefined}
        fill="none"
        style={{ transition: 'stroke 200ms ease' }}
      />
      {label && (
        <text x={mid.x} y={mid.y - 6} textAnchor="middle" fontSize="9" fill="var(--c-text-dim)" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );
});

/** Active traversal: the packet marker moves along the real link. */
const ActiveSimLinkEdge = memo(function ActiveSimLinkEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) {
  const progress = useJourneyClock(data.clock);
  // direction === 1 travels source → target, -1 travels target → source.
  const forward = (data?.direction ?? 1) === 1;
  const fromX = forward ? sourceX : targetX;
  const fromY = forward ? sourceY : targetY;
  const toX = forward ? targetX : sourceX;
  const toY = forward ? targetY : sourceY;

  const x = fromX + (toX - fromX) * progress;
  const y = fromY + (toY - fromY) * progress;
  const style = STATUS_STYLE[data?.status ?? 'active'] ?? STATUS_STYLE.active;

  return (
    <g>
      <path
        d={pathBetween(sourceX, sourceY, targetX, targetY)}
        stroke={style.stroke}
        strokeWidth={style.width}
        strokeDasharray="8 5"
        fill="none"
      />
      {data?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 8}
          textAnchor="middle"
          fontSize="9"
          fill="var(--c-accent-soft)"
          fontFamily="monospace"
        >
          {data.label}
        </text>
      )}
      <g transform={`translate(${x}, ${y})`}>
        <circle r={9} fill="rgba(56,189,248,0.18)" />
        <circle r={5} fill="var(--c-accent)" stroke="#eaf2ff" strokeWidth={1.2} />
      </g>
    </g>
  );
});

export default function SimLinkEdge(props) {
  return props.data?.active ? <ActiveSimLinkEdge {...props} /> : <StaticSimLinkEdge {...props} />;
}
