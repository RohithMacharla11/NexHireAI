'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // We have the user, so redirect to their actual profile page.
        router.replace(`/profile/me`);
      } else {
        // If for some reason there's no user, redirect to login.
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);
  
  // Show a loading spinner while the redirection is happening.
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
