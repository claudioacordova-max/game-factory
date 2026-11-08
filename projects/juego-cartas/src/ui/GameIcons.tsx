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

const emblems: Record<string, string> = {
  P01: 'rat', P02: 'imp', P03: 'skeleton', P04: 'moss', P05: 'scout', P06: 'raider',
  P07: 'guard', P08: 'hawk', P09: 'cultist', P10: 'boar', P11: 'vanguard', P12: 'guard',
  P13: 'ogre', P14: 'raider', P15: 'guard', P16: 'basilisk', P17: 'ogre', P18: 'bat',
  E01: 'rat', E02: 'rat', E03: 'rat', E04: 'rat', E05: 'rat', E06: 'skeleton',
  E07: 'scout', E08: 'cultist', E09: 'cultist', E10: 'guard', E11: 'ogre',
  E12: 'imp', E13: 'vanguard', E14: 'raider',
}
function emblemFor(cardId: string): ReactNode {
  const id = emblems[cardId] ?? cardId
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
export function CreaturePortrait({ cardId, className = '' }: { cardId: string; className?: string }) {
  const emblem = emblems[cardId] ?? cardId
  const tone = cardId === 'crypt-echo' ? 'echo' : /imp|cultist|ogre|boar/.test(emblem) ? 'ember' : /basilisk|moss/.test(emblem) ? 'moss' : /hawk|bat/.test(emblem) ? 'sky' : 'stone'
  return <span className={`creature-portrait portrait-${tone} ${className}`} aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle className="portrait-ring" cx="50" cy="50" r="39"/>{emblemFor(cardId)}<text x="50" y="97" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10">{cardId === 'crypt-echo' ? 'ECO' : cardId}</text></svg></span>
}
