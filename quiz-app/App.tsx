import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';

import { loadQuestionsFromCSV, ExamType } from './src/utils/csvParser';
import { loadProgress, saveProgress, resetProgress } from './src/storage/storage';
import {
  initializeProgress,
  applyRegression,
  promoteQuestion,
  getGroupCounts,
  isVictory,
  resetGroups,
} from './src/logic/progression';
import { selectNextQuestion } from './src/logic/questionSelector';
import GroupStats from './src/components/GroupStats';
import QuestionCard from './src/components/QuestionCard';
import AnswerFeedback from './src/components/AnswerFeedback';
import VictoryScreen from './src/components/VictoryScreen';
import SettingsModal from './src/components/SettingsModal';
import { Question, AppProgress, Group } from './src/types';

type Screen = 'select' | 'loading' | 'question' | 'feedback' | 'victory' | 'error';

const EXAM_CONFIG: Record<ExamType, { label: string; subtitle: string; color: string }> = {
  gcp: {
    label: 'GCP Pro Data Engineer',
    subtitle: 'Professional Data Engineer',
    color: '#4285F4',
  },
  databricks: {
    label: 'Databricks Associate',
    subtitle: 'Associate Data Engineer',
    color: '#FF3621',
  },
};

function getRegressionCountdown(lastCheck: string, regressionDays: number): string {
  const next = new Date(new Date(lastCheck).getTime() + regressionDays * 86_400_000);
  const diff = next.getTime() - Date.now();
  if (diff <= 0) return 'Régression imminente !';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `Régression dans ${days}j ${hours}h ${mins}min`;
  if (hours > 0) return `Régression dans ${hours}h ${mins}min`;
  return `Régression dans ${mins}min`;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('select');
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<AppProgress | null>(null);
  const [current, setCurrent] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [correct, setCorrect] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    if (!progress) return;
    const days = progress.regressionDays ?? 5;
    setCountdown(getRegressionCountdown(progress.lastRegressionCheck, days));
    const id = setInterval(() => {
      setCountdown(getRegressionCountdown(progress.lastRegressionCheck, days));
    }, 60_000);
    return () => clearInterval(id);
  }, [progress?.lastRegressionCheck, progress?.regressionDays]);

  const boot = async (type: ExamType) => {
    setScreen('loading');
    try {
      const qs = await loadQuestionsFromCSV(type);

      let prog = await loadProgress(type);
      prog = initializeProgress(qs, prog);
      prog = applyRegression(prog);
      await saveProgress(type, prog);

      setQuestions(qs);
      setProgress(prog);

      if (isVictory(qs, prog)) {
        setScreen('victory');
      } else {
        setCurrent(selectNextQuestion(qs, prog));
        setScreen('question');
      }
    } catch (e) {
      setErrorMsg(String(e));
      setScreen('error');
    }
  };

  const handleSelectExam = (type: ExamType) => {
    setExamType(type);
    boot(type);
  };

  const handleBackToSelect = () => {
    setExamType(null);
    setQuestions([]);
    setProgress(null);
    setCurrent(null);
    setSettingsVisible(false);
    setScreen('select');
  };

  const handleValidate = async (answers: string[]) => {
    if (!current || !progress || !examType) return;

    const ok =
      [...answers].sort().join('|') ===
      [...current.correct_answers].sort().join('|');

    setSelected(answers);
    setCorrect(ok);

    let newProg = ok ? promoteQuestion(progress, current.question_id) : progress;
    if (ok) newProg = { ...newProg, answeredSinceLastCheck: (newProg.answeredSinceLastCheck ?? 0) + 1 };
    await saveProgress(examType, newProg);
    setProgress(newProg);

    setScreen('feedback');
  };

  const handleNext = () => {
    if (!progress || !questions.length) return;

    if (isVictory(questions, progress)) {
      setScreen('victory');
      return;
    }

    const next = selectNextQuestion(questions, progress, current?.question_id);
    setCurrent(next);
    setSelected([]);
    setScreen(next ? 'question' : 'victory');
  };

  const handleReset = async () => {
    if (!examType) return;
    await resetProgress(examType);
    boot(examType);
  };

  const handleResetGroups = async () => {
    if (!progress || !examType) return;
    const newProg = resetGroups(progress);
    await saveProgress(examType, newProg);
    setProgress(newProg);
    setSettingsVisible(false);
    setCurrent(selectNextQuestion(questions, newProg));
    setScreen('question');
  };

  const handleSaveDays = async (days: number) => {
    if (!progress || !examType) return;
    const newProg = { ...progress, regressionDays: days };
    await saveProgress(examType, newProg);
    setProgress(newProg);
  };

  const counts = progress && questions.length
    ? getGroupCounts(questions, progress)
    : ({ 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Group, number>);

  // --- Écran de sélection d'examen ---
  if (screen === 'select') {
    return (
      <SafeAreaView style={s.center}>
        <StatusBar barStyle="light-content" />
        <Text style={s.selectTitle}>Choisir un examen</Text>
        <View style={s.examList}>
          {(Object.entries(EXAM_CONFIG) as [ExamType, typeof EXAM_CONFIG[ExamType]][]).map(([type, cfg]) => (
            <TouchableOpacity
              key={type}
              style={[s.examCard, { borderColor: cfg.color }]}
              onPress={() => handleSelectExam(type)}
            >
              <Text style={[s.examLabel, { color: cfg.color }]}>{cfg.label}</Text>
              <Text style={s.examSubtitle}>{cfg.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // --- Écran de chargement ---
  if (screen === 'loading') {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={s.loadingText}>Chargement des questions…</Text>
      </SafeAreaView>
    );
  }

  // --- Écran d'erreur ---
  if (screen === 'error') {
    return (
      <SafeAreaView style={s.center}>
        <View style={s.errorBox}>
          <Text style={s.errorTitle}>Erreur de chargement</Text>
          <Text style={s.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={handleBackToSelect}>
            <Text style={s.retryText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Écran de victoire ---
  if (screen === 'victory') {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" />
        <VictoryScreen totalQuestions={questions.length} onReset={handleReset} />
        <TouchableOpacity style={s.backBtn} onPress={handleBackToSelect}>
          <Text style={s.backBtnText}>← Choisir un autre examen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const examCfg = examType ? EXAM_CONFIG[examType] : null;

  // --- Écran principal (question / feedback) ---
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.titleRow}>
          <TouchableOpacity style={s.titleSpacer} onPress={handleBackToSelect} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={[s.title, examCfg ? { color: examCfg.color } : {}]}>
            Quiz {examCfg?.label ?? ''}
          </Text>
          <TouchableOpacity style={s.titleSpacer} onPress={() => setSettingsVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <GroupStats
          counts={counts}
          answered={progress?.answeredSinceLastCheck ?? 0}
          total={questions.length}
        />

        {!!countdown && (
          <Text style={s.regressionTimer}>{countdown}</Text>
        )}

        {screen === 'question' && current && (
          <QuestionCard
            key={current.question_id}
            question={current}
            onValidate={handleValidate}
          />
        )}

        {screen === 'feedback' && current && (
          <AnswerFeedback
            question={current}
            selectedAnswers={selected}
            isCorrect={correct}
            onNext={handleNext}
          />
        )}
      </ScrollView>

      {progress && (
        <SettingsModal
          visible={settingsVisible}
          regressionDays={progress.regressionDays ?? 5}
          totalQuestions={questions.length}
          onClose={() => setSettingsVisible(false)}
          onReset={handleResetGroups}
          onSaveDays={handleSaveDays}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1923',
  },
  center: {
    flex: 1,
    backgroundColor: '#0f1923',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },
  // Sélection d'examen
  selectTitle: {
    color: '#ecf0f1',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  examList: {
    width: '80%',
    gap: 16,
  },
  examCard: {
    backgroundColor: '#1a2634',
    borderRadius: 14,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
  },
  examLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  examSubtitle: {
    color: '#7f8c8d',
    fontSize: 13,
  },
  // Quiz
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSpacer: {
    width: 32,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    color: '#ecf0f1',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  backIcon: {
    color: '#7f8c8d',
    fontSize: 20,
  },
  gearIcon: {
    fontSize: 20,
  },
  loadingText: {
    color: '#7f8c8d',
    marginTop: 14,
    fontSize: 14,
  },
  errorBox: {
    margin: 24,
    padding: 20,
    backgroundColor: '#2a1313',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  errorTitle: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMsg: {
    color: '#cdd9e0',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  regressionTimer: {
    color: '#e67e22',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 14,
    opacity: 0.85,
  },
  backBtn: {
    padding: 16,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
});
