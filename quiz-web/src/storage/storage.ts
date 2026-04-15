import { AppProgress } from '../types';
import { STORAGE_KEY } from '../data/constants';

export function defaultProgress(): AppProgress {
  return {
    progress: {},
    questionsLoaded: false,
    answeredTotal: 0,
  };
}

export function loadProgress(): AppProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as AppProgress & Record<string, unknown>;
    // Migration depuis l'ancienne version (avec compteur de régression)
    if (parsed.answeredTotal == null) {
      parsed.answeredTotal = (parsed.answeredSinceLastCheck as number | undefined) ?? 0;
    }
    return {
      progress: parsed.progress ?? {},
      questionsLoaded: parsed.questionsLoaded ?? false,
      answeredTotal: parsed.answeredTotal,
    };
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
