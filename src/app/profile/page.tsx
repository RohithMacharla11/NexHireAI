'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, AnalysisSummary } from '@/lib/types';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { PersonalUnderstanding } from '@/components/profile/PersonalUnderstanding';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzeResume } from '@/ai/flows/analyze-resume-flow';

type ViewState = 'profile' | 'analysis' | 'edit';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { firestore } = initializeFirebase();
  const [view, setView] = useState<ViewState>('profile');
  const [rotation, setRotation] = useState({ y: 0, direction: 1 });

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

    const userDocRef = doc(firestore, 'users', user.id);
    
    // Create a deep copy to avoid direct state mutation issues.
    const newProfileData = JSON.parse(JSON.stringify(profileData));

    // Merge the form data into the copied profile data.
    const updatedData = {
        ...newProfileData,
        ...formData,
        candidateSpecific: {
            ...newProfileData.candidateSpecific,
            ...formData.candidateSpecific,
        },
        recruiterSpecific: {
            ...newProfileData.recruiterSpecific,
            ...formData.recruiterSpecific,
        },
    };

    try {
        // Use the merged form data to set in Firestore, but only what's changed.
        await setDoc(userDocRef, formData, { merge: true });
        
        // Update the local state with the fully merged data.
        setProfileData(updatedData);

        toast({ title: "Success", description: "Profile updated successfully!" });
        changeView('profile');
    } catch (error) {
        console.error("Error updating profile:", error);
        // No need to revert profileData as we used a copy.
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

        // Use the same update logic to save the analysis
        await handleProfileUpdate(updatePayload);
        changeView('analysis');

      } catch(error) {
         console.error("Error running analysis:", error);
         toast({ title: "Analysis Failed", description: (error as Error).message || "An unknown error occurred.", variant: "destructive" });
      }
  }

  const changeView = (newView: ViewState) => {
    if (newView === view) return;
    
    let newY = rotation.y;
    let newDirection = rotation.direction;
    
    if (view === 'profile' && newView === 'edit') {
      newDirection = 1; // Flip left from profile
      newY += 180 * newDirection;
    } else if (view === 'edit' && newView === 'profile') {
      newY -= 180 * newDirection; // Flip back
    } else if (view === 'profile' && newView === 'analysis') {
      newDirection = -1; // Flip right from profile
      newY += 180 * newDirection;
    } else if (view === 'analysis' && newView === 'profile') {
      newY -= 180 * newDirection; // Flip back
    }
    
    setRotation({ y: newY, direction: newDirection });
    setView(newView);
  };

  if (isLoading || authLoading || !profileData) {
    return <ProfileSkeleton />;
  }
  
  const cardHeight = view === 'edit' ? 'auto' : '650px';
  const minCardHeight = view === 'edit' ? '80vh' : '650px';


  return (
    <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary py-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-center">
         <div className="w-full max-w-4xl" style={{ perspective: '1200px' }}>
            <motion.div
                className="relative preserve-3d"
                style={{ height: cardHeight, minHeight: minCardHeight, width: '100%' }}
                animate={{ rotateY: rotation.y }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
            >
                {/* Profile Face (Front) */}
                <div className="absolute w-full h-full backface-hidden" style={{ rotateY: '0deg' }}>
                    <AnimatePresence>
                        {view === 'profile' && (
                             <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="w-full h-full"
                            >
                                <ProfileCard 
                                    profileData={profileData} 
                                    onRunAnalysis={runAnalysis}
                                    onEdit={() => changeView('edit')}
                                    onViewAnalysis={() => changeView('analysis')}
                                    onAvatarUpload={(file) => handleProfileUpdate({ avatarUrl: URL.createObjectURL(file)})} // simplified for UI
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                 {/* Edit Face */}
                <div className="absolute w-full h-full backface-hidden max-h-full" style={{ transform: 'rotateY(180deg)' }}>
                    <AnimatePresence>
                    {view === 'edit' && (
                        <motion.div
                            className="w-full h-full rounded-3xl border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/40 flex flex-col"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, delay: 0.35 }}
                        >
                            <h2 className="text-2xl font-bold mb-6 flex-shrink-0">Edit Profile</h2>
                            <div className="flex-grow overflow-y-auto pr-4">
                                <EditProfileForm 
                                    profileData={profileData} 
                                    onSave={handleProfileUpdate} 
                                    onCancel={() => changeView('profile')} 
                                />
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>


                {/* Analysis Face */}
                <div className="absolute w-full h-full backface-hidden" style={{ transform: 'rotateY(-180deg)' }}>
                     <AnimatePresence>
                        {view === 'analysis' && (
                             <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-full"
                                transition={{ duration: 0.3, delay: 0.35 }}
                            >
                                <PersonalUnderstanding 
                                    analysis={profileData.analysis?.summary} 
                                    onFlip={() => changeView('profile')}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
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
