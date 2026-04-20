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

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqExam, setReqExam] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqStatus, setReqStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReqStatus('sending');
    try {
      const res = await fetch('https://formspree.io/f/xdaydwjl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ exam: reqExam, email: reqEmail }),
      });
      setReqStatus(res.ok ? 'ok' : 'error');
    } catch {
      setReqStatus('error');
    }
  }

  function closeRequestForm() {
    setShowRequestForm(false);
    setReqExam('');
    setReqEmail('');
    setReqStatus('idle');
  }

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
      <div className="select-screen">
        <div className="select-hero">
          <div className="select-hero__icon">🎓</div>
          <h1 className="select-hero__title">Certification Training</h1>
          <p className="select-hero__desc">
            Entraîne-toi avec les <strong>vraies questions des examens officiels</strong>,
            issues des banques de questions réelles. La méthode de{' '}
            <strong>répétition espacée</strong> répartit les questions en 4 groupes —
            tu progresses sur tes bonnes réponses et régresses sur les erreurs,
            pour ancrer durablement les notions les plus difficiles.
          </p>
        </div>

        <div className="select-exams">
          <p className="select-exams__label">Choisis un examen</p>
          <div className="select-exams__list">
            {(Object.entries(EXAM_CONFIG) as [ExamType, typeof EXAM_CONFIG[ExamType]][]).map(([type, cfg]) => (
              <button
                key={type}
                className="exam-card"
                style={{ '--exam-color': cfg.color } as React.CSSProperties}
                onClick={() => handleSelectExam(type)}
              >
                <span className="exam-card__label">{cfg.label}</span>
                <span className="exam-card__sub">{cfg.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="select-ai-hint">
          <span className="select-ai-hint__icon">🤖</span>
          <span>
            Un assistant IA peut t'aider à comprendre chaque réponse.{' '}
            <strong>Ajoute ta clé API OpenAI dans les réglages</strong>{' '}
            (⚙️) une fois l'examen démarré.
          </span>
        </div>

        <button className="request-exam-btn" onClick={() => setShowRequestForm(true)}>
          + Demander un nouvel examen
        </button>

        {showRequestForm && (
          <div className="modal-overlay" onClick={closeRequestForm}>
            <div className="modal request-modal" onClick={e => e.stopPropagation()}>
              <div className="modal__header">
                <span className="modal__title">Demander un examen</span>
                <button className="icon-btn" onClick={closeRequestForm}>✕</button>
              </div>

              {reqStatus === 'ok' ? (
                <div className="request-success">
                  <div style={{ fontSize: '2rem' }}>✅</div>
                  <p>Demande envoyée, merci !</p>
                  <button className="btn btn--primary" onClick={closeRequestForm}>Fermer</button>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="request-form">
                  <div className="request-form__field">
                    <label className="request-form__label">Nom de l'examen</label>
                    <input
                      className="ai-key-input"
                      type="text"
                      placeholder="ex: AWS Solutions Architect"
                      value={reqExam}
                      onChange={e => setReqExam(e.target.value)}
                      required
                    />
                  </div>
                  <div className="request-form__field">
                    <label className="request-form__label">Ton e-mail</label>
                    <input
                      className="ai-key-input"
                      type="email"
                      placeholder="toi@exemple.com"
                      value={reqEmail}
                      onChange={e => setReqEmail(e.target.value)}
                      required
                    />
                  </div>
                  {reqStatus === 'error' && (
                    <p className="ai-test-msg ai-test-msg--error">Erreur d'envoi, réessaie.</p>
                  )}
                  <button
                    className="btn btn--primary"
                    type="submit"
                    disabled={reqStatus === 'sending'}
                  >
                    {reqStatus === 'sending' ? 'Envoi…' : 'Envoyer la demande'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
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
