
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Wait until the auth state is confirmed
    }

    const isAuthPage = pathname === '/' || pathname === '/signup';

    // If the user is logged in and is on an auth page (login/signup),
    // redirect them to the dashboard.
    if (user && isAuthPage) {
      router.replace('/dashboard');
      return;
    }

    // If the user is not logged in and is trying to access a protected page,
    // redirect them to the login page.
    if (!user && !isAuthPage) {
      router.replace('/');
      return;
    }
  }, [user, loading, router, pathname]);

  // While loading, or if a redirect is imminent, show a full-screen loader.
  // This prevents content flashes and ensures we don't render the wrong view.
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAuthPage = pathname === '/' || pathname === '/signup';

  // If user is logged in, but on an auth page, we are redirecting, so show loader.
  if (user && isAuthPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If user is not logged in, but on a protected page, we are redirecting, so show loader.
  if (!user && !isAuthPage) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Otherwise, render the children for the current route
  return <>{children}</>;
}
