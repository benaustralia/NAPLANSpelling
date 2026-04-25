declare module '@/data/y5-lc.json' {
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
  };
  export type WordList = {
    id: 'y5-lc';
    title: string;
    wordsPerPart: number;
    parts: Part[];
    words: Word[];
  };
  const data: WordList;
  export default data;
}
