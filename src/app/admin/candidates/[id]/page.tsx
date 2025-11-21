'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, AssessmentAttempt, Role } from '@/lib/types';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { Skeleton } from '@/components/ui/skeleton';
import { PersonalUnderstanding } from '@/components/profile/PersonalUnderstanding';
import { motion } from 'framer-motion';

type View = 'profile' | 'edit' | 'analysis';

// This is a new page specifically for viewing profiles within the admin dashboard.
export default function AdminCandidateProfilePage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { firestore } = initializeFirebase();

  const [profileData, setProfileData] = useState<UserType | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<(AssessmentAttempt & { roleName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('profile');
  const [rotation, setRotation] = useState(0);

  const profileId = params.id as string;
  const isOwnProfile = profileId === currentUser?.id;

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role === 'candidate')) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  const fetchProfileAndHistory = useCallback(async () => {
    if (profileId && firestore) {
      setIsLoading(true);
      try {
        const userDocRef = doc(firestore, 'users', profileId);
        const docSnap = await getDoc(userDocRef);
        
        if (!docSnap.exists() || docSnap.data().role !== 'candidate') {
            toast({ title: "Candidate not found", variant: "destructive" });
            router.push('/admin/candidates');
            return;
        }

        const data = { id: docSnap.id, ...docSnap.data() } as UserType;
        setProfileData(data);

        // Fetch assessment history
        const historyQuery = query(collection(firestore, 'users', profileId, 'assessments'), orderBy('submittedAt', 'desc'));
        const historySnapshot = await getDocs(historyQuery);
        const historyData = await Promise.all(historySnapshot.docs.map(async (docSnapshot) => {
            const attempt = { id: docSnapshot.id, ...docSnapshot.data() } as AssessmentAttempt;
            const roleDocRef = doc(firestore, 'roles', attempt.roleId);
            const roleDoc = await getDoc(roleDocRef);
            const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'Unknown Role';
            return { ...attempt, roleName };
        }));
        setAssessmentHistory(historyData);

      } catch (error) {
        console.error("Error fetching profile and history:", error);
        toast({ title: "Error", description: "Could not fetch profile data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [profileId, firestore, toast, router]);

  useEffect(() => {
    fetchProfileAndHistory();
  }, [fetchProfileAndHistory]);
  
  const handleProfileUpdate = async (formData: Partial<UserType>) => {
    // For now, admins cannot edit candidate profiles from this view.
    // This function can be expanded later.
    toast({ title: "Note", description: "Editing candidate profiles is not yet enabled from the admin view." });
  };


  const handleViewChange = (newView: View) => {
    // This simplified version only supports flipping to the analysis view.
    if (newView === 'analysis' && view === 'profile') {
        setRotation(rotation - 180);
        setView('analysis');
    } else {
        setRotation(0);
        setView('profile');
    }
  }

  if (isLoading || authLoading || !profileData) {
    return <ProfileSkeleton />;
  }
  
  const hasAnalysis = !!profileData.analysis?.summary;

  return (
    <div className="relative min-h-full w-full flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[85vh] perspective">
            <motion.div
                className="w-full h-full preserve-3d"
                initial={false}
                animate={{ rotateY: rotation }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
            >
                {/* Profile Face */}
                <div className="absolute w-full h-full backface-hidden" style={{ display: view === 'profile' ? 'block' : 'none' }}>
                    <ProfileCard 
                      profileData={profileData} 
                      assessmentHistory={assessmentHistory}
                      onRunAnalysis={async () => toast({ title: "Read-only", description: "Analysis can only be run by the candidate."})}
                      onEdit={() => toast({ title: "Read-only", description: "Editing is disabled in admin view."})}
                      onViewInsights={hasAnalysis ? () => handleViewChange('analysis') : undefined}
                      onAvatarUpload={() => {}}
                      isOwnProfile={false} // Admins are never viewing their "own" profile here
                    />
                </div>
                
                {/* Analysis Face */}
                <div className="absolute w-full h-full backface-hidden" style={{ transform: 'rotateY(-180deg)', display: view === 'analysis' ? 'block' : 'none' }}>
                    <PersonalUnderstanding 
                        analysis={profileData.analysis?.summary}
                        onFlip={() => handleViewChange('profile')}
                    />
                </div>
          </motion.div>
        </div>
    </div>
  );
}

const ProfileSkeleton = () => (
    <div className="relative h-full w-full flex items-center justify-center p-4">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-center">
            <div className="w-full max-w-6xl">
                <Skeleton className="h-[70vh] w-full rounded-3xl" />
            </div>
        </div>
    </div>
);
