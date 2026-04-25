import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <Shell>
      <section className="mx-auto max-w-xl px-5 py-24 text-center">
        <p className="text-sm tracking-widest uppercase text-primary/80">404</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight">
          Not found
        </h1>
        <p className="mt-4 text-muted-foreground">
          That page doesn&rsquo;t exist — try the Year 3 practice list.
        </p>
        <div className="mt-6">
          <Button asChild>
            <a href="/y3-lc/">Year 3 practice</a>
          </Button>
        </div>
      </section>
    </Shell>
  );
}
