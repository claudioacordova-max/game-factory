/** Isolated V0.4B encounter data (M4). Not wired to the map, rewards or ACTIVE_CONTENT. */
export interface V04BEncounterData {
  /** Room number, also used as the encounter ID. */
  id: string
  roomName: string
  name: string
  mode: 'duel' | 'skirmish'
  /** Duels only. */
  opponentLife?: number
  /** Duels: ordered deck (first three form the opening hand). Skirmishes: empty. */
  deckIds: readonly string[]
  /** Skirmishes: pre-deployed field in order. Duels: empty. Pre-deployed units never fire entry effects. */
  fieldIds: readonly string[]
  /** Skirmish names are working labels, not approved canon. */
  tentativeName?: true
}

export const V04B_ENCOUNTERS: readonly V04BEncounterData[] = [
  { id: '02', roomName: 'Sala del Centinela', name: 'El Centinela', mode: 'duel', opponentLife: 12, deckIds: ['N05', 'N02', 'H01', 'A01', 'N05', 'N06'], fieldIds: [] },
  { id: '09', roomName: 'Corte de las Ratas', name: 'Señora de las Ratas', mode: 'duel', opponentLife: 10, deckIds: ['A02', 'N03', 'N02', 'A02', 'N03'], fieldIds: [] },
  { id: '06', roomName: 'Salón del Osario', name: 'El Prior', mode: 'duel', opponentLife: 20, deckIds: ['H01', 'N05', 'N02', 'H03', 'N03', 'H02', 'H01', 'N07', 'N04'], fieldIds: [] },
  { id: '18', roomName: 'Cámara del Sacrificio', name: 'El Devoto', mode: 'duel', opponentLife: 18, deckIds: ['N05', 'H01', 'H01', 'H03', 'N07', 'H02', 'H04', 'N03', 'N05'], fieldIds: [] },
  { id: '19', roomName: 'Salón del Trono', name: 'El Rey Esqueleto', mode: 'duel', opponentLife: 28, deckIds: ['N05', 'H01', 'N02', 'R02', 'N05', 'N03', 'R01', 'N04', 'R03', 'N08', 'N09', 'H02'], fieldIds: [] },
  { id: '04', roomName: 'Cámara de los Caídos', name: 'Los Caídos', mode: 'skirmish', deckIds: [], fieldIds: ['H01', 'N02', 'N05'], tentativeName: true },
  { id: '07', roomName: 'Primera Madriguera', name: 'Ratas de la Madriguera', mode: 'skirmish', deckIds: [], fieldIds: ['A02', 'A02'], tentativeName: true },
  { id: '08', roomName: 'Nido Profundo', name: 'Ratas del Nido', mode: 'skirmish', deckIds: [], fieldIds: ['A02', 'N03'], tentativeName: true },
  { id: '16', roomName: 'Foso de los Restos', name: 'Carroñeros del Foso', mode: 'skirmish', deckIds: [], fieldIds: ['N05', 'N06', 'N07'], tentativeName: true },
  { id: '17', roomName: 'Cámara de las Cadenas', name: 'Los Encadenados', mode: 'skirmish', deckIds: [], fieldIds: ['H01', 'N04', 'R03'], tentativeName: true },
]
