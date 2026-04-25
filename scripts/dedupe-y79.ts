/**
 * Read /tmp/y79-raw.tsv (year	q	word) and emit alphabetised, deduped word
 * lists per grade to /tmp/y7-words.txt and /tmp/y9-words.txt.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('/tmp/y79-raw.tsv', 'utf-8');
const y7 = new Set<string>();
const y9 = new Set<string>();
for (const line of raw.split('\n')) {
  const m = /^(y[79])-\d{4}\t\d+\t(\S+)$/.exec(line);
  if (!m) continue;
  (m[1] === 'y7' ? y7 : y9).add(m[2].toLowerCase());
}
const sortedY7 = [...y7].sort();
const sortedY9 = [...y9].sort();
writeFileSync('/tmp/y7-words.txt', sortedY7.join('\n') + '\n');
writeFileSync('/tmp/y9-words.txt', sortedY9.join('\n') + '\n');
console.log(`Y7 unique: ${sortedY7.length}`);
console.log(`Y9 unique: ${sortedY9.length}`);
console.log(`Overlap: ${sortedY7.filter((w) => y9.has(w)).length}`);
