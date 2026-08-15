import { Shell } from '@/components/Shell';

export function About() {
  return (
    <Shell>
      <section className="mx-auto max-w-2xl px-5 pt-8 sm:pt-16 pb-16">
        <h1 className="font-display text-5xl font-extrabold tracking-tight">About</h1>
        <div className="mt-5 space-y-4 text-foreground/90 leading-relaxed">
          <p>
            A small, fast, no-login practice site for Year 3, Year 5, Year 7
            and Year 9 NAPLAN Language Conventions spelling words, plus two
            extra levels — Difficult and Challenging — for strong spellers
            who have outgrown the Year 9 list.
          </p>
          <p>
            The Year 3–9 spelling words were extracted from the publicly
            released NAPLAN Language Conventions test papers (paper era:
            2008–2016, all four year levels). The Difficult and Challenging
            word lists are instead drawn from the ACARA NAPLAN Writing
            Marking Guide, a separate ACARA publication used to source more
            advanced vocabulary once a student has cleared every NAPLAN year
            level. Audio is pre-rendered with ElevenLabs at 0.75× tempo with a
            paced silent gap between items: 7.5 seconds for Years 3 and 5, and
            5.5 seconds for Years 7, 9, Difficult and Challenging — long
            enough to write a word comfortably, short enough to keep the test
            moving.
          </p>
          <p>
            The Spelling Bee (Green / Orange / Red) levels are a separate
            practice category matching the reading levels used by the Prime
            Minister&rsquo;s Spelling Bee, with word lists compiled to a similar
            length and difficulty ramp. This site and its word lists are
            independently produced and are not affiliated with, endorsed by,
            or sourced from the Prime Minister&rsquo;s Spelling Bee or its
            organisers — see{' '}
            <a
              href="https://www.spelling-bee.com.au/"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              spelling-bee.com.au
            </a>{' '}
            for the official competition.
          </p>
          <h2 className="font-display text-2xl font-bold mt-8">Copyright</h2>
          <p className="text-sm text-muted-foreground">
            NAPLAN test materials are © ACARA — see the{' '}
            <a
              href="https://www.acara.edu.au/contact-us/copyright"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              ACARA copyright statement
            </a>{' '}
            for the current licence terms. This site is an independent study
            aid; it is not endorsed by ACARA.
          </p>
        </div>
      </section>
    </Shell>
  );
}
