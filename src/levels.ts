import y3 from '@/data/y3-lc.json';
import y5 from '@/data/y5-lc.json';
import y7 from '@/data/y7-lc.json';
import y9 from '@/data/y9-lc.json';
import difficult from '@/data/difficult-lc.json';
import challenging from '@/data/challenging-lc.json';
import beeGreen from '@/data/bee-green-lc.json';
import beeOrange from '@/data/bee-orange-lc.json';
import beeRed from '@/data/bee-red-lc.json';

export type LevelId =
  | 'y3-lc'
  | 'y5-lc'
  | 'y7-lc'
  | 'y9-lc'
  | 'difficult-lc'
  | 'challenging-lc'
  | 'bee-green-lc'
  | 'bee-orange-lc'
  | 'bee-red-lc';
export type Level =
  | typeof y3
  | typeof y5
  | typeof y7
  | typeof y9
  | typeof difficult
  | typeof challenging
  | typeof beeGreen
  | typeof beeOrange
  | typeof beeRed;

// Nav grouping — see src/components/Shell.tsx. Add new levels under an existing
// category (or a new one) here; the nav picks it up automatically.
export type LevelCategory = 'NAPLAN Years' | 'Advanced' | 'Spelling Bee';

// 'dictation' = audio + paper/photo marking (src/routes/PartPlayer.tsx).
// 'typed' = Prime Minister's Spelling Bee-style self-check (src/routes/BeeQuiz.tsx):
// listen, type the word, instant tick/cross, no paper sheet or photo marking.
export type LevelInteraction = 'dictation' | 'typed';

export const ALL_LEVELS: ReadonlyArray<{
  id: LevelId;
  data: Level;
  yearLabel: string;
  category: LevelCategory;
  interaction: LevelInteraction;
}> = [
  { id: 'y3-lc', data: y3, yearLabel: 'Year 3', category: 'NAPLAN Years', interaction: 'dictation' },
  { id: 'y5-lc', data: y5, yearLabel: 'Year 5', category: 'NAPLAN Years', interaction: 'dictation' },
  { id: 'y7-lc', data: y7, yearLabel: 'Year 7', category: 'NAPLAN Years', interaction: 'dictation' },
  { id: 'y9-lc', data: y9, yearLabel: 'Year 9', category: 'NAPLAN Years', interaction: 'dictation' },
  { id: 'difficult-lc', data: difficult, yearLabel: 'Difficult', category: 'Advanced', interaction: 'dictation' },
  { id: 'challenging-lc', data: challenging, yearLabel: 'Challenging', category: 'Advanced', interaction: 'dictation' },
  { id: 'bee-green-lc', data: beeGreen, yearLabel: 'Bee Green (Y3–4)', category: 'Spelling Bee', interaction: 'typed' },
  { id: 'bee-orange-lc', data: beeOrange, yearLabel: 'Bee Orange (Y5–6)', category: 'Spelling Bee', interaction: 'typed' },
  { id: 'bee-red-lc', data: beeRed, yearLabel: 'Bee Red (Y7–8)', category: 'Spelling Bee', interaction: 'typed' },
];

const BY_ID = new Map(ALL_LEVELS.map((l) => [l.id, l]));

export function getLevel(id: LevelId): Level {
  return BY_ID.get(id)!.data;
}

export function getYearLabel(id: LevelId): string {
  return BY_ID.get(id)!.yearLabel;
}

export function getInteraction(id: LevelId): LevelInteraction {
  return BY_ID.get(id)!.interaction;
}
