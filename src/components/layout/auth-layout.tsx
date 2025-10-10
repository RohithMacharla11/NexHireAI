
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If loading, don't do anything yet.
    if (loading) {
      return;
    }

    const isAuthPage = pathname === '/' || pathname === '/signup';

    // If user is not logged in and is trying to access a protected page
    if (!user && !isAuthPage) {
      router.replace('/');
    }

    // If user is logged in and is trying to access an auth page (login/signup)
    if (user && isAuthPage) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, pathname]);

  // While loading, show a full-screen loader to prevent layout flashes
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not authenticated and not on an auth page, the useEffect will redirect.
  // We render null to prevent a flash of the protected content.
  if (!user && pathname !== '/' && pathname !== '/signup') {
    return null;
  }
  
  // If user is authenticated and on an auth page, the useEffect will redirect.
  // We render a loader to prevent a flash of the login page.
  if (user && (pathname === '/' || pathname === '/signup')) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }


  // Render the children (the actual page content)
  return <>{children}</>;
}
