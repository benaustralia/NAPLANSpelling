import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';

export function Landing() {
  return (
    <Shell>
      <section className="mx-auto max-w-5xl px-5 pt-8 sm:pt-20 pb-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-widest uppercase text-primary/80">
            Listen and spell — Years 3, 5, 7 &amp; 9, plus Difficult &amp; Challenging
          </p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl font-extrabold leading-[1.02] tracking-tight text-foreground">
            Spelling practice,
            <br />
            the old school way.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl">
            Short five minute spelling tests of about twenty words each — covers all NAPLAN Language Conventions past exam paper spelling, plus two extra levels of harder words for strong spellers. Press play, listen, write the answers on paper — then check them.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <Button asChild size="xl" className="w-full">
              <a href="/y3-lc/">Year 3</a>
            </Button>
            <Button asChild size="xl" className="w-full">
              <a href="/y5-lc/">Year 5</a>
            </Button>
            <Button asChild size="xl" className="w-full">
              <a href="/y7-lc/">Year 7</a>
            </Button>
            <Button asChild size="xl" className="w-full">
              <a href="/y9-lc/">Year 9</a>
            </Button>
          </div>
          <p className="mt-6 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            Beyond Year 9 — for strong spellers
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button asChild size="xl" variant="outline" className="w-full border-primary/30 text-foreground hover:border-primary/50">
              <a href="/difficult-lc/">Difficult</a>
            </Button>
            <Button asChild size="xl" variant="outline" className="w-full border-primary/30 text-foreground hover:border-primary/50">
              <a href="/challenging-lc/">Challenging</a>
            </Button>
          </div>
          <p className="mt-6 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            Spelling Bee practice — Green, Orange &amp; Red level
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            An independent practice resource, not affiliated with or endorsed by the Prime Minister&rsquo;s Spelling Bee.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Button asChild size="xl" variant="outline" className="w-full border-primary/30 text-foreground hover:border-primary/50">
              <a href="/bee-green-lc/">Green</a>
            </Button>
            <Button asChild size="xl" variant="outline" className="w-full border-primary/30 text-foreground hover:border-primary/50">
              <a href="/bee-orange-lc/">Orange</a>
            </Button>
            <Button asChild size="xl" variant="outline" className="w-full border-primary/30 text-foreground hover:border-primary/50">
              <a href="/bee-red-lc/">Red</a>
            </Button>
          </div>
        </div>
      </section>
    </Shell>
  );
}
