import { useEffect, useRef, useState } from 'react'

export function GameNotice({ message, revision, expiresAt, onDismiss, onClear }: { message: string; revision: number; expiresAt?: number; onDismiss?: () => void; onClear?: () => void }) {
  const [dismissed, setDismissed] = useState(expiresAt !== undefined && expiresAt <= Date.now() ? revision : -1)
  const toast = useRef<HTMLDivElement>(null)
  const clearCallback = useRef(onClear)
  clearCallback.current = onClear
  const dismissedCallback = useRef(onDismiss)
  dismissedCallback.current = onDismiss
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => {
      const hadFocus = toast.current?.contains(document.activeElement) ?? false
      setDismissed(revision)
      clearCallback.current?.()
      if (hadFocus) dismissedCallback.current?.()
    }, expiresAt === undefined ? 5200 : Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [revision, expiresAt, message])
  return <div className="game-notice-region" aria-live="polite" aria-atomic="true">
    {message && dismissed !== revision && <div ref={toast} className="game-toast" key={revision}><span aria-hidden="true">◆</span><p>{message}</p><button type="button" onClick={() => { setDismissed(revision); clearCallback.current?.(); dismissedCallback.current?.() }} aria-label="Descartar aviso">×</button></div>}
  </div>
}
