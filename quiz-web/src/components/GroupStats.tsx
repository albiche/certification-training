import { Group } from '../types';

interface Props {
  counts: Record<Group, number>;
  total: number;
}

const GROUP_META: Record<Group, { emoji: string; label: string }> = {
  1: { emoji: '🔴', label: 'À apprendre' },
  2: { emoji: '🟠', label: 'En cours' },
  3: { emoji: '🟡', label: 'Presque' },
  4: { emoji: '🟢', label: 'Maîtrisé' },
};

export function GroupStats({ counts, total }: Props) {
  const mastered = counts[4];
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div className="group-stats-wrapper">
      {/* Frise avec flèches */}
      <div className="group-frise">
        {([1, 2, 3, 4] as Group[]).map((g, i) => (
          <div key={g} className="group-frise__item">
            <div className={`group-card group-card--${g}`}>
              <div className="group-card__count">{counts[g]}</div>
              <div className="group-card__label">{GROUP_META[g].label}</div>
            </div>
            {i < 3 && (
              <div className="frise-arrow">
                <span className="frise-arrow__icon">→</span>
                <span className="frise-arrow__hint">bonne rép.</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barre de progression */}
      {total > 0 && (
        <div className="group-progress">
          <div className="group-progress__bar">
            <div
              className="group-progress__fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="group-progress__label">
            {mastered}/{total} maîtrisées ({pct} %)
          </span>
        </div>
      )}
    </div>
  );
}
