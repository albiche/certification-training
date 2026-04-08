import { useState, useEffect } from 'react';
import { Question, AppProgress } from '../types';
import { parseQuestions } from '../data/csvParser';
import { CSV_FILENAME } from '../data/constants';
import { loadProgress, saveProgress, defaultProgress } from '../storage/storage';
import { initializeProgress, applyRegression } from '../logic/progression';

type LoadStatus = 'loading' | 'error' | 'ready';

interface UseQuizDataResult {
  status: LoadStatus;
  questions: Question[];
  progress: AppProgress;
  updateProgress: (p: AppProgress) => void;
  error: string;
}

export function useQuizData(): UseQuizDataResult {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<AppProgress>(defaultProgress());
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const url = `${import.meta.env.BASE_URL}${CSV_FILENAME}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Impossible de charger ${CSV_FILENAME} (HTTP ${res.status})`);
        const text = await res.text();
        const parsed = parseQuestions(text);
        if (!parsed.length) throw new Error('Aucune question trouvée dans le fichier CSV.');

        const saved = loadProgress();
        const initialized = initializeProgress(parsed, saved);
        const afterRegression = applyRegression(initialized);

        saveProgress(afterRegression);
        setQuestions(parsed);
        setProgress(afterRegression);
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    }
    load();
  }, []);

  function updateProgress(p: AppProgress) {
    saveProgress(p);
    setProgress(p);
  }

  return { status, questions, progress, updateProgress, error };
}
