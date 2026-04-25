import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';

export function Landing() {
  return (
    <Shell>
      <section className="mx-auto max-w-5xl px-5 pt-8 sm:pt-20 pb-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-widest uppercase text-primary/80">
            For Year 3&amp;5 students
          </p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl font-extrabold leading-[1.02] tracking-tight text-foreground">
            Spelling practice,
            <br />
            the old school way.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl">
            Short five minute spelling tests of about twenty words each — covers all NAPLAN Language Conventions past exam paper spelling. Press play, listen, write the answers on paper — then check them.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="xl">
              <a href="/y3-lc/">Year 3 Spelling GO!</a>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <a href="/y5-lc/">Year 5 Spelling GO!</a>
            </Button>
          </div>
        </div>
      </section>
    </Shell>
  );
}
