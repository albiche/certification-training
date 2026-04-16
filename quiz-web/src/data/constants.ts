import { Group } from '../types';

export type ExamType = 'gcp' | 'databricks';

export interface ExamConfig {
  label: string;
  subtitle: string;
  color: string;
  csvFile: string;
  storageKey: string;
}

export const EXAM_CONFIG: Record<ExamType, ExamConfig> = {
  gcp: {
    label: 'GCP Pro Data Engineer',
    subtitle: 'Professional Data Engineer',
    color: '#4285F4',
    csvFile: 'questions.csv',
    storageKey: 'quiz_web_progress_v1_gcp',
  },
  databricks: {
    label: 'Databricks Associate',
    subtitle: 'Associate Data Engineer',
    color: '#FF3621',
    csvFile: 'questions_databricks.csv',
    storageKey: 'quiz_web_progress_v1_databricks',
  },
};

/** Probabilité de sélection par groupe (total = 100). Groupe 4 = jamais. */
export const GROUP_WEIGHTS: Record<Group, number> = {
  1: 90,
  2: 9,
  3: 1,
  4: 0,
};
