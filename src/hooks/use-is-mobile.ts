import { useSyncExternalStore } from 'react'

/**
 * Phones and touch-first tablets: narrow screens, or a coarse pointer with no
 * hover. These get lighter animation fallbacks; desktop keeps the full effects.
 */
const query = '(max-width: 767px), (hover: none) and (pointer: coarse)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
