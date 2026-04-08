import { Question, Group } from '../types';

interface Props {
  question: Question;
  currentGroup: Group;
  selected: string[];
  onToggle: (label: string) => void;
  onValidate: () => void;
}

export function QuizCard({ question, currentGroup, selected, onToggle, onValidate }: Props) {
  const isMultiple = question.question_type === 'multiple';
  const canValidate = selected.length > 0;

  return (
    <div className="quiz-card">
      <div className="quiz-card__meta">
        {question.topic && (
          <span className="badge badge--topic">Topic {question.topic}</span>
        )}
        {isMultiple && (
          <span className="badge badge--multiple">Choix multiples</span>
        )}
        <span className="badge">Groupe {currentGroup}</span>
      </div>

      <p className="quiz-card__question">{question.question_text}</p>

      {question.choices.length > 0 && (
        <ul className="choices-list">
          {question.choices.map(choice => {
            const isSelected = selected.includes(choice.label);
            return (
              <li
                key={choice.label}
                className={`choice-item${isSelected ? ' choice-item--selected' : ''}`}
                onClick={() => onToggle(choice.label)}
              >
                <div className="choice-item__indicator">{choice.label}</div>
                <span className="choice-item__text">{choice.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      <button
        className="btn btn--primary"
        onClick={onValidate}
        disabled={!canValidate}
      >
        Valider
      </button>
    </div>
  );
}
