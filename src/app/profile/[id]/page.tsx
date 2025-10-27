
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, AnalysisSummary, AssessmentAttempt, Role } from '@/lib/types';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzeResume } from '@/ai/flows/analyze-resume-flow';
import { PersonalUnderstanding } from '@/components/profile/PersonalUnderstanding';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type View = 'profile' | 'edit' | 'analysis';

export default function ProfilePage() {
  const { user: currentUser, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { firestore } = initializeFirebase();

  const [profileData, setProfileData] = useState<UserType | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<(AssessmentAttempt & { roleName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('profile');
  const [rotation, setRotation] = useState(0);

  const profileId = params.id === 'me' ? currentUser?.id : params.id;
  const isOwnProfile = profileId === currentUser?.id;

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  const fetchProfileAndHistory = useCallback(async () => {
    if (profileId && firestore) {
      setIsLoading(true);
      try {
        // Fetch profile
        const userDocRef = doc(firestore, 'users', profileId as string);
        const docSnap = await getDoc(userDocRef);
        let data: UserType;
        if (docSnap.exists()) {
          data = { id: docSnap.id, ...docSnap.data() } as UserType;
        } else {
           if (!isOwnProfile) {
                toast({ title: "User not found", variant: "destructive" });
                router.push('/admin');
                return;
           }
          data = {
            id: currentUser!.id,
            email: currentUser!.email,
            name: currentUser!.name || "New User",
            role: 'candidate', 
          };
          await setDoc(userDocRef, data);
        }
        setProfileData(data);

        // Fetch assessment history ONLY if the user is a candidate
        if (data.role === 'candidate') {
            const historyQuery = query(collection(firestore, 'users', profileId as string, 'assessments'), orderBy('submittedAt', 'desc'));
            const historySnapshot = await getDocs(historyQuery);
            const historyData = await Promise.all(historySnapshot.docs.map(async (docSnapshot) => {
                const attempt = { id: docSnapshot.id, ...docSnapshot.data() } as AssessmentAttempt;
                const roleDocRef = doc(firestore, 'roles', attempt.roleId);
                const roleDoc = await getDoc(roleDocRef);
                const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'Unknown Role';
                return { ...attempt, roleName };
            }));
            setAssessmentHistory(historyData);
        } else {
            // For non-candidates, ensure history is empty
            setAssessmentHistory([]);
        }

      } catch (error) {
        console.error("Error fetching profile and history:", error);
        toast({ title: "Error", description: "Could not fetch profile data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [profileId, firestore, toast, isOwnProfile, router, currentUser]);

  useEffect(() => {
    fetchProfileAndHistory();
  }, [fetchProfileAndHistory]);
  
  const handleProfileUpdate = async (formData: Partial<UserType>) => {
    if (!profileId || !profileData) return;

    // A deep merge function that handles nested objects without overwriting them
    const deepMerge = (target: any, source: any) => {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]))
            }
        }
        // Join `target` and `source` properties
        Object.assign(target || {}, source)
        return target
    }

    const updatedData = deepMerge({ ...profileData }, formData);
    
    try {
        const userDocRef = doc(firestore, 'users', profileId as string);
        await setDoc(userDocRef, updatedData, { merge: true });
        
        setProfileData(updatedData);
        if(isOwnProfile) {
            await refreshUser(); 
        }

        toast({ title: "Success", description: "Profile updated successfully!" });
        handleViewChange('profile');
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Error", description: "Could not update profile.", variant: "destructive" });
    }
  };

  const runAnalysis = async () => {
      if (!profileData) return;
      
      const analysisInput = {
        skills: profileData.candidateSpecific?.skills || [],
        bio: profileData.candidateSpecific?.bio || '',
        experienceLevel: profileData.candidateSpecific?.experienceLevel || 'Fresher'
      }

      if(analysisInput.skills.length === 0 && !analysisInput.bio) {
        toast({
          title: "Not enough data",
          description: "Please add some skills and a bio to run the analysis.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        toast({ title: "Analyzing Profile...", description: "This may take a moment." });
        const analysisResult: AnalysisSummary = await analyzeResume(analysisInput);
        
        const userDocRef = doc(firestore, 'users', profileId as string);
        await updateDoc(userDocRef, {
            'analysis.summary': analysisResult,
        });
        
        setProfileData(prev => prev ? ({
          ...prev,
          analysis: { summary: analysisResult }
        }) : null);

        handleViewChange('analysis');

      } catch(error) {
         console.error("Error running analysis:", error);
         toast({ title: "Analysis Failed", description: (error as Error).message || "An unknown error occurred.", variant: "destructive" });
      }
  }

  const handleViewChange = (newView: View) => {
    const isReturningToProfile = newView === 'profile';

    if (view === 'profile' && newView === 'edit') {
      setRotation(rotation + 180);
    } else if (view === 'profile' && newView === 'analysis') {
      setRotation(rotation - 180);
    } else if (isReturningToProfile) {
      if (view === 'edit') setRotation(rotation - 180);
      if (view === 'analysis') setRotation(rotation + 180);
    }
    setView(newView);
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
                      onRunAnalysis={runAnalysis}
                      onEdit={() => handleViewChange('edit')}
                      onViewInsights={hasAnalysis ? () => handleViewChange('analysis') : undefined}
                      onAvatarUpload={(file) => handleProfileUpdate({ avatarUrl: URL.createObjectURL(file)})}
                      isOwnProfile={isOwnProfile}
                    />
                </div>

                {/* Edit Face */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180" style={{ display: view === 'edit' ? 'block' : 'none' }}>
                     <div className="w-full h-full rounded-3xl border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/40 flex flex-col">
                        <div className="flex-grow max-h-full overflow-y-auto pr-4">
                            <EditProfileForm 
                                profileData={profileData} 
                                onSave={handleProfileUpdate} 
                                onCancel={() => handleViewChange('profile')} 
                                isOwnProfile={isOwnProfile}
                            />
                        </div>
                    </div>
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
