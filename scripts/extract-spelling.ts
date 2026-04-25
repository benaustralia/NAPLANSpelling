/**
 * Extract NAPLAN LC spelling words (questions 1-25) from ACARA past-paper
 * answer-key PDFs in source-pdfs/y{7,9}/. Writes a TSV to stdout: year, q#,
 * word.  pdftotext -layout outputs each row with 4 answer columns; the LC
 * column is always the last token on the question line, BUT some answers
 * wrap to a continuation line above (when the word is long).  We re-merge
 * those continuation lines into the question they belong to.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DIRS = ['source-pdfs/y7', 'source-pdfs/y9'];

type Row = { year: string; q: number; word: string };

function pdftotext(path: string): string {
  const r = spawnSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf-8' });
  if (r.status !== 0) throw new Error(`pdftotext failed: ${r.stderr}`);
  return r.stdout;
}

function extractLC(text: string): Map<number, string> {
  const lines = text.split('\n');
  // For lines that start with a question number 1..50 and have 4 answer cols,
  // the LC answer is the last whitespace-separated token (or two if comma'd).
  // Continuation lines (e.g. "recognise," ahead of the Q20 row) appear ABOVE
  // the question line and indented to roughly the LC column.  We track the
  // most-recent unattached continuation token and prepend it to the next
  // question's word.
  const out = new Map<number, string>();
  let pendingContinuation: string | null = null;
  // For multi-line LC answers where the wrap appears AFTER the question row
  // (e.g. Y7 2011 q20: "knuckle or" above, "5.4" on the q-row, "ankle" below),
  // remember the last q-row that didn't get a word so the next continuation
  // can attach to it.
  let lastUnfilled: number | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { pendingContinuation = null; continue; }

    // Question rows start with whitespace + 1-2 digit number.
    const qMatch = /^\s*(\d{1,2})\s+(.*)$/.exec(line);
    if (qMatch) {
      const q = Number(qMatch[1]);
      if (q >= 1 && q <= 25) {
        const tokens = qMatch[2].trim().split(/\s+/);
        const last = tokens[tokens.length - 1];
        const lastLooksLikeWord = /^[a-z]+(?:[,'-][a-z]+)*$/i.test(last) && last.length >= 2;
        let word: string | null = lastLooksLikeWord ? last : null;
        // Multi-line LC answers (e.g. "knuckle or\nankle" on Y7 2011 q20) leave
        // the q-row with only numeric tokens — fall through to the pending
        // continuation that arrived above.
        if (pendingContinuation) {
          if (!word) word = pendingContinuation;
          else word = pendingContinuation.length > word.length ? pendingContinuation : word;
          pendingContinuation = null;
        }
        if (word) {
          out.set(q, word.replace(/[,.;]+$/, ''));
          lastUnfilled = null;
        } else {
          lastUnfilled = q;
        }
        continue;
      }
      pendingContinuation = null;
      lastUnfilled = null;
      continue;
    }

    // Continuation candidate: a line with no question number and a single
    // dictionary-looking word.  Either belongs to the NEXT question row (wrap
    // appears above) or fills the most-recent UNFILLED question row (wrap
    // appears below).
    const trimmed = line.trim();
    if (/^[a-zA-Z]+[,]?$/.test(trimmed) && trimmed.length >= 3) {
      const word = trimmed.replace(/,$/, '');
      if (lastUnfilled !== null) {
        out.set(lastUnfilled, word);
        lastUnfilled = null;
        pendingContinuation = null;
      } else {
        pendingContinuation = word;
      }
    } else {
      pendingContinuation = null;
    }
  }
  return out;
}

const all: Row[] = [];
for (const dir of DIRS) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.pdf')).sort();
  for (const f of files) {
    const yearMatch = /(\d{4})/.exec(f);
    const year = yearMatch ? yearMatch[1] : f;
    const text = pdftotext(`${dir}/${f}`);
    const map = extractLC(text);
    const grade = dir.endsWith('y7') ? '7' : '9';
    for (let q = 1; q <= 25; q++) {
      const word = map.get(q);
      all.push({ year: `y${grade}-${year}`, q, word: word ?? '???' });
    }
  }
}

for (const r of all) console.log(`${r.year}\t${r.q}\t${r.word}`);
console.error(`\nTotal rows: ${all.length} (${all.filter((r) => r.word === '???').length} missing)`);
