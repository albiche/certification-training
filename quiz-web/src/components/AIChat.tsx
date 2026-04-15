import { useState, useRef, useEffect } from 'react';
import { Question, AISettings, ChatMessage } from '../types';
import { chatCompletion } from '../storage/aiStorage';

interface Props {
  question: Question;
  mode: 'help' | 'explain';
  selected?: string[];
  correct?: boolean;
  aiSettings: AISettings;
  onClose: () => void;
}

function buildSystemPrompt(question: Question, mode: 'help' | 'explain', selected?: string[], correct?: boolean): string {
  const choicesBlock = question.choices
    .map(c => `${c.label}. ${c.text}`)
    .join('\n');

  if (mode === 'help') {
    return `Tu es un assistant spécialisé en certifications cloud et data.

Question posée à l'utilisateur :
${question.question_text}

Choix proposés :
${choicesBlock}

RÈGLE ABSOLUE : ne révèle jamais la bonne réponse ni la lettre correcte, même si l'utilisateur la demande explicitement.

Ton rôle : orienter la réflexion avec des questions courtes et ciblées sur les concepts clés. Sois direct, concis, sans détour. Réponds en français.`;
  }

  const selectedStr = (selected ?? []).join(', ') || '(aucune)';
  const correctStr = question.correct_answers.join(', ');

  return `Tu es un assistant spécialisé en certifications cloud et data.

Question : ${question.question_text}

Choix proposés :
${choicesBlock}

Bonne réponse : ${correctStr}
Réponse de l'utilisateur : ${selectedStr} (${correct ? 'correcte ✓' : 'incorrecte ✗'})
${question.explanation ? `\nExplication : ${question.explanation}` : ''}

Explique pourquoi la bonne réponse est correcte et pourquoi les autres ne le sont pas (si pertinent). Sois court, direct, factuel. Réponds en français.`;
}

export function AIChat({ question, mode, selected, correct, aiSettings, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(question, mode, selected, correct);
      const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages,
      ];
      const reply = await chatCompletion(fullMessages, aiSettings.apiKey, aiSettings.model);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const previewText = question.question_text.length > 80
    ? question.question_text.slice(0, 80) + '…'
    : question.question_text;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal ai-chat-modal">
        {/* Header */}
        <div className="modal__header">
          <span className="modal__title">
            {mode === 'help' ? '🤖 Aide (sans réponse)' : '🤖 Assistant IA'}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Contexte question */}
        <div className="ai-context">
          {mode === 'explain' ? (
            <span className={`ai-context__badge ${correct ? 'ai-context__badge--correct' : 'ai-context__badge--wrong'}`}>
              {correct ? '✓ Correcte' : '✗ Incorrecte'}
            </span>
          ) : (
            <span className="ai-context__badge ai-context__badge--help">En cours</span>
          )}
          <span className="ai-context__text">{previewText}</span>
        </div>

        {/* Messages */}
        <div className="ai-messages">
          {messages.length === 0 && !loading && (
            <p className="ai-messages__empty">
              Posez votre question sur ce sujet…
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`ai-bubble ai-bubble--${msg.role}`}>
              <div className="ai-bubble__content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="ai-bubble ai-bubble--assistant">
              <div className="ai-bubble__content ai-bubble__loading">
                <span /><span /><span />
              </div>
            </div>
          )}
          {error && (
            <div className="ai-error">{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="ai-input-row">
          <textarea
            ref={inputRef}
            className="ai-input"
            placeholder="Votre question… (Entrée pour envoyer, Shift+Entrée pour sauter une ligne)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
          />
          <button
            className="btn btn--primary ai-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
