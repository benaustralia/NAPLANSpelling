import y3 from '@/data/y3-lc.json';
import y5 from '@/data/y5-lc.json';

export type LevelId = 'y3-lc' | 'y5-lc';
export type Level = typeof y3 | typeof y5;

export const ALL_LEVELS: ReadonlyArray<{ id: LevelId; data: Level; yearLabel: string }> = [
  { id: 'y3-lc', data: y3, yearLabel: 'Year 3' },
  { id: 'y5-lc', data: y5, yearLabel: 'Year 5' },
];

const BY_ID = new Map(ALL_LEVELS.map((l) => [l.id, l]));

export function getLevel(id: LevelId): Level {
  return BY_ID.get(id)!.data;
}

export function getYearLabel(id: LevelId): string {
  return BY_ID.get(id)!.yearLabel;
}
