import { AppProgress } from '../types';
import { STORAGE_KEY, DEFAULT_REGRESSION_DAYS } from '../data/constants';

export function defaultProgress(): AppProgress {
  return {
    progress: {},
    lastRegressionCheck: new Date().toISOString(),
    questionsLoaded: false,
    regressionDays: DEFAULT_REGRESSION_DAYS,
    answeredSinceLastCheck: 0,
  };
}

export function loadProgress(): AppProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as AppProgress;
    if (!parsed.regressionDays) parsed.regressionDays = 5;
    if (parsed.answeredSinceLastCheck == null) parsed.answeredSinceLastCheck = 0;
    return parsed;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data: AppProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
