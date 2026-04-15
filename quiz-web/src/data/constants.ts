import { Group } from '../types';

export const STORAGE_KEY = 'quiz_web_progress_v1';

export const CSV_FILENAME = 'questions.csv';

/** Probabilité de sélection par groupe (total = 100). Groupe 4 = jamais. */
export const GROUP_WEIGHTS: Record<Group, number> = {
  1: 90,
  2: 9,
  3: 1,
  4: 0,
};
