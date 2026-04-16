import { AppProgress } from '../types';

export function defaultProgress(): AppProgress {
  return {
    progress: {},
    questionsLoaded: false,
    answeredTotal: 0,
  };
}

export function loadProgress(storageKey: string): AppProgress {
  try {
    const raw = localStorage.getItem(storageKey);
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

export function saveProgress(storageKey: string, data: AppProgress): void {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function clearProgress(storageKey: string): void {
  localStorage.removeItem(storageKey);
}
