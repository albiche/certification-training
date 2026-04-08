interface Props {
  regressionDays: number;
  onClose: () => void;
}

export function RulesModal({ regressionDays, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal__header">
          <span className="modal__title">📖 Règles</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="rules-section">
          <div className="rules-section__title">Les 4 groupes</div>
          <div className="rules-groups">
            {[
              { g: 1, label: 'À apprendre', prob: '90 %', color: 'var(--g1)' },
              { g: 2, label: 'En cours',    prob: '9 %',  color: 'var(--g2)' },
              { g: 3, label: 'Presque',     prob: '1 %',  color: 'var(--g3)' },
              { g: 4, label: 'Maîtrisé',    prob: '—',    color: 'var(--g4)' },
            ].map(({ g, label, prob, color }) => (
              <div key={g} className="rules-group-row">
                <span className="rules-group-badge" style={{ background: color }}>G{g}</span>
                <span className="rules-group-label">{label}</span>
                <span className="rules-group-prob">{prob}</span>
              </div>
            ))}
          </div>
          <p className="rules-note">La probabilité indique la chance qu'une question de ce groupe soit posée.</p>
        </div>

        <div className="rules-section">
          <div className="rules-section__title">Progression</div>
          <div className="rules-row">
            <span className="rules-pill rules-pill--correct">✓ Bonne réponse</span>
            <span className="rules-arrow">→</span>
            <span>La question monte d'un groupe</span>
          </div>
          <div className="rules-row">
            <span className="rules-pill rules-pill--wrong">✗ Mauvaise réponse</span>
            <span className="rules-arrow">→</span>
            <span>La question reste dans son groupe</span>
          </div>
          <div className="rules-row">
            <span className="rules-pill rules-pill--victory">🏆 Victoire</span>
            <span className="rules-arrow">→</span>
            <span>Toutes les questions sont en groupe 4</span>
          </div>
        </div>

        <div className="rules-section">
          <div className="rules-section__title">Régression automatique</div>
          <p className="rules-text">
            Toutes les <strong>{regressionDays} jours</strong>, chaque question redescend d'un groupe.
            Les questions en groupe 1 restent en groupe 1.
          </p>
          <p className="rules-text">
            Cela s'applique même si le site n'a pas été ouvert. L'intervalle est configurable dans ⚙️.
          </p>
        </div>
      </div>
    </div>
  );
}
