import { GOODS, GOODS_CATALOG, type GameState, type Good, type Inventory } from '../engine/model.js'

export interface CargoBreakdownItem {
  good: Good
  quantity: number
  unitLoadHalfUnits: number
  totalLoadHalfUnits: number
}

export function cargoBreakdown(inventory: Inventory): CargoBreakdownItem[] {
  return GOODS.flatMap(good => {
    const quantity = inventory[good]
    if (quantity <= 0) return []
    const unitLoadHalfUnits = GOODS_CATALOG[good].weightHalfUnits
    return [{ good, quantity, unitLoadHalfUnits, totalLoadHalfUnits: quantity * unitLoadHalfUnits }]
  })
}

export function familyBalanceTenths(state: GameState, familyId: string): number | undefined {
  return state.economy.families[familyId]?.moneyTenths
}

export function cargoOccupancyLabel(totalLoadHalfUnits: number): string {
  const amount = totalLoadHalfUnits % 2 === 0
    ? String(totalLoadHalfUnits / 2)
    : (totalLoadHalfUnits / 2).toLocaleString('es-ES', { maximumFractionDigits: 1 })
  return `Ocupa ${amount}`
}

type KeyboardTargetLike = {
  tagName?: string
  isContentEditable?: boolean
  getAttribute?: (name: string) => string | null
  closest?: (selector: string) => unknown
}

export type InventoryShortcutEvent = Pick<KeyboardEvent, 'key' | 'repeat' | 'altKey' | 'ctrlKey' | 'metaKey'> & { target: EventTarget | null }

export interface InventoryShortcutTransition {
  inventoryOpen: boolean
  closeOtherPanels: boolean
}

export function inventoryShortcutTransition(inventoryOpen: boolean, event: InventoryShortcutEvent): InventoryShortcutTransition | undefined {
  if (event.key.toLowerCase() !== 'i' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return undefined
  const target = event.target as KeyboardTargetLike | null
  if (!target) return { inventoryOpen: !inventoryOpen, closeOtherPanels: !inventoryOpen }
  if (target.isContentEditable || target.getAttribute?.('contenteditable') === 'true') return undefined
  const tagName = target.tagName?.toLowerCase()
  if (tagName && ['input', 'textarea', 'select'].includes(tagName)) return undefined
  if (target.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="slider"], [role="combobox"]')) return undefined
  return { inventoryOpen: !inventoryOpen, closeOtherPanels: !inventoryOpen }
}
