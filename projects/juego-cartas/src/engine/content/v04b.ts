import type { CreatureCard, PendingAbility } from '../types.js'

/** M1 data only: effects are described, never executed by this catalogue. */
const pending = (id: string, description: string, milestone: 2 | 3): PendingAbility => ({
  id, description, implementation: milestone === 2 ? 'pending-m2' : 'pending-m3',
})
function card(id: string, name: string, group: CreatureCard['group'], attack: number, maxHealth: number,
  mana: number, sacrifices: number, reinvokeCost = 1, special = false, seed = false,
  abilities: PendingAbility[] = []): CreatureCard {
  return { id, name, group, attack, maxHealth, cost: { mana, sacrifices }, reinvokeCost,
    maxCopies: special ? 1 : 2, special, seed, abilities }
}

export const V04B_CARD_TYPES: readonly CreatureCard[] = [
  card('A01', 'Diablillo furioso', 'aggro', 2, 1, 0, 0, 0, false, true),
  card('A02', 'Rata de la madriguera', 'aggro', 1, 1, 0, 0, 1, false, false, [pending('summon-rat', 'Al invocarse, crea una ficha aliada temporal de rata 1/1 después de pagar. Puede atacar, bloquear y pagar sacrificios generales; no persiste ni paga H04.', 2)]),
  card('A03', 'Diablillo de las brasas', 'aggro', 2, 1, 1, 0, 1, false, false, [pending('entry-damage', 'Al invocar: en duelo, 2 de daño al invocador rival; en escaramuza, 1 de daño a una criatura enemiga elegida.', 3)]),
  card('A04', 'Señor de las Ratas', 'aggro', 1, 2, 1, 0, 1, true, false, [pending('summon-rat', 'Al invocarse, crea una ficha aliada temporal de rata 1/1 después de pagar. Puede atacar, bloquear y pagar sacrificios generales; no persiste ni paga H04.', 2), pending('attack-allies', 'Al atacar, gana +1 ATQ por cada otra aliada atacante, solo durante ese ataque. No se aplica al defender ni persiste.', 3)]),
  card('R01', 'Runa inestable', 'ramp', 1, 1, 0, 0, 0, false, true, [pending('temporary-mana', 'Activación voluntaria en fase principal propia: sacrificarse para obtener inmediatamente 2 manás temporales, que expiran al terminar esa fase. Morir o pagar otro sacrificio no activa el efecto.', 2)]),
  card('R02', 'Runa viviente', 'ramp', 1, 1, 0, 0, 1, false, false, [pending('renewable-mana', 'Mientras viva en campo, aporta +1 al maná renovable al inicio de futuros turnos propios; acumulable. No da maná inmediato al entrar.', 2)]),
  card('R03', 'Gólem de piedra', 'ramp', 3, 3, 2, 0, 1, false, false, [pending('shield-1', 'Escudo 1: una carga anula todo daño positivo agrupado destinado a esta criatura en una resolución. Daño cero no consume carga; destruir ignora escudos. Se restablece en otro combate sin sanar heridas.', 3)]),
  card('R04', 'Titán rúnico', 'ramp', 4, 5, 4, 0, 5, true, false, [pending('shield-2', 'Escudo 2: cada carga anula todo daño positivo agrupado destinado a esta criatura en una resolución; se requieren dos resoluciones positivas distintas. Daño cero no consume carga; destruir ignora escudos. Se restablece en otro combate sin sanar heridas.', 3)]),
  card('H01', 'Alzado de la Sombra', 'healing', 0, 3, 0, 0, 0, false, true),
  card('H02', 'Acólito de la Sombra', 'healing', 1, 4, 1, 0, 1, false, false, [pending('main-healing', 'Al comenzar la fase principal propia, sana hasta 2 de salud a otra criatura aliada, sin superar su máximo. Selección y orden pendientes.', 3)]),
  card('H03', 'Liche del grimorio', 'healing', 1, 3, 0, 0, 1, false, false, [pending('entry-healing-draw', 'Al entrar, sana hasta 1 de salud a otra aliada, sin superar su máximo; solo si sanó al menos 1 efectivamente, roba 1 carta si queda mazo. Selección y orden pendientes.', 3)]),
  card('H04', 'Ídolo de la Sombra', 'healing', 0, 1, 0, 3, 5, true, false, [pending('ritual', 'Sacrifica exactamente tres criaturas reales propias distintas, vivas y en campo, nunca fichas. X es la suma de su salud actual antes del pago: entra X/(1+X) solo en ese combate. Los materiales se pierden. Si sobrevive, vuelve a 0/1 con salud 1 sin bono ni heridas rituales; si muere se pierde. Confirmación final pendiente.', 3)]),
  card('N01', 'Urna maldita', 'neutral', 0, 1, 1, 0, 1, false, false, [pending('destroy', 'Activación voluntaria en fase principal propia: sacrificarse para destruir una criatura enemiga elegida en campo, ignorando escudos. Sin objetivo válido no se paga; no se activa al entrar, morir ni pagar otro sacrificio.', 2)]),
  card('N02', 'Limo de huesos', 'neutral', 2, 2, 1, 0),
  card('N03', 'Rata carroñera', 'neutral', 3, 2, 0, 1),
  card('N04', 'Caballero no muerto', 'neutral', 4, 3, 1, 1),
  card('N05', 'Esqueleto', 'neutral', 1, 1, 0, 0),
  card('N06', 'Ghoul', 'neutral', 3, 1, 1, 0),
  card('N07', 'Araña de cripta', 'neutral', 2, 3, 0, 1),
  card('N08', 'Abominación', 'neutral', 4, 4, 0, 2),
  card('N09', 'Demonio', 'neutral', 5, 3, 0, 2),
]

export const V04B_INITIAL_CARD_IDS: readonly string[] = ['A01', 'A01', 'A02', 'R01', 'H01', 'N02', 'N05', 'N06']
