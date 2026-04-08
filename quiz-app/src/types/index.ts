export interface Choice {
  label: string; // 'A', 'B', 'C', 'D', 'E', 'F'
  text: string;
}

export interface Question {
  question_id: string;
  topic: string;
  question_text: string;
  choices: Choice[];
  answer: string;           // brut depuis CSV : "C" ou "B|D|E"
  correct_answers: string[]; // parsé : ["C"] ou ["B", "D", "E"]
  question_type: 'single' | 'multiple';
  explanation: string;
}

export type Group = 1 | 2 | 3 | 4;

export interface QuestionProgress {
  group: Group;
}

export interface AppProgress {
  progress: Record<string, QuestionProgress>; // clé = question_id
  lastRegressionCheck: string;                // ISO date string
  questionsLoaded: boolean;
  regressionDays: number;                     // intervalle de régression (1-10)
  answeredSinceLastCheck: number;             // questions répondues depuis le dernier reset
}
