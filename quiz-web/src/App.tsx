import { useState, useEffect } from 'react';
import { Question, Group, AISettings } from './types';
import { ExamType, EXAM_CONFIG } from './data/constants';
import { useQuizData } from './hooks/useQuizData';
import { promoteQuestion, demoteQuestion, getGroupCounts, isVictory, resetGroups } from './logic/progression';
import { selectNextQuestion } from './logic/selection';
import { loadAISettings, saveAISettings } from './storage/aiStorage';
import { GroupStats } from './components/GroupStats';
import { QuizCard } from './components/QuizCard';
import { ResultView } from './components/ResultView';
import { VictoryScreen } from './components/VictoryScreen';
import { SettingsModal } from './components/SettingsModal';
import { RulesModal } from './components/RulesModal';
import { AIChat } from './components/AIChat';

type QuizPhase = 'select' | 'quiz' | 'result' | 'victory';

export function App() {
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [phase, setPhase] = useState<QuizPhase>('select');

  const { status, questions, progress, updateProgress, error } = useQuizData(examType ?? 'gcp');

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastId, setLastId] = useState<string | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMode, setAIChatMode] = useState<'help' | 'explain'>('explain');
  const [aiSettings, setAISettings] = useState<AISettings>(() => loadAISettings());

  // Démarre le quiz dès que les données sont prêtes et qu'un exam est sélectionné
  useEffect(() => {
    if (!examType || status !== 'ready') return;
    if (isVictory(questions, progress)) { setPhase('victory'); return; }
    const next = selectNextQuestion(questions, progress);
    if (next) { setCurrentQuestion(next); setPhase('quiz'); }
    else setPhase('victory');
  }, [status, examType]);

  function handleSelectExam(type: ExamType) {
    setExamType(type);
    setCurrentQuestion(null);
    setSelected([]);
    // useQuizData rechargera automatiquement via le useEffect sur examType
  }

  function handleBackToSelect() {
    setExamType(null);
    setPhase('select');
    setCurrentQuestion(null);
    setSelected([]);
    setShowSettings(false);
  }

  function handleToggle(label: string) {
    if (!currentQuestion) return;
    if (currentQuestion.question_type === 'single') {
      setSelected([label]);
    } else {
      setSelected(prev =>
        prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label],
      );
    }
  }

  function handleValidate() {
    if (!currentQuestion || selected.length === 0) return;
    const correct =
      selected.length === currentQuestion.correct_answers.length &&
      selected.every(s => currentQuestion.correct_answers.includes(s));

    let newProgress = { ...progress, answeredTotal: progress.answeredTotal + 1 };
    if (correct) {
      newProgress = promoteQuestion(newProgress, currentQuestion.question_id);
    } else {
      const g = progress.progress[currentQuestion.question_id]?.group ?? 1;
      if (g === 2 || g === 3) {
        newProgress = demoteQuestion(newProgress, currentQuestion.question_id);
      }
    }
    updateProgress(newProgress);
    setLastCorrect(correct);
    setLastId(currentQuestion.question_id);
    setPhase('result');
  }

  function handleNext() {
    if (isVictory(questions, progress)) { setPhase('victory'); return; }
    const next = selectNextQuestion(questions, progress, lastId);
    if (!next) { setPhase('victory'); return; }
    setCurrentQuestion(next);
    setSelected([]);
    setPhase('quiz');
  }

  function handleReset() {
    const reset = resetGroups(progress);
    updateProgress(reset);
    setShowSettings(false);
    const next = selectNextQuestion(questions, reset);
    if (next) { setCurrentQuestion(next); setSelected([]); setPhase('quiz'); }
  }

  function handleSaveAI(settings: AISettings) {
    saveAISettings(settings);
    setAISettings(settings);
  }

  // ── Écran de sélection d'examen ───────────────────────────────────────────
  if (phase === 'select' || !examType) {
    return (
      <div className="app-container">
        <div className="center-screen">
          <h1 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '1.4rem' }}>
            Choisir un examen
          </h1>
          <p style={{ color: 'var(--text-sub)', marginBottom: '32px', fontSize: '0.9rem' }}>
            Votre progression est sauvegardée séparément pour chaque examen.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '360px' }}>
            {(Object.entries(EXAM_CONFIG) as [ExamType, typeof EXAM_CONFIG[ExamType]][]).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => handleSelectExam(type)}
                style={{
                  background: 'var(--card-bg)',
                  border: `2px solid ${cfg.color}`,
                  borderRadius: '14px',
                  padding: '20px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.1s',
                }}
                onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{ color: cfg.color, fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
                  {cfg.label}
                </div>
                <div style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                  {cfg.subtitle}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="app-container">
        <div className="center-screen">
          <div className="spinner" />
          <p style={{ color: 'var(--text-sub)' }}>Chargement des questions…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="app-container">
        <div className="center-screen">
          <p className="error-title">Erreur de chargement</p>
          <p className="error-msg">{error}</p>
          <button onClick={handleBackToSelect} style={{ marginTop: '16px', padding: '10px 20px', cursor: 'pointer' }}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // ── App ───────────────────────────────────────────────────────────────────
  const groupCounts: Record<Group, number> = getGroupCounts(questions, progress);
  const currentGroup: Group = currentQuestion
    ? (progress.progress[currentQuestion.question_id]?.group ?? 1)
    : 1;
  const hasAI = !!aiSettings.apiKey;
  const examCfg = EXAM_CONFIG[examType];

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="icon-btn"
            onClick={handleBackToSelect}
            title="Changer d'examen"
            style={{ fontSize: '1rem' }}
          >
            ←
          </button>
          <div>
            <div className="header__title" style={{ color: examCfg.color }}>{examCfg.label}</div>
            <div className="header__subtitle">{questions.length} questions</div>
          </div>
        </div>
        <div className="header__actions">
          <button className="icon-btn icon-btn--label" onClick={() => setShowRules(true)} title="Règles">
            RÈGLE
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Paramètres">
            ⚙️
          </button>
        </div>
      </header>

      <GroupStats counts={groupCounts} total={questions.length} />

      {phase === 'quiz' && currentQuestion && (
        <QuizCard
          question={currentQuestion}
          currentGroup={currentGroup}
          selected={selected}
          onToggle={handleToggle}
          onValidate={handleValidate}
          onAIChat={hasAI ? () => { setAIChatMode('help'); setShowAIChat(true); } : undefined}
        />
      )}

      {phase === 'result' && currentQuestion && (
        <ResultView
          question={currentQuestion}
          selected={selected}
          correct={lastCorrect}
          onNext={handleNext}
          onAIChat={hasAI ? () => { setAIChatMode('explain'); setShowAIChat(true); } : undefined}
        />
      )}

      {phase === 'victory' && (
        <VictoryScreen total={questions.length} onReset={handleReset} />
      )}

      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}

      {showSettings && (
        <SettingsModal
          progress={progress}
          questions={questions}
          aiSettings={aiSettings}
          onSaveAI={handleSaveAI}
          onReset={handleReset}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAIChat && currentQuestion && (
        <AIChat
          question={currentQuestion}
          mode={aiChatMode}
          selected={aiChatMode === 'explain' ? selected : undefined}
          correct={aiChatMode === 'explain' ? lastCorrect : undefined}
          aiSettings={aiSettings}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}
