import React, { useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { getScenario } from '../../data/scenarios/index.js';
import { getConcept, getAllConcepts, getConceptsForScenario } from '../../data/concepts/conceptLibrary.js';

export default function WhyExplainer() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);

  const scenario = getScenario(activeScenarioId);

  // Prefer concepts that have a scenario-specific application,
  // then tag-matched concepts, then core fallbacks.
  let relevantConcepts = getConceptsForScenario(activeScenarioId);
  if (relevantConcepts.length === 0) {
    relevantConcepts = getAllConcepts().filter((c) =>
      scenario?.tags?.some(
        (tag) =>
          c.id.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(c.id.toLowerCase())
      )
    );
  }
  if (relevantConcepts.length === 0) {
    relevantConcepts = ['vlan', 'routing', 'firewall']
      .map(getConcept)
      .filter(Boolean);
  }
  relevantConcepts = relevantConcepts.slice(0, 5);

  const [activeConceptIdx, setActiveConceptIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('what');

  if (!scenario || relevantConcepts.length === 0) return null;

  const concept = relevantConcepts[activeConceptIdx];

  return (
    <div className="page-inner anim-fade-in">
      <div className="why-layout">
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="eyebrow" style={{ marginBottom: '12px' }}>Learning Phase</div>
          <h2>The "Why" Behind the Design</h2>
          <p style={{ color: 'var(--c-text-muted)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            A true network architect understands not just <em>how</em> to connect devices, but <em>why</em> specific technologies are chosen to solve business problems.
          </p>
        </div>

        <div className="concept-tabs">
          {relevantConcepts.map((c, i) => (
            <button
              key={c.id}
              className={`concept-tab ${i === activeConceptIdx ? 'active' : ''}`}
              onClick={() => { setActiveConceptIdx(i); setActiveTab('what'); }}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="panel concept-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ fontSize: '2rem' }}>{concept.icon || '📘'}</div>
            <h3 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--c-text)' }}>{concept.name}</h3>
          </div>

          <div className="concept-content-tabs">
            {['what', 'why', 'when', 'example', 'scenario'].map(tab => (
              <button
                key={tab}
                className={`content-tab ${tab === activeTab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="anim-fade-in" key={activeTab}>
            {activeTab === 'what' && <p>{concept.what}</p>}
            {activeTab === 'why' && <p>{concept.why}</p>}
            {activeTab === 'when' && <p>{concept.when}</p>}
            {activeTab === 'example' && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace' }}>
                {concept.example}
              </div>
            )}
            {activeTab === 'scenario' && (
              <div className="scenario-application-box">
                <strong style={{ color: 'var(--c-text)', display: 'block', marginBottom: '8px' }}>Application in this scenario:</strong>
                {concept.scenarioApplication || "Think about how this concept helped satisfy the isolation or connectivity requirements of this specific scenario."}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => goToStage(STAGES.SDN)}
          >
            Modernize with SDN →
          </button>
        </div>

      </div>
    </div>
  );
}
