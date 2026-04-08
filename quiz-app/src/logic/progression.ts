import { AppProgress, Question, Group } from '../types';

/**
 * Initialise la progression pour les nouvelles questions (groupe 1 par défaut).
 * Les questions déjà connues conservent leur groupe.
 */
export function initializeProgress(
  questions: Question[],
  existing: AppProgress
): AppProgress {
  const progress = { ...existing.progress };
  for (const q of questions) {
    if (!progress[q.question_id]) {
      progress[q.question_id] = { group: 1 };
    }
  }
  return {
    ...existing,
    progress,
    questionsLoaded: true,
    lastRegressionCheck: existing.lastRegressionCheck || new Date().toISOString(),
  };
}

/**
 * Applique la régression automatique si des périodes de 5 jours se sont écoulées.
 * Fonctionne même si l'app est restée fermée plusieurs jours.
 */
export function applyRegression(state: AppProgress): AppProgress {
  const regressionDays = state.regressionDays ?? 5;
  const now = new Date();
  const last = new Date(state.lastRegressionCheck);
  const daysPassed = Math.floor((now.getTime() - last.getTime()) / (86_400_000));

  if (daysPassed < regressionDays) return state;

  const periods = Math.floor(daysPassed / regressionDays);
  const updated = { ...state.progress };

  for (const id in updated) {
    let g = updated[id].group;
    for (let i = 0; i < periods; i++) {
      if (g > 1) g = (g - 1) as Group;
    }
    updated[id] = { group: g };
  }

  return { ...state, progress: updated, lastRegressionCheck: now.toISOString(), answeredSinceLastCheck: 0 };
}

/**
 * Fait monter une question d'un groupe (réponse correcte).
 * Groupe 4 = plafond, reste à 4.
 */
export function promoteQuestion(state: AppProgress, id: string): AppProgress {
  const current = state.progress[id];
  if (!current) return state;
  const newGroup: Group = current.group < 4 ? ((current.group + 1) as Group) : 4;
  return {
    ...state,
    progress: { ...state.progress, [id]: { group: newGroup } },
  };
}

/** Compte le nombre de questions par groupe. */
export function getGroupCounts(
  questions: Question[],
  state: AppProgress
): Record<Group, number> {
  const counts: Record<Group, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const q of questions) {
    const g = state.progress[q.question_id]?.group ?? 1;
    counts[g]++;
  }
  return counts;
}

/** Retourne true si toutes les questions sont en groupe 4. */
export function isVictory(questions: Question[], state: AppProgress): boolean {
  if (!questions.length) return false;
  return questions.every((q) => state.progress[q.question_id]?.group === 4);
}

/** Remet toutes les questions au groupe 1 et réinitialise le timer de régression. */
export function resetGroups(state: AppProgress): AppProgress {
  const reset: AppProgress['progress'] = {};
  for (const id in state.progress) {
    reset[id] = { group: 1 };
  }
  return {
    ...state,
    progress: reset,
    lastRegressionCheck: new Date().toISOString(),
    answeredSinceLastCheck: 0,
  };
}
