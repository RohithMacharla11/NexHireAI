
"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole, AppUser } from '@/lib/types';
import {
  useFirebase,
  useUser as useFirebaseUser,
  errorEmitter,
  FirestorePermissionError,
} from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useFirebaseUser();

  useEffect(() => {
    const syncUser = async () => {
      if (isFirebaseUserLoading) {
        setLoading(true);
        return;
      }

      if (firebaseUser && firestore) {
        try {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.displayName || firebaseUser.displayName || 'No Name',
              role: userData.role as UserRole,
              xp: userData.xp,
              avatarUrl: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`
            });
          } else {
             // This can happen if the doc creation is pending or failed.
            await signOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    syncUser();
  }, [firebaseUser, firestore, isFirebaseUserLoading, auth]);


  const login = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Auth service not available");
    await signInWithEmailAndPassword(auth, email, password);
    // Auth state change is now handled by the main useEffect
  }, [auth]);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: UserRole
    ) => {
      if (!auth || !firestore) {
        throw new Error('Firebase services not available');
      }
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
      
      await setDoc(userDocRef, userData).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'create',
          requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });
    },
    [auth, firestore]
  );

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null); // Clear local user state
    router.push('/');
  }, [auth, router]);

  const value = { user, login, signup, logout, loading };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
