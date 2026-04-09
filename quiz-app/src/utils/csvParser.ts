import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import Papa from 'papaparse';
import { Question, Choice } from '../types';

/**
 * Charge le fichier CSV bundlé dans /assets/ et retourne les questions parsées.
 * Metro doit être configuré pour reconnaître l'extension .csv (voir metro.config.js).
 */
export async function loadQuestionsFromCSV(): Promise<Question[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const moduleId: number = require('../../assets/questions_exam12_ready_fix.csv');
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();

  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Impossible de résoudre le chemin du fichier CSV.');

  const content = await FileSystem.readAsStringAsync(uri);
  return parseCSV(content);
}

export function parseCSV(content: string): Question[] {
  const { data } = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return data
    .filter((row) => row.question_id?.trim()) // ignore les lignes sans ID
    .map((row): Question => {
      // Construit la liste des choix en ignorant les colonnes vides
      const choices: Choice[] = [];
      for (const label of ['A', 'B', 'C', 'D', 'E', 'F']) {
        const text = row[`choice_${label}`]?.trim();
        if (text) choices.push({ label, text });
      }

      const answerRaw = row.answer?.trim() ?? '';
      const correct_answers = answerRaw
        .split('|')
        .map((a) => a.trim())
        .filter(Boolean);

      return {
        question_id: row.question_id.trim(),
        topic: row.topic?.trim() ?? '',
        question_text: row.question_text?.trim() ?? '',
        choices,
        answer: answerRaw,
        correct_answers,
        question_type: row.question_type?.trim() === 'multiple' ? 'multiple' : 'single',
        explanation: row.explanation?.trim() ?? '',
      };
    });
}
