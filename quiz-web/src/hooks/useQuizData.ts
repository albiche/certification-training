import { useState, useEffect } from 'react';
import { Question, AppProgress } from '../types';
import { parseQuestions } from '../data/csvParser';
import { ExamType, EXAM_CONFIG } from '../data/constants';
import { loadProgress, saveProgress, defaultProgress } from '../storage/storage';
import { initializeProgress } from '../logic/progression';

type LoadStatus = 'loading' | 'error' | 'ready';

interface UseQuizDataResult {
  status: LoadStatus;
  questions: Question[];
  progress: AppProgress;
  updateProgress: (p: AppProgress) => void;
  error: string;
}

export function useQuizData(examType: ExamType): UseQuizDataResult {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<AppProgress>(defaultProgress());
  const [error, setError] = useState('');

  const cfg = EXAM_CONFIG[examType];

  useEffect(() => {
    setStatus('loading');
    setQuestions([]);
    setProgress(defaultProgress());

    async function load() {
      try {
        const url = `${import.meta.env.BASE_URL}${cfg.csvFile}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Impossible de charger ${cfg.csvFile} (HTTP ${res.status})`);
        const text = await res.text();
        const parsed = parseQuestions(text);
        if (!parsed.length) throw new Error('Aucune question trouvée dans le fichier CSV.');

        const saved = loadProgress(cfg.storageKey);
        const initialized = initializeProgress(parsed, saved);

        saveProgress(cfg.storageKey, initialized);
        setQuestions(parsed);
        setProgress(initialized);
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    }
    load();
  }, [examType]);

  function updateProgress(p: AppProgress) {
    saveProgress(cfg.storageKey, p);
    setProgress(p);
  }

  return { status, questions, progress, updateProgress, error };
}
