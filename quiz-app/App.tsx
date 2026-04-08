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

import { loadQuestionsFromCSV } from './src/utils/csvParser';
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

type Screen = 'loading' | 'question' | 'feedback' | 'victory' | 'error';

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
  const [screen, setScreen] = useState<Screen>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<AppProgress | null>(null);
  const [current, setCurrent] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [correct, setCorrect] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (!progress) return;
    const days = progress.regressionDays ?? 5;
    setCountdown(getRegressionCountdown(progress.lastRegressionCheck, days));
    const id = setInterval(() => {
      setCountdown(getRegressionCountdown(progress.lastRegressionCheck, days));
    }, 60_000);
    return () => clearInterval(id);
  }, [progress?.lastRegressionCheck, progress?.regressionDays]);

  // Initialise ou réinitialise toute l'app
  const boot = async () => {
    setScreen('loading');
    try {
      const qs = await loadQuestionsFromCSV();

      let prog = await loadProgress();
      prog = initializeProgress(qs, prog);
      prog = applyRegression(prog); // régression auto si 5+ jours écoulés
      await saveProgress(prog);

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

  // Appelé quand l'utilisateur valide ses réponses
  const handleValidate = async (answers: string[]) => {
    if (!current || !progress) return;

    // Comparaison insensible à l'ordre : tri + jointure
    const ok =
      [...answers].sort().join('|') ===
      [...current.correct_answers].sort().join('|');

    setSelected(answers);
    setCorrect(ok);

    // Mise à jour de la progression (promotion + compteur si correct)
    let newProg = ok ? promoteQuestion(progress, current.question_id) : progress;
    if (ok) newProg = { ...newProg, answeredSinceLastCheck: (newProg.answeredSinceLastCheck ?? 0) + 1 };
    await saveProgress(newProg);
    setProgress(newProg);

    setScreen('feedback');
  };

  // Passe à la question suivante
  const handleNext = () => {
    if (!progress || !questions.length) return;

    if (isVictory(questions, progress)) {
      setScreen('victory');
      return;
    }

    // Évite de reposer immédiatement la même question
    const next = selectNextQuestion(questions, progress, current?.question_id);
    setCurrent(next);
    setSelected([]);
    setScreen(next ? 'question' : 'victory');
  };

  // Remet toute la progression à zéro (depuis VictoryScreen)
  const handleReset = async () => {
    await resetProgress();
    boot();
  };

  // Remet tous les groupes à 1 et reset le timer (depuis Settings)
  const handleResetGroups = async () => {
    if (!progress) return;
    const newProg = resetGroups(progress);
    await saveProgress(newProg);
    setProgress(newProg);
    setSettingsVisible(false);
    setCurrent(selectNextQuestion(questions, newProg));
    setScreen('question');
  };

  // Sauvegarde le nouvel intervalle de régression
  const handleSaveDays = async (days: number) => {
    if (!progress) return;
    const newProg = { ...progress, regressionDays: days };
    await saveProgress(newProg);
    setProgress(newProg);
  };

  const counts = progress && questions.length
    ? getGroupCounts(questions, progress)
    : ({ 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Group, number>);

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
          <TouchableOpacity style={s.retryBtn} onPress={boot}>
            <Text style={s.retryText}>Réessayer</Text>
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
      </SafeAreaView>
    );
  }

  // --- Écran principal (question / feedback) ---
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.titleRow}>
          <View style={s.titleSpacer} />
          <Text style={s.title}>Quiz GCP</Text>
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
            key={current.question_id} // force le reset de l'état interne à chaque question
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
});
