
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from '@/lib/utils';
import React from 'react';

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
      
      {user ? (
        <>
          <Link href="/skill-assessment" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Assessments
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </>
      ) : (
        <>
          <Link href="/#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            How It Works
          </Link>
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
