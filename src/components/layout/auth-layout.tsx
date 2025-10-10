
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

    // If the user is not logged in and is trying to access a protected page,
    // redirect them to the login page.
    if (!user && !isAuthPage) {
      router.replace('/');
    }

    // If the user is logged in and is on an auth page (login/signup),
    // redirect them to the dashboard.
    if (user && isAuthPage) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, pathname]);

  // While loading the user's authentication state, show a full-screen loader.
  // This prevents content flashes and ensures we don't render the wrong view.
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAuthPage = pathname === '/' || pathname === '/signup';

  // If we are on an auth page, render the children (Login or Signup form)
  if (isAuthPage) {
    // If the user is logged in, the useEffect will trigger a redirect, so we can show a loader.
    if (user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    // Otherwise, show the login/signup form.
    return <>{children}</>;
  }

  // If we are on a protected page, and the user is logged in, render the children (the app)
  if (user) {
    return <>{children}</>;
  }

  // If we are on a protected page and the user is NOT logged in, the useEffect will redirect.
  // We render a loader to avoid flashing the protected content.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
