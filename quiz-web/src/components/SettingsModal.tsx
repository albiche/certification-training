import { useState } from 'react';
import { AppProgress, Group, Question, AISettings } from '../types';
import { getGroupCounts, daysUntilRegression } from '../logic/progression';
import { AI_MODELS, testConnection } from '../storage/aiStorage';

interface Props {
  progress: AppProgress;
  questions: Question[];
  aiSettings: AISettings;
  onSave: (regressionDays: number) => void;
  onSaveAI: (settings: AISettings) => void;
  onReset: () => void;
  onClose: () => void;
}

export function SettingsModal({ progress, questions, aiSettings, onSave, onSaveAI, onReset, onClose }: Props) {
  // Régression
  const [days, setDays] = useState(progress.regressionDays);

  // IA
  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [model, setModel] = useState(aiSettings.model);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  // Reset
  const [confirmReset, setConfirmReset] = useState(false);

  const counts = getGroupCounts(questions, progress);
  const total = questions.length;
  const mastered = counts[4];
  const daysLeft = daysUntilRegression(progress);
  const now = new Date();
  const last = new Date(progress.lastRegressionCheck);
  const daysSince = Math.floor((now.getTime() - last.getTime()) / 86_400_000);

  async function handleTestConnection() {
    if (!apiKey.trim()) return;
    setTestStatus('loading');
    setTestMsg('');
    try {
      await testConnection(apiKey.trim());
      setTestStatus('ok');
      setTestMsg('Connexion réussie ✓');
    } catch (e) {
      setTestStatus('error');
      setTestMsg(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }

  function handleSaveAI() {
    onSaveAI({ apiKey: apiKey.trim(), model });
    setTestStatus('idle');
    setTestMsg('');
  }

  const aiChanged = apiKey.trim() !== aiSettings.apiKey || model !== aiSettings.model;
  const maskedKey = apiKey.length > 8
    ? apiKey.slice(0, 4) + '••••••••' + apiKey.slice(-4)
    : apiKey;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal__header">
          <span className="modal__title">⚙️ Paramètres</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Statistiques */}
        <div className="settings-section">
          <div className="settings-section__title">Statistiques</div>
          <div className="stat-row">
            <span className="stat-row__label">Total questions</span>
            <span className="stat-row__value">{total}</span>
          </div>
          <div className="stat-row">
            <span className="stat-row__label">Maîtrisées (groupe 4)</span>
            <span className="stat-row__value" style={{ color: 'var(--g4)' }}>
              {mastered} ({total > 0 ? Math.round((mastered / total) * 100) : 0}%)
            </span>
          </div>
          {([1, 2, 3] as Group[]).map(g => (
            <div key={g} className="stat-row">
              <span className="stat-row__label">Groupe {g}</span>
              <span className="stat-row__value">{counts[g]}</span>
            </div>
          ))}
          <div className="stat-row">
            <span className="stat-row__label">Réponses données</span>
            <span className="stat-row__value">{progress.answeredSinceLastCheck}</span>
          </div>
        </div>

        {/* Régression */}
        <div className="settings-section">
          <div className="settings-section__title">Régression automatique</div>
          <div className="regression-info">
            <div className="regression-info__countdown">
              {daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}
            </div>
            <div className="regression-info__label">
              {daysLeft === 0
                ? "La prochaine régression s'appliquera au prochain chargement"
                : `Prochaine régression dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="stat-row">
            <span className="stat-row__label">Dernière régression</span>
            <span className="stat-row__value">
              {daysSince === 0 ? "Aujourd'hui" : `Il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="range-row">
            <label className="range-row__label">
              <span>Intervalle</span>
              <span className="range-row__value">{days} jour{days > 1 ? 's' : ''}</span>
            </label>
            <input type="range" min={1} max={30} value={days} onChange={e => setDays(Number(e.target.value))} />
          </div>
          {days !== progress.regressionDays && (
            <button className="btn btn--primary" onClick={() => onSave(days)}>
              Sauvegarder l'intervalle
            </button>
          )}
        </div>

        {/* Assistant IA */}
        <div className="settings-section">
          <div className="settings-section__title">Assistant IA</div>

          {/* Clé API */}
          <div className="ai-settings-field">
            <label className="ai-settings-label">Clé OpenAI</label>
            <div className="ai-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="ai-key-input"
                placeholder="sk-proj-..."
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setTestStatus('idle'); }}
              />
              <button
                className="icon-btn"
                onClick={() => setShowKey(v => !v)}
                title={showKey ? 'Masquer' : 'Afficher'}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            {!showKey && apiKey && (
              <span className="ai-key-preview">{maskedKey}</span>
            )}
          </div>

          {/* Modèle */}
          <div className="ai-settings-field">
            <label className="ai-settings-label">Modèle</label>
            <select
              className="ai-model-select"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Boutons */}
          <div className="ai-settings-actions">
            <button
              className="btn btn--ghost"
              onClick={handleTestConnection}
              disabled={!apiKey.trim() || testStatus === 'loading'}
            >
              {testStatus === 'loading' ? 'Test…' : 'Tester la connexion'}
            </button>
            {aiChanged && (
              <button className="btn btn--primary" onClick={handleSaveAI}>
                Sauvegarder
              </button>
            )}
          </div>

          {testMsg && (
            <p className={`ai-test-msg ai-test-msg--${testStatus}`}>{testMsg}</p>
          )}
        </div>

        {/* Zone dangereuse */}
        <div className="settings-section">
          <div className="settings-section__title">Zone dangereuse</div>
          <div className="danger-zone">
            {!confirmReset ? (
              <button className="btn btn--ghost" onClick={() => setConfirmReset(true)}>
                Réinitialiser tous les groupes
              </button>
            ) : (
              <>
                <p style={{ fontSize: '0.88rem', color: 'var(--error)' }}>
                  Toutes les questions vont revenir au groupe 1. Action irréversible.
                </p>
                <div className="confirm-row">
                  <button className="btn btn--danger" onClick={() => { setConfirmReset(false); onReset(); }}>
                    Confirmer
                  </button>
                  <button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
