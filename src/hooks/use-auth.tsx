
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import type { User, RoleType } from '@/lib/types';
import type { SignupData } from '@/lib/auth';
import { initializeFirebase } from '@/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (signupData: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  profileData: User | null;
  isProfileLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { auth, firestore } = initializeFirebase();

  const handleRedirect = (role: RoleType) => {
     if (role === 'admin' || role === 'recruiter') {
        if (!pathname.startsWith('/admin')) {
             router.push('/admin');
        }
    } else if (role === 'candidate') {
        if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/assessment') && !pathname.startsWith('/profile') && !pathname.startsWith('/skill-assessment')) {
             router.push('/dashboard');
        }
    }
  }

  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    setIsProfileLoading(true);
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    let fullProfile: User;

    if (userDoc.exists()) {
      fullProfile = { id: firebaseUser.uid, ...userDoc.data() } as User;
    } else {
      console.warn(`User document not found for UID: ${firebaseUser.uid}. Creating a default.`);
      fullProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: firebaseUser.displayName || "New User",
        role: 'candidate', // Default role
      };
      await setDoc(userDocRef, fullProfile, { merge: true });
    }
    
    setUser(fullProfile);
    setProfileData(fullProfile);
    setIsLoading(false);
    setIsProfileLoading(false);

    return fullProfile;
  }, [firestore]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setProfileData(null);
          setIsLoading(false);
          setIsProfileLoading(false);
        } else {
            setIsLoading(true);
            await fetchUserData(firebaseUser);
        }
    });
    return () => unsubscribe();
  }, [auth, fetchUserData]);
  
  const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
        await fetchUserData(firebaseUser);
    }
  }, [auth, fetchUserData]);

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const loggedInUser = await fetchUserData(userCredential.user);
    handleRedirect(loggedInUser.role);
  };

  const signup = async (signupData: SignupData) => {
    const { name, email, password, role } = signupData;
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    const userProfile: Omit<User, 'id'> = {
      name,
      email,
      role,
      avatarUrl: `https://picsum.photos/seed/${firebaseUser.uid}/200`,
      xp: 0,
      badges: [],
      ...(role === 'candidate' && { candidateSpecific: { skills: [], locationPreferences: [] } }),
      ...(role === 'recruiter' && { recruiterSpecific: { companyName: '', hiringFocus: [] } }),
    };

    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    await setDoc(userDocRef, userProfile);
    
    await signOut(auth);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfileData(null);
    router.push('/');
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    refreshUser,
    profileData,
    isProfileLoading
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

    