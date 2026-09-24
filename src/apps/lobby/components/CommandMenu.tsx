import { useEffect, useId, useImperativeHandle, useRef, useState, useSyncExternalStore, type Ref } from 'react'
import { bindCommandHotkey } from '@/utils/hotkeys'
import { matchCommands, type Command, type CommandRegistry } from '@/utils/commandRegistry'
import styles from './CommandMenu.module.css'

// The world's commands by name, over the world, which keeps rendering
// behind it. Escape opens it; typing filters, the arrows move, Enter runs
// and Escape leaves. Every entry is a verb that runs and closes the menu.
// A phone, with no Escape key, opens it through the handle.

export interface CommandMenuHandle {
  open: () => void
}

export interface CommandMenuProps {
  registry: CommandRegistry
  ref?: Ref<CommandMenuHandle>
}

const CommandMenu = ({ registry, ref }: CommandMenuProps) => {
  const [open, setOpen] = useState(false)
  useEffect(() => bindCommandHotkey(document, () => setOpen(true)), [])
  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }), [])
  return open ? <CommandDialog registry={registry} onClose={() => setOpen(false)} /> : null
}

// Mounted only while open, so every opening starts from an empty filter
// and the first entry.
const CommandDialog = ({ registry, onClose }: { registry: CommandRegistry; onClose: () => void }) => {
  const commands = useSyncExternalStore(registry.subscribe, registry.list)
  const [query, setQuery] = useState('')
  // The selection is a command, not a row: entries that arrive above it
  // leave it where it is. The row is kept for when the command goes.
  const [active, setActive] = useState<{ id: string | null; index: number }>({ id: null, index: 0 })
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  // Where focus was when the menu opened, to hand back on the way out:
  // read while rendering, before the filter takes it.
  const [returnTo] = useState(() => document.activeElement)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const shown = matchCommands(commands, query)
  const kept = active.id === null ? -1 : shown.findIndex(command => command.id === active.id)
  // Gone, it falls to the row it stood on, or the last one left.
  const selected = kept >= 0 ? kept : Math.min(active.index, shown.length - 1)
  const select = (index: number) => setActive({ id: shown[index]?.id ?? null, index })
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
    // Mid-composition the keys are the input method's: Enter commits the
    // text, the arrows pick a candidate, Escape cancels. 229 is the key
    // code some browsers give the key that ends a composition.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
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
      select((selected + step + shown.length) % shown.length)
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
            setActive({ id: null, index: 0 })
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
              onMouseMove={() => select(index)}
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
