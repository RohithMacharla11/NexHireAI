
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole, AppUser } from '@/lib/types';
import {
  useFirebase,
  useUser as useFirebaseUser,
} from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from './use-toast';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const { auth, firestore } = useFirebase();
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } =
    useFirebaseUser();
  const { toast } = useToast();
  const router = useRouter();

  const [isAppUserLoading, setAppUserLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseUserLoading) {
      setAppUserLoading(true);
      return;
    }

    if (!firebaseUser) {
      setAppUser(null);
      setAppUserLoading(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setAppUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name:
              userData.displayName || firebaseUser.displayName || 'No Name',
            role: userData.role as UserRole,
            xp: userData.xp || 0,
            avatarUrl:
              firebaseUser.photoURL ||
              `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
          });
        } else {
          // User exists in auth but not firestore, something is wrong.
          setAppUser(null);
          // Consider logging them out.
          signOut(auth);
        }
        setAppUserLoading(false);
      },
      (error) => {
        console.error('Error fetching user document:', error);
        setAppUser(null);
        setAppUserLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, isFirebaseUserLoading, firestore, auth]);

  const login = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    },
    [auth, router]
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: UserRole
    ) => {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const fbUser = userCredential.user;
      await updateProfile(fbUser, { displayName });
      const userDocRef = doc(firestore, 'users', fbUser.uid);
      const userData = {
        displayName,
        email,
        role,
        xp: 0,
        badges: [],
      };
      await setDoc(userDocRef, userData);
      router.push('/dashboard');
    },
    [auth, firestore, router]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setAppUser(null);
    router.push('/');
  }, [auth, router]);

  const value = {
    user: appUser,
    login,
    signup,
    logout,
    loading: isAppUserLoading || isFirebaseUserLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
