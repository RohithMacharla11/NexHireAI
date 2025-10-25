
'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/landing/header';
import { cn } from '@/lib/utils';

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/assessment') || pathname === '/profile';

  return (
      <div className="flex flex-col min-h-screen">
          {!isDashboard && <Header />}
          <main className={cn("flex-grow", isDashboard ? "flex" : "")}>
            {children}
          </main>
      </div>
  )
}
