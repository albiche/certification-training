import { Question, Choice } from '../types';

// Parseur CSV RFC 4180 : gère les champs entre guillemets, les virgules et les sauts de ligne
function parseCSVRaw(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        if (i < text.length && text[i] === '\n') i++;
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Dernier champ/ligne
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some(f => f !== '')) rows.push(row);
  }

  return rows;
}

function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCSVRaw(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function parseQuestions(csv: string): Question[] {
  const records = csvToObjects(csv);
  return records
    .filter(r => r.question_id && r.question_text && r.choice_A?.trim())
    .map(r => {
      const choices: Choice[] = CHOICE_LABELS
        .map(l => ({ label: l, text: r[`choice_${l}`] ?? '' }))
        .filter(c => c.text !== '');

      const answer = r.answer ?? '';
      const correct_answers = answer.split('|').map(a => a.trim()).filter(Boolean);

      return {
        question_id: r.question_id,
        topic: r.topic ?? '',
        question_text: r.question_text,
        choices,
        answer,
        correct_answers,
        question_type: r.question_type === 'multiple' ? 'multiple' : 'single',
        explanation: r.explanation ?? '',
        url: r.url || undefined,
      } satisfies Question;
    });
}
