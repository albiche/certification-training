import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProgress } from '../types';
import { ExamType } from '../utils/csvParser';

const storageKey = (examType: ExamType) => `quiz_progress_v1_${examType}`;

const defaultProgress = (): AppProgress => ({
  progress: {},
  lastRegressionCheck: new Date().toISOString(),
  questionsLoaded: false,
  regressionDays: 5,
  answeredSinceLastCheck: 0,
});

export async function loadProgress(examType: ExamType): Promise<AppProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(examType));
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

export async function saveProgress(examType: ExamType, data: AppProgress): Promise<void> {
  await AsyncStorage.setItem(storageKey(examType), JSON.stringify(data));
}

export async function resetProgress(examType: ExamType): Promise<void> {
  await AsyncStorage.removeItem(storageKey(examType));
}
