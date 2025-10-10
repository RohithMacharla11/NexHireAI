"use client";

import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from '@/hooks/use-auth';
import type { UserRole, User } from '@/lib/types';
import { mockUsers } from '@/lib/placeholder-data';
import { useRouter, usePathname } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This effect runs only on the client, after initial render.
    try {
      const storedRole = localStorage.getItem('userRole') as UserRole | null;
      if (storedRole) {
        const currentUser = Object.values(mockUsers).find(u => u.role === storedRole);
        setUser(currentUser || null);
      }
    } catch (error) {
      console.error("Could not access localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user && pathname !== '/') {
        router.push('/');
    }
  }, [user, loading, pathname, router]);


  const login = useCallback((role: UserRole) => {
    const currentUser = Object.values(mockUsers).find(u => u.role === role);
    if (currentUser) {
      setUser(currentUser);
      try {
        localStorage.setItem('userRole', role);
      } catch (error) {
        console.error("Could not access localStorage", error);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('userRole');
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
    router.push('/');
  }, [router]);

  const value = { user, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
