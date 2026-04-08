import { useState, useEffect } from 'react';
import { Question, AppProgress, Group } from './types';
import { parseQuestions } from './utils/csvParser';
import { loadProgress, saveProgress, defaultProgress } from './storage/storage';
import {
  initializeProgress,
  applyRegression,
  promoteQuestion,
  getGroupCounts,
  isVictory,
  resetGroups,
} from './logic/progression';
import { selectNextQuestion } from './logic/selection';
import { GroupStats } from './components/GroupStats';
import { QuizCard } from './components/QuizCard';
import { ResultView } from './components/ResultView';
import { VictoryScreen } from './components/VictoryScreen';
import { SettingsModal } from './components/SettingsModal';

type Phase = 'loading' | 'error' | 'quiz' | 'result' | 'victory';

export function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<AppProgress>(defaultProgress());
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastId, setLastId] = useState<string | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Chargement initial des questions + progression
  useEffect(() => {
    async function load() {
      try {
        const url = `${import.meta.env.BASE_URL}questions.csv`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Impossible de charger questions.csv (HTTP ${res.status})`);
        const text = await res.text();
        const parsed = parseQuestions(text);
        if (parsed.length === 0) throw new Error('Aucune question trouvée dans le fichier CSV.');

        const saved = loadProgress();
        const initialized = initializeProgress(parsed, saved);
        const afterRegression = applyRegression(initialized);

        saveProgress(afterRegression);
        setQuestions(parsed);
        setProgress(afterRegression);

        if (isVictory(parsed, afterRegression)) {
          setPhase('victory');
        } else {
          const next = selectNextQuestion(parsed, afterRegression);
          if (next) {
            setCurrentQuestion(next);
            setSelected([]);
            setPhase('quiz');
          } else {
            setPhase('victory');
          }
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setPhase('error');
      }
    }
    load();
  }, []);

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

    let newProgress: AppProgress = {
      ...progress,
      answeredSinceLastCheck: progress.answeredSinceLastCheck + 1,
    };
    if (correct) {
      newProgress = promoteQuestion(newProgress, currentQuestion.question_id);
    }

    saveProgress(newProgress);
    setProgress(newProgress);
    setLastCorrect(correct);
    setLastId(currentQuestion.question_id);
    setPhase('result');
  }

  function handleNext() {
    if (isVictory(questions, progress)) {
      setPhase('victory');
      return;
    }
    const next = selectNextQuestion(questions, progress, lastId);
    if (!next) {
      setPhase('victory');
      return;
    }
    setCurrentQuestion(next);
    setSelected([]);
    setPhase('quiz');
  }

  function handleReset() {
    const reset = resetGroups(progress);
    saveProgress(reset);
    setProgress(reset);
    setShowSettings(false);

    const next = selectNextQuestion(questions, reset);
    if (next) {
      setCurrentQuestion(next);
      setSelected([]);
      setPhase('quiz');
    }
  }

  function handleSaveSettings(regressionDays: number) {
    const updated = { ...progress, regressionDays };
    saveProgress(updated);
    setProgress(updated);
    setShowSettings(false);
  }

  const groupCounts: Record<Group, number> =
    questions.length > 0
      ? getGroupCounts(questions, progress)
      : { 1: 0, 2: 0, 3: 0, 4: 0 };

  const currentGroup: Group = currentQuestion
    ? (progress.progress[currentQuestion.question_id]?.group ?? 1)
    : 1;

  return (
    <div className="app-container">
      {/* Header */}
      {phase !== 'loading' && phase !== 'error' && (
        <header className="header">
          <div>
            <div className="header__title">Quiz Révision</div>
            <div className="header__subtitle">{questions.length} questions</div>
          </div>
          <div className="header__actions">
            <button
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Paramètres"
              title="Paramètres"
            >
              ⚙️
            </button>
          </div>
        </header>
      )}

      {/* Statistiques groupes */}
      {phase !== 'loading' && phase !== 'error' && (
        <GroupStats counts={groupCounts} total={questions.length} />
      )}

      {/* Contenu principal */}
      {phase === 'loading' && (
        <div className="center-screen">
          <div className="spinner" />
          <p style={{ color: 'var(--text-sub)' }}>Chargement des questions…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="center-screen">
          <p className="error-title">Erreur de chargement</p>
          <p className="error-msg">{errorMsg}</p>
          <p className="error-msg">
            Vérifiez que le fichier <code>questions.csv</code> est bien présent dans le dossier{' '}
            <code>public/</code>.
          </p>
        </div>
      )}

      {phase === 'quiz' && currentQuestion && (
        <QuizCard
          question={currentQuestion}
          currentGroup={currentGroup}
          selected={selected}
          onToggle={handleToggle}
          onValidate={handleValidate}
        />
      )}

      {phase === 'result' && currentQuestion && (
        <ResultView
          question={currentQuestion}
          selected={selected}
          correct={lastCorrect}
          onNext={handleNext}
        />
      )}

      {phase === 'victory' && (
        <VictoryScreen total={questions.length} onReset={handleReset} />
      )}

      {/* Modal paramètres */}
      {showSettings && (
        <SettingsModal
          progress={progress}
          questions={questions}
          onSave={handleSaveSettings}
          onReset={handleReset}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
