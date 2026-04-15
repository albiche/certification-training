import { useState, useEffect } from 'react';
import { Question, Group, AISettings } from './types';
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

type QuizPhase = 'quiz' | 'result' | 'victory';

export function App() {
  const { status, questions, progress, updateProgress, error } = useQuizData();

  const [phase, setPhase] = useState<QuizPhase>('quiz');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastId, setLastId] = useState<string | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMode, setAIChatMode] = useState<'help' | 'explain'>('explain');
  const [aiSettings, setAISettings] = useState<AISettings>(() => loadAISettings());

  // Démarre le quiz dès que les données sont prêtes
  useEffect(() => {
    if (status !== 'ready') return;
    if (isVictory(questions, progress)) { setPhase('victory'); return; }
    const next = selectNextQuestion(questions, progress);
    if (next) { setCurrentQuestion(next); setPhase('quiz'); }
    else setPhase('victory');
  }, [status]);

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
      // Mauvaise réponse : régresse si la question est en G2 ou G3
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
          <p className="error-msg">
            Vérifiez que <code>questions.csv</code> est présent dans <code>public/</code>.
          </p>
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

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <div className="header__title">Quiz Révision</div>
          <div className="header__subtitle">{questions.length} questions</div>
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
