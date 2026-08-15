declare module '@/data/bee-orange-lc.json' {
  export type Word = {
    index: number;
    word: string;
    definition: string;
    sentence: string;
  };
  export type Part = {
    part: number;
    start: number;
    end: number;
    audio: string;
    duration: number | null;
    questionStarts: number[] | null;
  };
  export type WordList = {
    id: 'bee-orange-lc';
    title: string;
    wordsPerPart: number;
    pauseSec: number;
    parts: Part[];
    words: Word[];
  };
  const data: WordList;
  export default data;
}
