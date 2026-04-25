import { Shell } from '@/components/Shell';

export function About() {
  return (
    <Shell>
      <section className="mx-auto max-w-2xl px-5 pt-8 sm:pt-16 pb-16">
        <h1 className="font-display text-5xl font-extrabold tracking-tight">About</h1>
        <div className="mt-5 space-y-4 text-foreground/90 leading-relaxed">
          <p>
            A small, fast, no-login practice site for Year 3 and Year 5 NAPLAN
            Language Conventions spelling words.
          </p>
          <p>
            The spelling words were extracted from the publicly released NAPLAN
            Language Conventions test papers (Year 3: 2008–2016; Year 5:
            2008–2016). Audio was pre-rendered with ElevenLabs at 0.75× tempo
            with a five-second pause between words.
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
