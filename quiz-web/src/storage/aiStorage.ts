import { AISettings } from '../types';

const AI_KEY = 'quiz_web_ai_v1';

export const AI_MODELS = [
  { id: 'gpt-4o',       label: 'GPT-4o (recommandé)' },
  { id: 'gpt-4o-mini',  label: 'GPT-4o Mini (rapide)' },
  { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo (économique)' },
];

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(AI_KEY);
    if (!raw) return { apiKey: '', model: 'gpt-4o' };
    return JSON.parse(raw) as AISettings;
  } catch {
    return { apiKey: '', model: 'gpt-4o' };
  }
}

export function saveAISettings(s: AISettings): void {
  localStorage.setItem(AI_KEY, JSON.stringify(s));
}

export async function testConnection(apiKey: string): Promise<void> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  }
}

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 800, temperature: 0.7 }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.choices[0].message.content as string).trim();
}
