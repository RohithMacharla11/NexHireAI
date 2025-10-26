'use client';

import { Header } from '@/components/landing/header';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/assessment') || pathname.startsWith('/profile');

  return (
      <div className="flex flex-col min-h-screen">
          <Header />
          <main className={cn("flex-grow", isDashboard ? "flex" : "")}>
            {children}
          </main>
      </div>
  )
}
