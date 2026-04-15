import { AppProgress, Question, Group } from '../types';

/** Initialise la progression : les nouvelles questions partent en groupe 1. */
export function initializeProgress(
  questions: Question[],
  existing: AppProgress,
): AppProgress {
  const progress = { ...existing.progress };
  for (const q of questions) {
    if (!progress[q.question_id]) {
      progress[q.question_id] = { group: 1 };
    }
  }
  return { ...existing, progress, questionsLoaded: true };
}

/** Fait monter une question d'un groupe (réponse correcte). Plafond = 4. */
export function promoteQuestion(state: AppProgress, id: string): AppProgress {
  const current = state.progress[id];
  if (!current) return state;
  const newGroup: Group = current.group < 4 ? ((current.group + 1) as Group) : 4;
  return {
    ...state,
    progress: { ...state.progress, [id]: { group: newGroup } },
  };
}

/**
 * Fait descendre une question d'un groupe (mauvaise réponse sur G2 ou G3).
 * G1 reste en G1. G4 n'est jamais posée donc ne peut pas régresser.
 */
export function demoteQuestion(state: AppProgress, id: string): AppProgress {
  const current = state.progress[id];
  if (!current || current.group <= 1) return state;
  const newGroup: Group = (current.group - 1) as Group;
  return {
    ...state,
    progress: { ...state.progress, [id]: { group: newGroup } },
  };
}

/** Nombre de questions par groupe. */
export function getGroupCounts(
  questions: Question[],
  state: AppProgress,
): Record<Group, number> {
  const counts: Record<Group, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const q of questions) {
    const g = state.progress[q.question_id]?.group ?? 1;
    counts[g]++;
  }
  return counts;
}

/** Vrai si toutes les questions sont en groupe 4. */
export function isVictory(questions: Question[], state: AppProgress): boolean {
  if (!questions.length) return false;
  return questions.every(q => state.progress[q.question_id]?.group === 4);
}

/** Remet tout au groupe 1. */
export function resetGroups(state: AppProgress): AppProgress {
  const reset: AppProgress['progress'] = {};
  for (const id in state.progress) {
    reset[id] = { group: 1 };
  }
  return { ...state, progress: reset, answeredTotal: 0 };
}
