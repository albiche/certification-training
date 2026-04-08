import { Question } from '../types';

interface Props {
  question: Question;
  selected: string[];
  correct: boolean;
  onNext: () => void;
}

export function ResultView({ question, selected, correct, onNext }: Props) {
  const correctSet = new Set(question.correct_answers);
  const selectedSet = new Set(selected);

  function getChoiceClass(label: string): string {
    const isCorrect = correctSet.has(label);
    const isSelected = selectedSet.has(label);
    if (isCorrect) return 'choice-item choice-item--correct';
    if (isSelected && !isCorrect) return 'choice-item choice-item--wrong';
    return 'choice-item choice-item--neutral';
  }

  function getIndicatorIcon(label: string): string {
    const isCorrect = correctSet.has(label);
    const isSelected = selectedSet.has(label);
    if (isCorrect) return '✓';
    if (isSelected && !isCorrect) return '✗';
    return label;
  }

  return (
    <div className="quiz-card">
      {/* Résultat */}
      <div className={`result-header result-header--${correct ? 'correct' : 'wrong'}`}>
        <span className="result-header__icon">{correct ? '✅' : '❌'}</span>
        <span>{correct ? 'Bonne réponse !' : 'Réponse incorrecte'}</span>
      </div>

      {/* Question */}
      <p className="quiz-card__question">{question.question_text}</p>

      {/* Choix annotés */}
      {question.choices.length > 0 && (
        <ul className="choices-list">
          {question.choices.map(choice => (
            <li key={choice.label} className={getChoiceClass(choice.label)}>
              <div className="choice-item__indicator">{getIndicatorIcon(choice.label)}</div>
              <span className="choice-item__text">{choice.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Explication */}
      {question.explanation && (
        <div className="explanation-box">
          <div className="explanation-box__title">Explication</div>
          <p className="explanation-box__text">{question.explanation}</p>
          {question.url && (
            <a
              className="explanation-box__link"
              href={question.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir la discussion →
            </a>
          )}
        </div>
      )}

      <button className="btn btn--success" onClick={onNext}>
        Question suivante
      </button>
    </div>
  );
}
