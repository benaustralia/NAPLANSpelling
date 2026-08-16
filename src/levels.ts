import y3 from '@/data/y3-lc.json';
import y5 from '@/data/y5-lc.json';
import y7 from '@/data/y7-lc.json';
import y9 from '@/data/y9-lc.json';
import difficult from '@/data/difficult-lc.json';
import challenging from '@/data/challenging-lc.json';

export type LevelId = 'y3-lc' | 'y5-lc' | 'y7-lc' | 'y9-lc' | 'difficult-lc' | 'challenging-lc';
export type Level = typeof y3 | typeof y5 | typeof y7 | typeof y9 | typeof difficult | typeof challenging;

// Nav grouping — see src/components/Shell.tsx. Add new levels under an existing
// category (or a new one) here; the nav picks it up automatically.
export type LevelCategory = 'NAPLAN Years' | 'Advanced';

export const ALL_LEVELS: ReadonlyArray<{
  id: LevelId;
  data: Level;
  yearLabel: string;
  category: LevelCategory;
}> = [
  { id: 'y3-lc', data: y3, yearLabel: 'Year 3', category: 'NAPLAN Years' },
  { id: 'y5-lc', data: y5, yearLabel: 'Year 5', category: 'NAPLAN Years' },
  { id: 'y7-lc', data: y7, yearLabel: 'Year 7', category: 'NAPLAN Years' },
  { id: 'y9-lc', data: y9, yearLabel: 'Year 9', category: 'NAPLAN Years' },
  { id: 'difficult-lc', data: difficult, yearLabel: 'Difficult', category: 'Advanced' },
  { id: 'challenging-lc', data: challenging, yearLabel: 'Challenging', category: 'Advanced' },
];

const BY_ID = new Map(ALL_LEVELS.map((l) => [l.id, l]));

export function getLevel(id: LevelId): Level {
  return BY_ID.get(id)!.data;
}

export function getYearLabel(id: LevelId): string {
  return BY_ID.get(id)!.yearLabel;
}
