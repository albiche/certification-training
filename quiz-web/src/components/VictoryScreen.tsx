interface Props {
  total: number;
  onReset: () => void;
}

export function VictoryScreen({ total, onReset }: Props) {
  return (
    <div className="victory-screen">
      <div className="victory-screen__emoji">🏆</div>
      <h1 className="victory-screen__title">Félicitations !</h1>
      <p className="victory-screen__subtitle">
        Vous avez maîtrisé toutes les questions. Toutes sont en groupe 4.
      </p>
      <div>
        <div className="victory-screen__total">{total}</div>
        <div className="victory-screen__total-label">questions maîtrisées</div>
      </div>
      <div className="victory-screen__actions">
        <button className="btn btn--primary" onClick={onReset}>
          Recommencer depuis zéro
        </button>
      </div>
    </div>
  );
}
