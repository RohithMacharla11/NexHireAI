
'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/hooks/use-auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    // Do not render the main app layout if auth state is loading or user is not present.
    // The AuthLayout in the root will handle showing a loader or redirecting.
    if (loading || !user) {
      return null;
    }

    return (
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
  );
}
