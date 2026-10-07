import React from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { modeAssets, uiAssets } from '../../assets/assetMap.js';

/**
 * Subtle animated network visualization — a visual
 * identity element for the hero. Pure SVG; the
 * "traffic" pulses are CSS-animated strokes.
 */
function HeroNetworkViz() {
  return (
    <svg
      className="hero-viz"
      viewBox="0 0 640 300"
      fill="none"
      aria-hidden="true"
    >
      {/* links */}
      <g className="hero-viz-links" stroke="rgba(125,211,252,0.28)" strokeWidth="1.5">
        <path d="M320 40 L320 96" />
        <path d="M320 136 L320 176" />
        <path d="M320 216 L320 262" />
        <path d="M320 176 L150 176 L150 216" />
        <path d="M320 176 L490 176 L490 216" />
        <path d="M150 256 L150 262" />
        <path d="M490 256 L490 262" />
        <path d="M150 216 L70 262" />
        <path d="M150 216 L230 262" />
        <path d="M490 216 L410 262" />
        <path d="M490 216 L570 262" />
      </g>

      {/* internet cloud */}
      <g>
        <path
          d="M292 34a16 16 0 0 1 6-30 22 22 0 0 1 20-14 24 24 0 0 1 23 16 18 18 0 0 1 25 17 16 16 0 0 1-8 31H292z"
          fill="rgba(139,92,246,0.12)"
          stroke="#a78bfa"
          strokeWidth="2"
        />
        <circle cx="308" cy="12" r="2.5" fill="#a78bfa" />
        <circle cx="332" cy="12" r="2.5" fill="#a78bfa" />
        <circle cx="320" cy="22" r="2.5" fill="#a78bfa" />
      </g>

      {/* router */}
      <g>
        <rect x="288" y="96" width="64" height="40" rx="8" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth="2.5" />
        <path d="M300 116h16M332 116h16" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M314 112l4 4-4 4M326 112l-4 4 4 4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="344" cy="104" r="2.5" fill="#34d399" />
      </g>

      {/* core switch */}
      <g>
        <rect x="288" y="176" width="64" height="40" rx="8" fill="rgba(129,140,248,0.1)" stroke="#818cf8" strokeWidth="2.5" />
        <rect x="300" y="186" width="10" height="12" rx="2" stroke="#a5b4fc" strokeWidth="2" />
        <rect x="316" y="186" width="10" height="12" rx="2" stroke="#a5b4fc" strokeWidth="2" />
        <rect x="332" y="186" width="10" height="12" rx="2" stroke="#a5b4fc" strokeWidth="2" />
        <circle cx="344" cy="182" r="2.5" fill="#818cf8" />
      </g>

      {/* firewall + server */}
      <g>
        <rect x="118" y="216" width="64" height="40" rx="8" fill="rgba(248,113,113,0.1)" stroke="#f87171" strokeWidth="2.5" />
        <path d="M128 230h44M128 238h44" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
        <path d="M136 244l6 3v4a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3v-4l6-3z" stroke="#fecaca" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g>
        <rect x="458" y="216" width="64" height="40" rx="8" fill="rgba(251,191,36,0.1)" stroke="#fbbf24" strokeWidth="2.5" />
        <circle cx="470" cy="230" r="2.5" fill="#34d399" />
        <path d="M478 230h30M478 240h30" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M470 244h44" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* endpoints */}
      <g>
        <rect x="46" y="262" width="48" height="30" rx="6" fill="rgba(148,163,184,0.1)" stroke="#94a3b8" strokeWidth="2" />
        <rect x="52" y="268" width="36" height="16" rx="2" stroke="#64748b" strokeWidth="2" />
        <circle cx="86" cy="270" r="1.5" fill="#34d399" />
      </g>
      <g>
        <rect x="206" y="262" width="48" height="30" rx="6" fill="rgba(148,163,184,0.1)" stroke="#94a3b8" strokeWidth="2" />
        <path d="M214 272h32M214 280h20" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="246" cy="270" r="1.5" fill="#34d399" />
      </g>
      <g>
        <rect x="386" y="262" width="48" height="30" rx="6" fill="rgba(148,163,184,0.1)" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="402" cy="277" r="6" stroke="#64748b" strokeWidth="2" />
        <path d="M416 270h8" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="428" cy="270" r="1.5" fill="#34d399" />
      </g>
      <g>
        <rect x="546" y="262" width="48" height="30" rx="6" fill="rgba(148,163,184,0.1)" stroke="#94a3b8" strokeWidth="2" />
        <path d="M554 276h32M554 284h20" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="586" cy="270" r="1.5" fill="#34d399" />
      </g>

      {/* animated traffic pulses */}
      <g className="hero-viz-pulses" strokeLinecap="round">
        <circle r="3" fill="#38bdf8">
          <animateMotion dur="3.2s" repeatCount="indefinite" path="M320 40 L320 96" />
        </circle>
        <circle r="3" fill="#818cf8">
          <animateMotion dur="2.6s" begin="0.8s" repeatCount="indefinite" path="M320 136 L320 176" />
        </circle>
        <circle r="3" fill="#38bdf8">
          <animateMotion dur="3.4s" begin="1.4s" repeatCount="indefinite" path="M320 176 L150 176 L150 216" />
        </circle>
        <circle r="3" fill="#a78bfa">
          <animateMotion dur="3s" begin="0.4s" repeatCount="indefinite" path="M320 176 L490 176 L490 216" />
        </circle>
        <circle r="2.5" fill="#7dd3fc">
          <animateMotion dur="2.8s" begin="1s" repeatCount="indefinite" path="M150 216 L70 262" />
        </circle>
        <circle r="2.5" fill="#7dd3fc">
          <animateMotion dur="2.8s" begin="2s" repeatCount="indefinite" path="M150 216 L230 262" />
        </circle>
        <circle r="2.5" fill="#7dd3fc">
          <animateMotion dur="2.8s" begin="0.2s" repeatCount="indefinite" path="M490 216 L410 262" />
        </circle>
        <circle r="2.5" fill="#7dd3fc">
          <animateMotion dur="2.8s" begin="1.8s" repeatCount="indefinite" path="M490 216 L570 262" />
        </circle>
      </g>
    </svg>
  );
}

/** Learning progression shown under the mode cards. */
const PROGRESSION = ['BUILD', 'VALIDATE', 'SDN', 'NFV', 'ORCHESTRATE', 'SIMULATE'];

/** Primary gameplay mode card. */
function ModeCard({ index, icon, title, desc, badge, badgeClass, onClick, primary }) {
  return (
    <div
      className={`mode-card ${primary ? 'mode-card-primary' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <div className="mode-card-top">
        <span className="mode-card-index">{String(index).padStart(2, '0')}</span>
        {badge && <span className={`mode-card-badge badge ${badgeClass}`}>{badge}</span>}
      </div>
      <div className="mode-card-visual">
        <img src={icon} alt="" className="mode-card-icon" />
      </div>
      <h2 className="mode-card-title">{title}</h2>
      <p className="mode-card-desc">{desc}</p>
      <span className="mode-card-cta">
        {primary ? 'START MISSION' : 'LAUNCH'} <span aria-hidden="true">→</span>
      </span>
    </div>
  );
}

export default function HomeScreen() {
  const goToStage = useGameStore((s) => s.goToStage);

  const comingSoon = (name) => window.alert(`${name} coming soon!`);

  return (
    <div className="home-screen anim-fade-in">
      <div className="home-hero">
        <div className="home-hero-brand">
          <img src={uiAssets.logo} alt="" className="home-logo" />
          <span className="eyebrow">Interactive Learning Simulator</span>
        </div>
        <h1>Network Architecture Lab</h1>
        <p className="home-hero-sub">
          Learn how to transform real-world requirements into functional network
          architectures, understand the <em>why</em> behind design decisions, and
          explore modern SDN &amp; NFV concepts.
        </p>
        <HeroNetworkViz />
      </div>

      <div className="home-mode-grid">
        <ModeCard
          index={1}
          icon={modeAssets.scenario}
          title="Scenario Mode"
          desc="Solve realistic networking challenges for schools, hospitals, and enterprises. The recommended way to learn."
          badge="RECOMMENDED"
          badgeClass="badge-blue"
          onClick={() => goToStage(STAGES.SCENARIO_SELECT)}
          primary
        />
        <ModeCard
          index={2}
          icon={modeAssets.random}
          title="Random Challenge"
          desc="Test your reasoning against procedurally generated requirements and constraints."
          badge="REPLAYABLE"
          badgeClass="badge-purple"
          onClick={() => comingSoon('Random Challenge')}
        />
        <ModeCard
          index={3}
          icon={modeAssets.practice}
          title="Practice Lab"
          desc="Freely experiment with devices, topologies, and SDN/NFV concepts without a strict scenario."
          badge="SANDBOX"
          badgeClass="badge-green"
          onClick={() => comingSoon('Practice Lab')}
        />
      </div>

      <button
        className="home-learn-link"
        onClick={() => comingSoon('Learn Concepts')}
      >
        <img src={modeAssets.learn} alt="" className="home-learn-icon" />
        <span>Learn Concepts</span>
        <span className="home-learn-sub">Browse the networking concept library — the what, why, and when of architectures</span>
        <span aria-hidden="true">→</span>
      </button>

      <div className="home-progression">
        <span className="home-progression-label">Learning path</span>
        <div className="home-progression-steps">
          {PROGRESSION.map((step, i) => (
            <React.Fragment key={step}>
              <span className="home-progression-step">{step}</span>
              {i < PROGRESSION.length - 1 && <span className="topnav-chevron">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
