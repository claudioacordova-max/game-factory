import type { CreatureCard, GameSession } from '../engine/index.js'
import { V04B_CARD_TYPES } from '../engine/index.js'
import { V04BDeckPanel, V04BGrimoire } from './Grimoire.js'
import type { GrimoireTab } from './Grimoire.js'
import type { GrimoireFilters } from './grimoireModel.js'

type Props = { session: GameSession; cardTypes?: readonly CreatureCard[]; onChangeDeck: (copyId: string, included: boolean) => void }

export function DeckPanel({ session, cardTypes = V04B_CARD_TYPES, onChangeDeck }: Props) {
  return <V04BDeckPanel session={session} cardTypes={cardTypes} onChangeDeck={onChangeDeck} />
}

export function CollectionView({ session, cardTypes = V04B_CARD_TYPES, onChangeDeck, onReinvoke, onReinvokeAll, initialTab, initialFilters, initialFiltersOpen }: Props & {
  onReinvoke: (cardId: string) => void
  /** initial* exist for tests and inspection fixtures. */
  onReinvokeAll?: () => void; initialTab?: GrimoireTab; initialFilters?: GrimoireFilters; initialFiltersOpen?: boolean
}) {
  return <V04BGrimoire session={session} cardTypes={cardTypes} onChangeDeck={onChangeDeck} onReinvoke={onReinvoke} onReinvokeAll={onReinvokeAll} initialTab={initialTab} initialFilters={initialFilters} initialFiltersOpen={initialFiltersOpen} />
}
