'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
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
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('profile');
  const [rotation, setRotation] = useState(0);

  const { toast } = useToast();
  const { firestore } = initializeFirebase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchProfile = useCallback(async () => {
    if (user && firestore) {
      setIsLoading(true);
      try {
        const userDocRef = doc(firestore, 'users', user.id);
        const docSnap = await getDoc(userDocRef);
        let data: UserType;
        if (docSnap.exists()) {
          data = { id: docSnap.id, ...docSnap.data() } as UserType;
        } else {
          data = {
            id: user.id,
            email: user.email,
            name: user.name || "New User",
            role: 'candidate', 
          };
          await setDoc(doc(firestore, "users", user.id), data);
        }
        setProfileData(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({ title: "Error", description: "Could not fetch profile.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, firestore, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  const handleProfileUpdate = async (formData: Partial<UserType>) => {
    if (!user || !profileData) return;
    
    try {
        const userDocRef = doc(firestore, 'users', user.id);
        // This is the broken save logic you wanted to revert to
        await setDoc(userDocRef, formData, { merge: true });
        
        // This state update is also not ideal, but it's part of the reverted state
        setProfileData(prev => ({...prev, ...formData} as UserType));

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
        
        // Use the existing (and flawed) update handler
        await handleProfileUpdate(updatePayload);
        
        // Manually update state for immediate UI feedback before view change
        setProfileData(prev => prev ? ({
          ...prev,
          analysis: { summary: analysisResult }
        }) : null);

        handleViewChange('analysis', 'right');

      } catch(error) {
         console.error("Error running analysis:", error);
         toast({ title: "Analysis Failed", description: (error as Error).message || "An unknown error occurred.", variant: "destructive" });
      }
  }

  const handleViewChange = (newView: View, direction?: 'left' | 'right') => {
      if (view === 'profile') {
          if (newView === 'edit') setRotation(prev => prev + 180);
          if (newView === 'analysis') setRotation(prev => prev - 180);
      } else {
          // Simplified reset logic from any other view
          if (view === 'edit') setRotation(prev => prev - 180);
          if (view === 'analysis') setRotation(prev => prev + 180);
      }
      setView(newView);
  }

  if (isLoading || authLoading || !profileData) {
    return <ProfileSkeleton />;
  }
  
  const hasAnalysis = !!profileData.analysis?.summary;

  return (
    <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary py-8">
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
                      onEdit={() => handleViewChange('edit', 'left')}
                      onViewInsights={hasAnalysis ? () => handleViewChange('analysis', 'right') : undefined}
                      onAvatarUpload={(file) => handleProfileUpdate({ avatarUrl: URL.createObjectURL(file)})} // simplified for UI
                    />
                </div>

                {/* Edit Face */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180" style={{ display: view === 'edit' ? 'block' : 'none' }}>
                     <div className="w-full h-full rounded-3xl border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/40">
                        {/* This is the state with no scroll container */}
                        <EditProfileForm 
                            profileData={profileData} 
                            onSave={handleProfileUpdate} 
                            onCancel={() => handleViewChange('profile')} 
                        />
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
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-[650px] w-full rounded-3xl" />
      </div>
    </div>
);
