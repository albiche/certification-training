export interface Choice {
  label: string; // 'A', 'B', 'C', 'D', 'E', 'F'
  text: string;
}

export interface Question {
  question_id: string;
  topic: string;
  question_text: string;
  choices: Choice[];
  answer: string;            // brut depuis CSV : "C" ou "B|D|E"
  correct_answers: string[]; // parsé : ["C"] ou ["B", "D", "E"]
  question_type: 'single' | 'multiple';
  explanation: string;
  url?: string;
}

export type Group = 1 | 2 | 3 | 4;

export interface AISettings {
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface QuestionProgress {
  group: Group;
}

export interface AppProgress {
  progress: Record<string, QuestionProgress>; // clé = question_id
  lastRegressionCheck: string;                // ISO date string
  questionsLoaded: boolean;
  regressionDays: number;                     // intervalle de régression en jours
  answeredSinceLastCheck: number;
}
