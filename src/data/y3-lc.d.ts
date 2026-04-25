declare module '@/data/y3-lc.json' {
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
    /** One timestamp per word in this part. Word 1 = 0; word N+1 = silence_end
     *  of gap N. Null when silencedetect didn't return the expected count
     *  (player should fall back to disabling prev/next). */
    questionStarts: number[] | null;
  };
  export type WordList = {
    id: 'y3-lc';
    title: string;
    wordsPerPart: number;
    pauseSec: number;
    parts: Part[];
    words: Word[];
  };
  const data: WordList;
  export default data;
}
