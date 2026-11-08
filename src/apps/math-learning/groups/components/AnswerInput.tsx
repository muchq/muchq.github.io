import { useId } from 'react'
import { placeholderFor, type Answer } from '../problems/answers'
import styles from './Groups.module.css'

interface AnswerInputProps {
  /** Accessible name, e.g. "Answer to problem 5.3" — unique on the page. */
  label: string
  answer: Answer
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

/** A text box, or radio buttons for a multiple-choice answer. */
const AnswerInput = ({ label, answer, value, onChange, onSubmit }: AnswerInputProps) => {
  const id = useId()
  if (answer.kind === 'choice') {
    return (
      <div className={styles.choices} role="radiogroup" aria-label={label}>
        {answer.options.map((option, i) => (
          <label key={option} className={styles.choice}>
            <input type="radio" name={id} value={String(i)} checked={value === String(i)} onChange={() => onChange(String(i))} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    )
  }
  return (
    <>
      <label htmlFor={id} className={styles.visuallyHidden}>
        {label}
      </label>
      <input
        id={id}
        className={styles.answerInput}
        type="text"
        inputMode={answer.kind === 'int' ? 'numeric' : 'text'}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholderFor(answer)}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSubmit()
        }}
      />
    </>
  )
}

export default AnswerInput
