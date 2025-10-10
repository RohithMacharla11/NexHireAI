
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User } from '@/lib/types';
import { mockLogin, mockSignup, mockLogout, mockGetUser } from '@/lib/auth';
import type { SignupData } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (signupData: SignupData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await mockGetUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await mockLogin(email, password);
    setUser(loggedInUser);
  };

  const signup = async (signupData: SignupData) => {
    await mockSignup(signupData);
    // After signup, user needs to login. We don't automatically log them in.
  };

  const logout = async () => {
    await mockLogout();
    setUser(null);
    router.push('/');
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
