import type { ReactNode } from 'react'

type IconName = 'mana' | 'heart' | 'sword' | 'shield' | 'skull' | 'cards' | 'gate' | 'lock' | 'check' | 'arrow' | 'orb'
const paths: Record<IconName, ReactNode> = {
  mana: <><path d="m12 2 7 10-7 10-7-10Z"/><path d="m5 12 7 4 7-4M12 2v20"/></>,
  heart: <path d="M20 5c-3-3-7-1-8 1-2-3-6-4-9-1-4 5 3 11 9 16 6-5 12-11 8-16Z"/>,
  sword: <><path d="m17 2 5 0 0 5-13 13-5-5Z"/><path d="m3 14 7 7M2 22l4-4M8 16 20 4"/></>,
  shield: <><path d="m12 2 9 4-2 11-7 5-7-5L3 6Z"/><path d="M12 6v12"/></>,
  skull: <><path d="M5 16c-6-12 5-18 13-12 5 4 3 10 1 12l-3 1v4H8v-4Z"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/><path d="m10 16 2-3 2 3M12 18v3"/></>,
  cards: <><path d="M7 3h13v18H7Z"/><path d="m4 5-2 1 2 15M11 8h5M11 12h5M11 16h3"/></>,
  gate: <><path d="M3 22V10a9 9 0 0 1 18 0v12M7 22V11a5 5 0 0 1 10 0v11M1 22h22M3 11h4M17 11h4M5 5l3 3M16 8l3-3M12 1v5"/></>,
  lock: <><rect x="5" y="10" width="14" height="12" rx="1"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  arrow: <path d="M3 12h18m-6-6 6 6-6 6"/>,
  orb: <><circle cx="12" cy="11" r="7"/><path d="M8 9a5 5 0 0 1 4-3M7 20h10M9 18l-1 2m8-2 1 2"/></>,
}
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function emblemFor(cardId: string): ReactNode {
  const id = cardId
  if (/rat/.test(id)) return <><path d="M22 67c-10-8-14-23 2-25 6-22 23-18 31-9 17-9 25 5 17 19l13 12-17 9H29c-5 18-22 13-16 4"/><path d="m71 62 20-4m-20 9 21 7M35 34c-8-8-17 2-10 10M47 34c-2-11 12-15 13-3"/><circle cx="64" cy="53" r="2"/></>
  if (/skeleton/.test(id)) return <><path d="M30 53c-16-37 51-45 42-2l-9 8v14H37V59Z"/><circle cx="41" cy="42" r="6"/><circle cx="61" cy="42" r="6"/><path d="m46 57 5-9 5 9M46 65v9m10-9v9M23 83l55-5M25 78l51 9"/></>
  if (/basilisk/.test(id)) return <><path d="M35 87c-28-15-15-34 13-29 26 5 33-16 19-22-12-5-27 3-20 12 5 6 16 0 8-4"/><path d="m65 35-5-13 13 5 12 7-10 12-8-2M83 35l9-4M75 30l3-8"/><circle cx="73" cy="34" r="1.5"/><path d="m40 61-11-9m15 20-15 4"/></>
  if (/hawk|bat/.test(id)) return <><path d="m50 35-8 15-31-17 10 26 22 12 7 17 8-18 20-11 12-27-31 18Z"/><path d="m42 50 8 8 9-8M50 58v22M22 43l15 14m42-14L64 57"/><path d="m47 35 3-11 5 13"/></>
  if (/imp|cultist/.test(id)) return <><path d="m30 38-5-20 21 18h10l20-18-5 22 3 22-24 24-25-24Z"/><path d="m33 52 12 6m11 0 12-7M40 72l10-5 10 5M50 41v18"/></>
  if (/moss/.test(id)) return <><path d="M50 89V51M50 65C18 72 17 41 18 35c28-3 36 13 32 30ZM51 52C48 21 75 15 83 17c3 28-13 41-32 35Z"/><path d="m29 46 20 19m3-14 21-23M31 88h39"/></>
  if (/ogre|boar/.test(id)) return <><path d="m30 32 20-10 22 10 8 29-15 23H35L20 61Z"/><path d="m29 57 12-7m18 0 12 7M36 68l-3-13m31 13 4-13M40 75h20M50 33v18"/></>
  if (/vanguard|raider|scout/.test(id)) return <><path d="m50 14 14 20-8 13v30l8 10H36l8-10V47l-8-13Z"/><path d="M50 22v55M30 57h40M35 62h30"/><path d="m24 37-8 13 8 20m52-33 8 13-8 20"/></>
  return <><path d="m50 15 25 15-3 35-22 22-22-22-3-35Z"/><path d="m34 39 16-9 16 9-3 23-13 13-13-13ZM50 31v43M34 44h32"/><path d="m50 7 0 8M16 27l9 4m50 0 9-4"/></>
}
/** Small bone: a shaft with two knobbed ends (used by V0.4B portraits). */
function bone(x1: number, y1: number, x2: number, y2: number): ReactNode {
  return <><path d={`M${x1} ${y1} ${x2} ${y2}`}/><circle cx={x1 - 2} cy={y1 + 1} r="2.6"/><circle cx={x1 + 1} cy={y1 + 3} r="2.6"/><circle cx={x2 + 2} cy={y2 - 1} r="2.6"/><circle cx={x2 - 1} cy={y2 - 3} r="2.6"/></>
}

/**
 * UI-1: one recognisable crypt illustration per V0.4B card type (same line style as the shared emblems).
 * Tones follow the card group: aggro ember, ramp rune, healing shade, neutral stone. Other ids fall back to a generic portrait.
 */
const V04B_PORTRAITS: Record<string, { tone: string; art: ReactNode }> = {
  // Diablillo furioso: horned angry face with fangs and a forked tail.
  A01: { tone: 'ember', art: <><path d="M32 44c0-14 8-22 18-22s18 8 18 22c0 14-8 26-18 26S32 58 32 44Z"/><path d="M35 33 23 14l17 11M65 33l12-19-17 11"/><path d="m38 42 9 4m15-4-9 4"/><circle cx="43" cy="50" r="2"/><circle cx="57" cy="50" r="2"/><path d="M40 59c6 5 14 5 20 0m-16 1 2 5 2-4m8-1-2 5-2-4M50 70c0 9 9 14 19 10m0 0 6-7m-6 7 8 1"/></> },
  // Rata de la madriguera: the classic burrow rat in profile.
  A02: { tone: 'ember', art: emblemFor('rat') },
  // Diablillo de las brasas: a living flame with an imp face and floating embers.
  A03: { tone: 'ember', art: <><path d="M50 13c4 12 16 15 14 31 8-4 10-10 10-14 8 14 6 34-8 44-8 6-24 6-32 0-14-10-16-28-6-42 0 6 4 10 8 12-2-14 8-20 14-31Z"/><path d="m41 53 7 3m11-3-7 3M43 65c5 3 9 3 14 0"/><circle cx="23" cy="30" r="1.8"/><circle cx="79" cy="25" r="1.8"/><circle cx="84" cy="58" r="1.8"/></> },
  // Señor de las Ratas: crowned rat head, front view.
  A04: { tone: 'ember', art: <><path d="m36 27 4-13 6 8 4-10 4 10 6-8 4 13Z"/><path d="M30 46c0-12 9-19 20-19s20 7 20 19c0 10-8 22-20 28-12-6-20-18-20-28Z"/><path d="M33 38c-12-4-17 8-8 15m42-15c12-4 17 8 8 15"/><circle cx="42" cy="46" r="2.5"/><circle cx="58" cy="46" r="2.5"/><path d="M47 65h6m-9-1-16-2m16 5-15 5m27-8 16-2m-16 5 15 5M48 70v4m4-4v4"/></> },
  // Runa inestable: cracked rune stone shedding sparks.
  R01: { tone: 'rune', art: <><path d="M50 14 76 50 50 86 24 50Z"/><path d="M44 34v32m0-26 12 8-12 8"/><path d="m59 29-6 12 8 6-6 12 6 10"/><path d="m80 26 6-6m-2 16h8M16 64l-6 6m4-18H6"/></> },
  // Runa viviente: round rune stone with a sprouting seedling.
  R02: { tone: 'rune', art: <><circle cx="50" cy="60" r="22"/><path d="M50 48v24m-8-18 8-6 8 6m-16 12 8 6 8-6"/><path d="M50 38V25m0 6c-10-2-14-10-12-16 8 0 12 6 12 16Zm0-4c8-2 12-8 10-14-8 0-10 6-10 14Z"/></> },
  // Gólem de piedra: blocky stone body with a cracked chest.
  R03: { tone: 'rune', art: <><path d="M40 17h20v16H40Z"/><path d="M45 25h3m4 0h3"/><path d="M30 36h40l4 26H26Z"/><path d="m26 38-10 6 2 24h10l-2-18m48-12 10 6-2 24H72l2-18"/><path d="M34 62v22h12V67h8v17h12V62"/><path d="m44 43 6 6-4 7"/></> },
  // Titán rúnico: crested giant with a glowing chest rune and two shield arcs.
  R04: { tone: 'rune', art: <><path d="m42 21 8-9 8 9v12H42Z"/><path d="M26 36h48l-8 34H34Z"/><path d="M50 42v20m-7-16 14 12m0-12L43 58"/><path d="m37 70-2 15h11l2-11h4l2 11h11l-2-15"/><path d="M15 30c-8 16-8 34 0 48m6-44c-6 12-6 28 0 40m64-44c8 16 8 34 0 48m-6-44c6 12 6 28 0 40"/></> },
  // Alzado de la Sombra: a hand rising from the grave through mist.
  H01: { tone: 'shade', art: <><path d="M14 80h72M22 86h56"/><path d="M44 80V54l-7-16c-2-4 4-7 6-3l5 10V28c0-4 6-4 6 0v14V24c0-4 6-4 6 0v18-12c0-4 6-4 6 0v24l-4 14v12"/><path d="M20 70c6-6 12 2 18-4m24 2c6-6 12 2 18-4"/></> },
  // Acólito de la Sombra: hooded acolyte holding a candle.
  H02: { tone: 'shade', art: <><path d="M50 14c-14 0-20 14-20 26 0 14-6 30-12 44h64c-6-14-12-30-12-44 0-12-6-26-20-26Z"/><path d="M40 40c2-9 18-9 20 0-2 10-18 10-20 0Z"/><path d="M44 40h3m6 0h3"/><path d="M46 61h8v14h-8Zm4 0v-5m0-4c-3-4 0-8 0-8s3 4 0 8"/></> },
  // Liche del grimorio: crowned skull above an open grimoire.
  H03: { tone: 'shade', art: <><path d="m36 22 4-10 6 7 4-9 4 9 6-7 4 10Z"/><path d="M36 36c0-8 6-14 14-14s14 6 14 14c0 6-2 10-6 12v6H42v-6c-4-2-6-6-6-12Z"/><circle cx="44" cy="37" r="3"/><circle cx="56" cy="37" r="3"/><path d="M18 66c10-4 22-4 32 4 10-8 22-8 32-4v18c-10-4-22-4-32 4-10-8-22-8-32-4Zm32 4v18M26 73c6-1 12 0 18 2m12-1c6-2 12-3 18-2"/></> },
  // Ídolo de la Sombra: stone idol on an altar marked with three sacrifices.
  H04: { tone: 'shade', art: <><path d="M36 14h28l4 30H32Z"/><path d="M40 26h8m4 0h8m-16 10h12"/><path d="M38 44h24l-4 18H42Z"/><path d="M28 62h44v8H28Zm4 8v14h36V70M22 86h56"/><path d="M42 75v5m8-5v5m8-5v5"/></> },
  // Urna maldita: lidded urn with an eye and curse swirls.
  N01: { tone: 'stone', art: <><path d="M46 13a4 4 0 0 1 8 0M40 17h20"/><path d="M41 20h18l-2 6c14 6 18 22 12 36-4 10-12 16-19 16s-15-6-19-16c-6-14-2-30 12-36Z"/><path d="M38 85h24l-4-7H42Z"/><path d="M42 50c4-4 12-4 16 0-4 4-12 4-16 0Z"/><circle cx="50" cy="50" r="1.5"/><path d="M20 40c-6 6 2 14 8 8m52-8c6 6-2 14-8 8"/></> },
  // Limo de huesos: a slime blob with bones jutting out.
  N02: { tone: 'stone', art: <><path d="M18 80c-4-12 2-24 12-28 2-14 14-22 26-18 12 2 18 12 18 22 8 4 12 14 8 24Z"/>{bone(34, 47, 25, 30)}{bone(64, 43, 73, 26)}<circle cx="42" cy="63" r="3"/><circle cx="57" cy="60" r="2"/><path d="M30 80v6m30-6v5"/></> },
  // Rata carroñera: hunched scavenger rat carrying a bone.
  N03: { tone: 'stone', art: <><path d="M78 72c6-16-4-32-22-32-12 0-20 6-24 14l-12 6 12 4c4 6 12 8 22 8h24"/><path d="M48 43c-2-10 10-12 12-4"/><circle cx="35" cy="54" r="2"/><path d="M78 72c8 2 12 10 6 16M46 76l-2 8m20-8 2 8"/>{bone(17, 67, 40, 55)}</> },
  // Caballero no muerto: closed helm in front of a diagonal sword.
  N04: { tone: 'stone', art: <><path d="M18 84 72 22m-10 0 12 12"/><circle cx="16" cy="86" r="3"/><path d="M32 48c0-16 8-26 18-26s18 10 18 26v20H32Z"/><path d="M36 46h28M50 46v20m-8-10h3m10 0h3"/><path d="M50 22c4-8 12-10 18-8"/></> },
  // Esqueleto: the classic crypt skeleton.
  N05: { tone: 'stone', art: emblemFor('skeleton') },
  // Ghoul: hunched figure with hollow eyes and long claws.
  N06: { tone: 'stone', art: <><path d="M38 30c0-8 6-12 12-12s12 4 12 12-4 14-12 14-12-6-12-14Z"/><path d="m43 29 4 2m10-2-4 2m-9 7 2 2 2-2 2 2 2-2 2 2 2-2"/><path d="M36 44c-10 6-14 18-12 32m40-32c10 6 14 18 12 32M36 76h28"/><path d="M30 52 16 66m0 0-4 2m4-2-2 4m2-4v-5m54-13 14 14m0 0 4 2m-4-2 2 4m-2-4v-5"/></> },
  // Araña de cripta: spider hanging from its thread.
  N07: { tone: 'stone', art: <><path d="M50 31V12"/><circle cx="50" cy="38" r="7"/><circle cx="50" cy="59" r="14"/><path d="M50 51v14m-5-7h10"/><path d="M44 42 28 30l-8 12m22 6-20-4-8 14m26-2-20 6-4 16m26-14-14 12 2 12m24-46 16-12 8 12m-22 6 20-4 8 14m-26-2 20 6 4 16m-26-14 14 12-2 12"/></> },
  // Abominación: a stitched bulk with mismatched eyes.
  N08: { tone: 'stone', art: <><path d="M22 78c-8-18-2-40 14-48 6-8 22-10 30-2 14 6 20 22 16 38-2 6-4 10-10 12Z"/><path d="m40 34 20 30m-16-24 4-3m0 9 4-3m0 9 4-3m0 9 4-3"/><circle cx="34" cy="50" r="3"/><circle cx="67" cy="44" r="4"/><circle cx="62" cy="69" r="2"/><path d="M28 66c4 4 10 4 14 0m36-4 10 10M20 82h62"/></> },
  // Demonio: great horns and bat wings.
  N09: { tone: 'stone', art: <><path d="M38 46C24 30 12 32 8 44c6-2 10 0 12 6 4-4 10-2 12 4 4-4 8-2 10 2m20-10c14-16 26-14 30-2-6-2-10 0-12 6-4-4-10-2-12 4-4-4-8-2-10 2"/><path d="M38 44c0-10 6-16 12-16s12 6 12 16c0 12-6 22-12 26-6-4-12-14-12-26Z"/><path d="M40 34c-6-8-6-18 0-24 0 8 4 14 8 18m12 6c6-8 6-18 0-24 0 8-4 14-8 18"/><path d="m43 44 5 2m9-2-5 2m-7 12c3 2 7 2 10 0M44 70l-4 15h20l-4-15"/></> },
}

/** UI-1 test hook: the V0.4B ids that have their own illustration. */
export const V04B_PORTRAIT_IDS: readonly string[] = Object.keys(V04B_PORTRAITS)

export function CreaturePortrait({ cardId, className = '' }: { cardId: string; className?: string }) {
  const v04b = V04B_PORTRAITS[cardId]
  if (v04b) return <span className={`creature-portrait portrait-${v04b.tone} ${className}`} aria-hidden="true" data-portrait={cardId} draggable={false}><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle className="portrait-ring" cx="50" cy="50" r="39"/>{v04b.art}<text x="50" y="97" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10">{cardId}</text></svg></span>
  const emblem = cardId
  const tone = cardId === 'crypt-echo' ? 'echo' : /imp|cultist|ogre|boar/.test(emblem) ? 'ember' : /basilisk|moss/.test(emblem) ? 'moss' : /hawk|bat/.test(emblem) ? 'sky' : 'stone'
  return <span className={`creature-portrait portrait-${tone} ${className}`} aria-hidden="true" draggable={false}><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle className="portrait-ring" cx="50" cy="50" r="39"/>{emblemFor(cardId)}<text x="50" y="97" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10">{cardId === 'crypt-echo' ? 'ECO' : cardId}</text></svg></span>
}
