export interface BoardRect { left: number; top: number; width: number; height: number }
export interface BoardPoint { x: number; y: number }
export interface BoardLink { from: string; to: string; kind: 'block' | 'target'; order?: number }
export interface BoardConnection { from: BoardPoint; to: BoardPoint }

function validRect(rect: BoardRect): boolean {
  return [rect.left, rect.top, rect.width, rect.height, rect.left + rect.width, rect.top + rect.height].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0
}

/** Anchor only on the visible portion of a card; a fully hidden card has no anchor. */
export function boardCardAnchor(
  board: BoardRect, card: BoardRect, row: BoardRect, edge: 'top' | 'bottom',
): BoardPoint | null {
  if (![board, card, row].every(validRect)) return null
  const left = Math.max(board.left, card.left, row.left)
  const right = Math.min(board.left + board.width, card.left + card.width, row.left + row.width)
  const top = Math.max(board.top, card.top, row.top)
  const bottom = Math.min(board.top + board.height, card.top + card.height, row.top + row.height)
  if (left >= right || top >= bottom) return null
  return {
    x: Math.max(left, Math.min(right, card.left + card.width / 2)) - board.left,
    y: Math.max(top, Math.min(bottom, edge === 'top' ? card.top : card.top + card.height)) - board.top,
  }
}

export function boardConnection(
  board: BoardRect, ownCard: BoardRect, ownRow: BoardRect, enemyCard: BoardRect, enemyRow: BoardRect,
): BoardConnection | null {
  const from = boardCardAnchor(board, ownCard, ownRow, 'top')
  const to = boardCardAnchor(board, enemyCard, enemyRow, 'bottom')
  return from && to ? { from, to } : null
}
