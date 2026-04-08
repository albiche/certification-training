import { Question, AppProgress, Group } from '../types';

// Poids par groupe (total = 100). Groupe 4 = jamais sélectionné.
const WEIGHTS: Record<Group, number> = { 1: 90, 2: 9, 3: 1, 4: 0 };

/**
 * Sélectionne la prochaine question selon les probabilités pondérées.
 * - Évite de reproduire immédiatement la même question (avoidId).
 * - Si un groupe sélectionné est vide, bascule intelligemment vers un autre.
 * - Retourne null si toutes les questions sont en groupe 4 (victoire).
 */
export function selectNextQuestion(
  questions: Question[],
  state: AppProgress,
  avoidId?: string
): Question | null {
  // Répartit les questions par groupe
  const byGroup: Record<Group, Question[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const q of questions) {
    const g = state.progress[q.question_id]?.group ?? 1;
    byGroup[g].push(q);
  }

  // Construit un pool pondéré en excluant le groupe 4 et les groupes vides
  const pool: Group[] = [];
  for (const g of [1, 2, 3] as Group[]) {
    if (byGroup[g].length > 0) {
      for (let i = 0; i < WEIGHTS[g]; i++) pool.push(g);
    }
  }

  if (pool.length === 0) return null; // toutes les questions sont en groupe 4

  const selectedGroup = pool[Math.floor(Math.random() * pool.length)];
  return pickFrom(byGroup[selectedGroup], avoidId);
}

function pickFrom(questions: Question[], avoidId?: string): Question {
  if (questions.length <= 1) return questions[0];
  // Tente d'éviter la question précédente
  const candidates = avoidId
    ? questions.filter((q) => q.question_id !== avoidId)
    : questions;
  const pool = candidates.length > 0 ? candidates : questions;
  return pool[Math.floor(Math.random() * pool.length)];
}
