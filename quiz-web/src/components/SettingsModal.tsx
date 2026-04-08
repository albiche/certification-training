import { useState } from 'react';
import { AppProgress, Group, Question } from '../types';
import { getGroupCounts, daysUntilRegression } from '../logic/progression';

interface Props {
  progress: AppProgress;
  questions: Question[];
  onSave: (regressionDays: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export function SettingsModal({ progress, questions, onSave, onReset, onClose }: Props) {
  const [days, setDays] = useState(progress.regressionDays);
  const [confirmReset, setConfirmReset] = useState(false);

  const counts = getGroupCounts(questions, progress);
  const total = questions.length;
  const mastered = counts[4];
  const daysLeft = daysUntilRegression(progress);

  const now = new Date();
  const last = new Date(progress.lastRegressionCheck);
  const daysSince = Math.floor((now.getTime() - last.getTime()) / 86_400_000);

  function handleSave() {
    onSave(days);
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        {/* Header */}
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
              {daysLeft === 0 ? 'Aujourd\'hui' : `J-${daysLeft}`}
            </div>
            <div className="regression-info__label">
              {daysLeft === 0
                ? 'La prochaine régression s\'appliquera au prochain chargement'
                : `Prochaine régression dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="stat-row">
            <span className="stat-row__label">Dernière régression</span>
            <span className="stat-row__value">
              {daysSince === 0 ? 'Aujourd\'hui' : `Il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="range-row">
            <label className="range-row__label">
              <span>Intervalle de régression</span>
              <span className="range-row__value">{days} jour{days > 1 ? 's' : ''}</span>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            />
          </div>
          {days !== progress.regressionDays && (
            <button className="btn btn--primary" onClick={handleSave}>
              Sauvegarder l'intervalle
            </button>
          )}
        </div>

        {/* Réinitialisation */}
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
                  Toutes les questions vont revenir au groupe 1. Cette action est irréversible.
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
