import { useMemo, useState } from 'react'
import Select, { type StylesConfig } from 'react-select'
import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import own from './Deja.module.css'
import ProbBars from './ProbBars'
import { askNext, type NextResult } from '../api'

// The service takes one to eight tokens of context.
const MAX_CONTEXT = 8

interface Option {
  value: string
  label: string
}

interface Props {
  tokens: string[]
  ask?: (context: string[]) => Promise<NextResult>
}

const selectStyles: StylesConfig<Option, true> = {
  control: (base, state) => ({
    ...base,
    background: 'rgba(26, 31, 53, 0.6)',
    borderColor: state.isFocused ? 'rgba(102, 182, 255, 0.6)' : 'rgba(102, 182, 255, 0.25)',
    boxShadow: 'none',
    '&:hover': { borderColor: 'rgba(102, 182, 255, 0.6)' },
  }),
  menu: (base) => ({ ...base, background: '#1a1f35', border: '1px solid rgba(102, 182, 255, 0.3)' }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'rgba(102, 182, 255, 0.15)' : 'transparent',
    color: state.isDisabled ? 'rgba(255, 255, 255, 0.3)' : 'white',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '0.8rem',
  }),
  input: (base) => ({ ...base, color: 'white' }),
  placeholder: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.4)' }),
  multiValue: (base) => ({ ...base, background: 'rgba(102, 182, 255, 0.2)' }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'white',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.6)' }),
}

const Answer = ({ result }: { result: NextResult }) => {
  switch (result.kind) {
    case 'ok':
      return (
        <div className={own.answer}>
          <div data-testid="ask-bigram">
            <h3 className={own.answerTitle}>bigram</h3>
            <ProbBars predictions={result.predictions.bigram} limit={5} />
          </div>
          <div data-testid="ask-net">
            <h3 className={own.answerTitle}>net</h3>
            <ProbBars predictions={result.predictions.net} limit={5} />
          </div>
        </div>
      )
    case 'not-deployed':
      return <p className={own.note}>Asking is not deployed yet; it lands with the net.</p>
    case 'rejected':
      return (
        <p role="alert" className={own.error}>
          {result.message}
        </p>
      )
    case 'unavailable':
      return (
        <p role="alert" className={own.error}>
          Deja is unavailable right now.
        </p>
      )
  }
}

// Pick a context from the tokens this page has seen and ask both
// predictors what comes next. There is no vocabulary endpoint, so the
// menu is only as wide as the tape has been.
const AskIt = ({ tokens, ask = askNext }: Props) => {
  const [picked, setPicked] = useState<readonly Option[]>([])
  const [result, setResult] = useState<NextResult | null>(null)
  const [busy, setBusy] = useState(false)
  const options = useMemo(() => tokens.map((token) => ({ value: token, label: token })), [tokens])

  const submit = async () => {
    setBusy(true)
    setResult(await ask(picked.map((option) => option.value)))
    setBusy(false)
  }

  return (
    <section aria-label="Ask it" className={styles.section}>
      <h2 className={styles.sectionTitle}>Ask it</h2>
      <p className={own.hint}>
        <span>{tokens.length.toLocaleString('en-US')} tokens seen</span> — pick up to eight, oldest first, and
        ask what comes next.
      </p>
      <div className={own.askRow}>
        <Select<Option, true>
          isMulti
          inputId="deja-context"
          aria-label="Context tokens"
          placeholder="Context tokens…"
          options={options}
          value={picked}
          onChange={setPicked}
          isOptionDisabled={() => picked.length >= MAX_CONTEXT}
          styles={selectStyles}
          classNamePrefix="deja-select"
        />
        <button type="button" className={own.askButton} onClick={submit} disabled={busy || picked.length === 0}>
          Ask
        </button>
      </div>
      {result && <Answer result={result} />}
    </section>
  )
}

export default AskIt
