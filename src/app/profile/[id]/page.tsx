
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, AnalysisSummary } from '@/lib/types';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzeResume } from '@/ai/flows/analyze-resume-flow';
import { PersonalUnderstanding } from '@/components/profile/PersonalUnderstanding';
import { motion } from 'framer-motion';

type View = 'profile' | 'edit' | 'analysis';

export default function ProfilePage() {
  const { user: currentUser, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { firestore } = initializeFirebase();

  const [profileData, setProfileData] = useState<UserType | null>(null);
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

  const fetchProfile = useCallback(async () => {
    if (profileId && firestore) {
      setIsLoading(true);
      try {
        const userDocRef = doc(firestore, 'users', profileId as string);
        const docSnap = await getDoc(userDocRef);
        let data: UserType;
        if (docSnap.exists()) {
          data = { id: docSnap.id, ...docSnap.data() } as UserType;
        } else {
           if (!isOwnProfile) {
                toast({ title: "User not found", variant: "destructive" });
                router.push('/dashboard/admin');
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
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({ title: "Error", description: "Could not fetch profile.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [profileId, firestore, toast, isOwnProfile, router, currentUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  const handleProfileUpdate = async (formData: Partial<UserType>) => {
    if (!profileId || !profileData) return;

    const updatedData = JSON.parse(JSON.stringify(profileData));

    for (const key in formData) {
        if (Object.prototype.hasOwnProperty.call(formData, key)) {
            const formValue = formData[key as keyof typeof formData];
            if (typeof formValue === 'object' && formValue !== null && !Array.isArray(formValue) && updatedData[key] && typeof updatedData[key] === 'object') {
                updatedData[key] = { ...updatedData[key], ...formValue };
            } else {
                updatedData[key] = formValue;
            }
        }
    }
    
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
        
        const updatePayload = {
            analysis: {
                summary: analysisResult
            }
        };
        
        await handleProfileUpdate(updatePayload);
        
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
    <div className="relative h-[calc(100vh-5rem)] w-full bg-secondary flex items-center justify-center">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-center">
         <div className="w-full max-w-4xl h-[85vh] perspective">
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
    </div>
  );
}

const ProfileSkeleton = () => (
    <div className="relative h-[calc(100vh-5rem)] w-full bg-secondary flex items-center justify-center">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-center">
            <div className="w-full max-w-4xl">
                <Skeleton className="h-[70vh] w-full rounded-3xl" />
            </div>
        </div>
    </div>
);

    