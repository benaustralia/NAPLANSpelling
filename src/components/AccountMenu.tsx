import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { NavLink } from '@/components/Shell';

export function AccountMenu({ path }: { path: string }) {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-3 shrink-0">
          <NavLink href="/progress/" active={path === '/progress'}>
            Progress
          </NavLink>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </>
  );
}
