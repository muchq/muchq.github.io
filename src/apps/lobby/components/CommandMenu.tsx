import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { bindCommandHotkey } from '@/utils/hotkeys'
import { matchCommands, type Command, type CommandRegistry } from '@/utils/commandRegistry'
import styles from './CommandMenu.module.css'

// The world's commands by name, over the world, which keeps rendering
// behind it. Space opens it; typing filters, the arrows move, Enter runs
// and Escape leaves. Every entry is a verb that runs and closes the menu.

export interface CommandMenuProps {
  registry: CommandRegistry
}

const CommandMenu = ({ registry }: CommandMenuProps) => {
  const [open, setOpen] = useState(false)
  useEffect(() => bindCommandHotkey(document, () => setOpen(true)), [])
  return open ? <CommandDialog registry={registry} onClose={() => setOpen(false)} /> : null
}

// Mounted only while open, so every opening starts from an empty filter
// and the first entry.
const CommandDialog = ({ registry, onClose }: CommandMenuProps & { onClose: () => void }) => {
  const commands = useSyncExternalStore(registry.subscribe, registry.list)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  // Where focus was when the menu opened, to hand back on the way out:
  // read while rendering, before the filter takes it.
  const [returnTo] = useState(() => document.activeElement)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const shown = matchCommands(commands, query)
  // A list that shrank under the selection keeps it on the last entry.
  const selected = Math.min(active, shown.length - 1)
  const optionId = (index: number) => `${listId}-${index}`
  useEffect(() => {
    document.getElementById(`${listId}-${selected}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [listId, selected])

  // Focus goes back before the command runs, so a command that moves
  // focus (into the room code, into chat) has the last word.
  const close = () => {
    onClose()
    if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus()
  }
  const run = (command: Command | undefined) => {
    if (!command) return
    close()
    command.run()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      // The filter is all there is to focus in here.
      event.preventDefault()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      run(shown[selected])
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (shown.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((selected + step + shown.length) % shown.length)
    }
  }

  return (
    <>
      <div className={styles.backdrop} onClick={close} data-testid="command-menu-backdrop" aria-hidden="true" />
      <div className={styles.menu} role="dialog" aria-modal="true" aria-label="Command menu" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          className={styles.filter}
          role="combobox"
          aria-label="Command"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={selected >= 0 ? optionId(selected) : undefined}
          placeholder="Type a command"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setActive(0)
          }}
        />
        <ul id={listId} className={styles.list} role="listbox" aria-label="Commands">
          {shown.map((command, index) => (
            <li
              key={command.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === selected}
              className={`${styles.option} ${index === selected ? styles.active : ''}`}
              onMouseMove={() => setActive(index)}
              onClick={() => run(command)}
            >
              <span className={styles.label}>{command.label}</span>
              {command.detail && <span className={styles.detail}>{command.detail}</span>}
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className={styles.empty}>No matching commands</p>}
      </div>
    </>
  )
}

export default CommandMenu
