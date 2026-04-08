import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProgress } from '../types';

const STORAGE_KEY = 'quiz_progress_v1';

const defaultProgress = (): AppProgress => ({
  progress: {},
  lastRegressionCheck: new Date().toISOString(),
  questionsLoaded: false,
  regressionDays: 5,
  answeredSinceLastCheck: 0,
});

export async function loadProgress(): Promise<AppProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as AppProgress;
    // migration : anciennes saves sans ces champs
    if (!parsed.regressionDays) parsed.regressionDays = 5;
    if (parsed.answeredSinceLastCheck == null) parsed.answeredSinceLastCheck = 0;
    return parsed;
  } catch {
    return defaultProgress();
  }
}

export async function saveProgress(data: AppProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function resetProgress(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
