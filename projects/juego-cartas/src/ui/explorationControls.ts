export interface ExplorationShortcutState {
  inCombat: boolean
  resultOpen: boolean
  collectionOpen: boolean
}

/** The same shortcut toggles the modal, but must never escape another mode. */
export function collectionShortcut(
  event: Pick<KeyboardEvent, 'key' | 'repeat' | 'ctrlKey' | 'altKey' | 'metaKey'>,
  state: ExplorationShortcutState,
  editing: boolean,
): 'open' | 'close' | null {
  if (state.inCombat || state.resultOpen || editing || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.key.toLowerCase() !== 'i') return null
  return state.collectionOpen ? 'close' : 'open'
}
