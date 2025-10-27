
'use client';

import { Header } from '@/components/landing/header';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/assessment');
  const isAdminSection = pathname.startsWith('/admin');

  // If it's an admin route, the admin layout handles everything, including the header.
  // This creates a completely separate shell for the admin experience.
  if (isAdminSection) {
      return (
          <div className="flex flex-col min-h-screen">
            {children}
          </div>
      )
  }

  // Otherwise, render the default public/candidate layout with its header.
  return (
      <div className="flex flex-col min-h-screen">
          <Header />
          <main className={cn("flex-grow", isDashboard ? "flex" : "")}>
            {children}
          </main>
      </div>
  )
}
