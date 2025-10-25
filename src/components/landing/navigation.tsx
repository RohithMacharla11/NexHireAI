
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export function Navigation() {
  const { user } = useAuth();

  return (
    <nav className="hidden items-center gap-6 md:flex">
      <Link href="/#home" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        Home
      </Link>
      <Link href="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        Features
      </Link>
      <Link href="/#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        How It Works
      </Link>
      
      {user ? (
        <>
          <Link href="/skill-assessment" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Skill Assessment
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </>
      ) : (
        <>
          <Link href="/#about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/#contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Contact
          </Link>
        </>
      )}
    </nav>
  );
}
