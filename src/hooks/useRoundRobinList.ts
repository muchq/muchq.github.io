import { useCallback, useRef, useState } from 'react'

// A game's round robins in the room (MoonBase#1647): unknown until asked
// for, then kept current by each one heard. An answer to the list is built
// before it arrives, so a change heard while it is asked for may be newer
// than it: the list is asked for again once it lands.

export interface RoundRobinList<T> {
  roundRobins: T[] | null
  load: () => void
  heardList: (roundRobins: T[]) => void
  heardOne: (roundRobin: T) => void
  reset: () => void
}

export const useRoundRobinList = <T extends { roundRobinId: string }>(ask: () => void): RoundRobinList<T> => {
  const [roundRobins, setRoundRobins] = useState<T[] | null>(null)
  const known = useRef(false)
  const asked = useRef(false)
  const stale = useRef(false)

  const load = useCallback(() => {
    asked.current = true
    stale.current = false
    ask()
  }, [ask])
  const heardList = useCallback(
    (list: T[]) => {
      setRoundRobins(list)
      known.current = true
      asked.current = false
      if (stale.current) load()
    },
    [load]
  )
  const heardOne = useCallback(
    (heard: T) => {
      if (asked.current) stale.current = true
      if (!known.current) {
        if (!asked.current) load()
        return
      }
      setRoundRobins(held => {
        if (held === null) return held
        const at = held.findIndex(roundRobin => roundRobin.roundRobinId === heard.roundRobinId)
        return at === -1 ? [...held, heard] : held.map((roundRobin, i) => (i === at ? heard : roundRobin))
      })
    },
    [load]
  )
  const reset = useCallback(() => {
    setRoundRobins(null)
    known.current = false
    asked.current = false
    stale.current = false
  }, [])

  return { roundRobins, load, heardList, heardOne, reset }
}
