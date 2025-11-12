
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
  const [isLoading, setIsLoading] = useState(true); // Tracks initial Firebase auth check
  const [isProfileLoading, setIsProfileLoading] = useState(false); // Tracks Firestore profile fetch
  const router = useRouter();
  const { auth, firestore } = initializeFirebase();

  const handleRedirect = (role: RoleType) => {
     if (role === 'admin' || role === 'recruiter') {
        router.push('/admin');
    } else if (role === 'candidate') {
        router.push('/dashboard');
    }
  }

  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    setIsProfileLoading(true);
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    try {
        const userDoc = await getDoc(userDocRef);
        let fullProfile: User;

        if (userDoc.exists()) {
            fullProfile = { id: firebaseUser.uid, ...userDoc.data() } as User;
        } else {
            // If the user document doesn't exist, create it. This happens on first login after signup.
            console.warn(`User document not found for UID: ${firebaseUser.uid}. Creating a default profile.`);
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
        return fullProfile;
    } catch (error) {
        console.error("Error fetching or creating user data:", error);
        // Fallback in case of firestore error after successful auth
        const minimalUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName || "User",
            role: 'candidate' as RoleType,
        };
        setUser(minimalUser);
        setProfileData(minimalUser);
        return minimalUser;
    } finally {
        setIsProfileLoading(false);
    }
  }, [firestore]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in. Auth is loaded, now fetch profile.
            await fetchUserData(firebaseUser);
            setIsLoading(false); // Auth is done!
        } else {
            // User is signed out.
            setUser(null);
            setProfileData(null);
            setIsLoading(false); // Auth is done!
            setIsProfileLoading(false);
        }
    });
    return () => unsubscribe();
  }, [auth, fetchUserData]);
  
  const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
        await fetchUserData(firebaseUser);
    }
  }, [auth.currentUser, fetchUserData]);

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
      ...(role === 'recruiter' && { recruiterSpecific: { 
          companyName: 'Example Corp',
          designation: 'Talent Acquisition Specialist',
          companyWebsite: 'https://example.com',
          hiringFocus: ['react', 'nodejs'] 
      } }),
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
