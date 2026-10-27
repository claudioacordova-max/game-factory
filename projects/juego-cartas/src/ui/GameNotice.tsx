import { useEffect, useState } from 'react'

export function GameNotice({ message, revision }: { message: string; revision: number }) {
  const [dismissed, setDismissed] = useState(-1)
  useEffect(() => {
    const timer = window.setTimeout(() => setDismissed(revision), 5200)
    return () => window.clearTimeout(timer)
  }, [revision])
  return <div className="game-notice-region" aria-live="polite" aria-atomic="true">
    {message && dismissed !== revision && <div className="game-toast" key={revision}><span aria-hidden="true">◆</span><p>{message}</p><button type="button" onClick={() => setDismissed(revision)} aria-label="Descartar aviso">×</button></div>}
  </div>
}
