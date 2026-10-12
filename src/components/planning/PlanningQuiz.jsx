import React, { useState } from 'react';
import { useGameStore, STAGES } from '../../state/gameStore.js';
import { learningAssets } from '../../assets/assetMap.js';
import { getScenario } from '../../data/scenarios/index.js';
import hintLibrary from '../../data/hints/hintLibrary.js';

export default function PlanningQuiz() {
  const activeScenarioId = useGameStore((s) => s.activeScenarioId);
  const goToStage = useGameStore((s) => s.goToStage);
  const savePlanningAnswer = useGameStore((s) => s.savePlanningAnswer);
  const recordHintUsed = useGameStore((s) => s.recordHintUsed);
  const saveQuizScore = useGameStore((s) => s.saveQuizScore);

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showReveal, setShowReveal] = useState(false);

  if (!activeScenarioId) return null;
  const scenario = getScenario(activeScenarioId);
  if (!scenario || !scenario.planningQuiz) return <div>Quiz not found</div>;

  const quiz = scenario.planningQuiz;
  const q = quiz[currentQ];
  const isRadio = q.type === 'single-select';
  const hintDef = q.hint ? hintLibrary[q.hint] : null;
  const hintSteps = hintDef?.steps ?? [];

  const progress = ((currentQ) / quiz.length) * 100;

  const handleToggle = (optId) => {
    if (hasSubmitted || showReveal) return;
    if (isRadio) {
      setSelectedIds([optId]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
      );
    }
  };

  const isCorrect = () => {
    const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
    if (selectedIds.length !== correctIds.length) return false;
    return selectedIds.every((id) => correctIds.includes(id));
  };

  const handleSubmit = () => {
    setHasSubmitted(true);
    setHintIndex(0);
    savePlanningAnswer(q.id, selectedIds);
    if (isCorrect()) setCorrectCount((c) => c + 1);
  };

  const handleNextQuestion = () => {
    if (currentQ < quiz.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setSelectedIds([]);
      setHasSubmitted(false);
      setHintIndex(0);
      setShowReveal(false);
    } else {
      const score = Math.round((correctCount / quiz.length) * 100);
      saveQuizScore(score);
      goToStage(STAGES.RESOURCE_POOL);
    }
  };

  const correct = hasSubmitted && isCorrect();
  const showHint = hasSubmitted && !correct;

  const revealHintStep = () => {
    if (hintDef) recordHintUsed(hintDef.id);
    setHintIndex((i) => Math.min(i + 1, hintSteps.length - 1));
  };

  const handleRevealToggle = () => {
    setShowReveal(!showReveal);
  };

  const handleSkipQuiz = () => {
    if (
      window.confirm(
        'Skip the planning quiz? You can still build the network, but you will miss the planning practice.'
      )
    ) {
      saveQuizScore(0);
      goToStage(STAGES.RESOURCE_POOL);
    }
  };

  // Get correct answer IDs for current question
  const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
  const incorrectIds = q.options.filter((o) => !o.correct).map((o) => o.id);

  return (
    <div className="page-inner anim-fade-in">
      <div className="quiz-layout">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className="eyebrow">Architectural Planning</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="eyebrow">Question {currentQ + 1} of {quiz.length}</div>
            <button className="btn btn-ghost btn-sm" onClick={handleRevealToggle} title="Reveal correct answer and explanation">
              {showReveal ? 'Hide Answer' : 'Reveal Answer'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleSkipQuiz} title="Skip the quiz and continue to the resource pool">
              Skip quiz →
            </button>
          </div>
        </div>

        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="panel quiz-question">
          <div className="quiz-question-text">{q.question}</div>

          <div className="quiz-options">
            {q.options.map((opt) => {
              const isSelected = selectedIds.includes(opt.id);
              const isCorrectOpt = correctIds.includes(opt.id);
              const isIncorrectOpt = incorrectIds.includes(opt.id);
              const showCorrect = showReveal && isCorrectOpt;
              const showIncorrect = showReveal && isIncorrectOpt && isSelected;
              
              return (
                <div
                  key={opt.id}
                  className={`quiz-option ${isRadio ? 'radio' : ''} ${isSelected ? 'selected' : ''} ${showCorrect ? 'reveal-correct' : ''} ${showIncorrect ? 'reveal-incorrect' : ''}`}
                  onClick={() => handleToggle(opt.id)}
                >
                  <div className="quiz-option-check">
                    {isSelected && (isRadio ? '•' : '✓')}
                    {showCorrect && <span className="reveal-badge correct">✓ Correct</span>}
                    {showIncorrect && <span className="reveal-badge incorrect">✗ Incorrect</span>}
                  </div>
                  <div className="quiz-option-text">{opt.label}</div>
                  {showReveal && (isCorrectOpt || (isIncorrectOpt && isSelected)) && (
                    <div className="reveal-explanation" style={{ marginTop: '8px', padding: '8px', fontSize: '0.75rem', lineHeight: 1.5 }}>
                      {isCorrectOpt 
                        ? `<strong>Why this is correct:</strong> ${q.explanation}`
                        : `<strong>Why this is incorrect:</strong> ${q.explanation}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {correct && !showReveal && (
            <div className="quiz-feedback correct">
              <strong>Correct!</strong> {q.explanation}
            </div>
          )}

          {showHint && !showReveal && (
            <div className="hint-panel" style={{ marginTop: '24px' }}>
              <div className="hint-panel-title">
                <img src={learningAssets.brain} alt="" style={{ width: '1rem', height: '1rem', verticalAlign: '-0.15rem', marginRight: 6 }} />
                Socratic Hint
              </div>
              <div className="hint-text">
                {hintSteps.length > 0
                  ? hintSteps[Math.min(hintIndex, hintSteps.length - 1)]
                  : 'Revisit the scenario requirements — the answer is implied by one of them.'}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setHasSubmitted(false);
                    setSelectedIds([]);
                  }}
                >
                  Try Again
                </button>
                {hintSteps.length > 0 && hintIndex < hintSteps.length - 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={revealHintStep}>
                    Need another hint?
                  </button>
                )}
                {!hintSteps.length && (
                  <button className="btn btn-ghost btn-sm" onClick={handleNextQuestion}>
                    Continue →
                  </button>
                )}
              </div>
            </div>
          )}

          {showReveal && (
            <div className="reveal-panel" style={{ marginTop: '24px', padding: '16px', background: 'var(--c-bg-glass)', border: '1px solid var(--c-accent)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: 'var(--c-accent)' }}>Answer Revealed</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--c-text-dim)' }}>Score not affected</span>
              </div>
              <div style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
                <p><strong>Correct Answer(s):</strong> {q.options.filter(o => o.correct).map(o => o.label).join(', ')}</p>
                <p><strong>Explanation:</strong> {q.explanation}</p>
              </div>
            </div>
          )}

          <div className="quiz-actions">
            {!hasSubmitted && !showReveal ? (
              <button
                className="btn btn-primary"
                disabled={selectedIds.length === 0}
                onClick={handleSubmit}
              >
                Submit Answer
              </button>
            ) : (correct || showReveal) ? (
              <button className="btn btn-success" onClick={handleNextQuestion}>
                {currentQ < quiz.length - 1 ? 'Next Question →' : 'Complete Planning →'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
