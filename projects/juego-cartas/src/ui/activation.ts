/** Native second/third clicks must not activate the next control after a rerender. */
export function activateOnce(event: Pick<MouseEvent, 'detail' | 'preventDefault'>, action: () => void): boolean {
  if (event.detail > 1) {
    event.preventDefault()
    return false
  }
  action()
  return true
}

/** Keeps a held Enter/Space from producing repeated default button clicks. */
export function preventRepeatedActivationKey(event: Pick<KeyboardEvent, 'key' | 'repeat' | 'preventDefault'>): void {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar')) event.preventDefault()
}
