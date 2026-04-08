import { Question, AppProgress, Group } from '../types';

// Poids par groupe (total = 100). Groupe 4 = jamais sélectionné.
const WEIGHTS: Record<Group, number> = { 1: 90, 2: 9, 3: 1, 4: 0 };

/**
 * Sélectionne la prochaine question selon les probabilités pondérées.
 * - Évite de reproposer immédiatement la même question (avoidId).
 * - Si le groupe tiré est vide, bascule vers un autre groupe non vide.
 * - Retourne null si toutes les questions sont en groupe 4 (victoire).
 */
export function selectNextQuestion(
  questions: Question[],
  state: AppProgress,
  avoidId?: string,
): Question | null {
  const byGroup: Record<Group, Question[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const q of questions) {
    const g = state.progress[q.question_id]?.group ?? 1;
    byGroup[g].push(q);
  }

  // Pool pondéré : exclut groupe 4 et groupes vides
  const pool: Group[] = [];
  for (const g of [1, 2, 3] as Group[]) {
    if (byGroup[g].length > 0) {
      for (let i = 0; i < WEIGHTS[g]; i++) pool.push(g);
    }
  }

  if (pool.length === 0) return null;

  const selectedGroup = pool[Math.floor(Math.random() * pool.length)];
  return pickFrom(byGroup[selectedGroup], avoidId);
}

function pickFrom(questions: Question[], avoidId?: string): Question {
  if (questions.length <= 1) return questions[0];
  const candidates = avoidId
    ? questions.filter(q => q.question_id !== avoidId)
    : questions;
  const pool = candidates.length > 0 ? candidates : questions;
  return pool[Math.floor(Math.random() * pool.length)];
}
