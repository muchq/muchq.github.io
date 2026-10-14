import type { Ref } from 'react'
import felt from '@/apps/cards/felt.module.css'

// A table's choice of game, made the same way at every table: one
// labelled list, and one button that names what it starts. One option is
// no choice, so the list goes; a pick no longer on offer (seats left)
// falls to the first option.

export interface VariantOption<V extends string> {
  value: V
  label: string
}

interface VariantPickerProps<V extends string> {
  label: string
  options: readonly VariantOption<V>[]
  value: V
  onChange: (value: V) => void
  action: string | ((option: VariantOption<V>) => string)
  onAction: (value: V) => void
  disabled?: boolean
  buttonRef?: Ref<HTMLButtonElement>
}

export default function VariantPicker<V extends string>({
  label,
  options,
  value,
  onChange,
  action,
  onAction,
  disabled = false,
  buttonRef
}: VariantPickerProps<V>) {
  const current = options.find(option => option.value === value) ?? options[0]
  if (current === undefined) return null
  return (
    <>
      {options.length > 1 && (
        <label className={felt.pick}>
          {label}
          <select value={current.value} onChange={event => onChange(event.target.value as V)} disabled={disabled}>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <button ref={buttonRef} type="button" className={felt.primary} onClick={() => onAction(current.value)} disabled={disabled}>
        {typeof action === 'string' ? action : action(current)}
      </button>
    </>
  )
}
