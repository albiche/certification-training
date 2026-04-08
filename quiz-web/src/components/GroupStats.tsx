import { Group } from '../types';

interface Props {
  counts: Record<Group, number>;
  total: number;
}

export function GroupStats({ counts, total }: Props) {
  const mastered = counts[4];
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div>
      <div className="group-stats">
        {([1, 2, 3, 4] as Group[]).map(g => (
          <div key={g} className={`group-card group-card--${g}`}>
            <div className="group-card__label">Groupe {g}</div>
            <div className="group-card__count">{counts[g]}</div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: 'var(--g4)',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', flexShrink: 0 }}>
            {mastered}/{total} maîtrisées
          </span>
        </div>
      )}
    </div>
  );
}
