
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, AnalysisSummary } from '@/lib/types';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { PersonalUnderstanding } from '@/components/profile/PersonalUnderstanding';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzeResume } from '@/ai/flows/analyze-resume-flow';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const firestore = getFirestore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchProfile = useCallback(async () => {
    if (user) {
      try {
        const userDocRef = doc(firestore, 'users', user.id);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setProfileData({ id: docSnap.id, ...docSnap.data() } as UserType);
        }
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
  
  const handleProfileUpdate = async (updatedData: Partial<UserType>) => {
    if (!user) return;
    const userDocRef = doc(firestore, 'users', user.id);
    try {
        await setDoc(userDocRef, updatedData, { merge: true });
        setProfileData(prev => prev ? { ...prev, ...updatedData } : null);
        toast({ title: "Success", description: "Profile updated successfully!" });
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

      // Quick check to see if we have something to analyze
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
        
        await handleProfileUpdate({
            analysis: {
                summary: analysisResult
            }
        });

      } catch(error) {
         console.error("Error running analysis:", error);
         toast({ title: "Analysis Failed", description: "Could not analyze profile.", variant: "destructive" });
      }
  }

  if (isLoading || authLoading || !profileData) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
        
        <div className="container mx-auto px-4 py-8 md:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
            >
                <div className="lg:col-span-2">
                    <ProfileCard 
                        profileData={profileData} 
                        onProfileUpdate={handleProfileUpdate} 
                        onRunAnalysis={runAnalysis}
                    />
                </div>
                <div className="lg:col-span-1">
                    <PersonalUnderstanding analysis={profileData.analysis?.summary} />
                </div>
            </motion.div>
        </div>
    </div>
  );
}

const ProfileSkeleton = () => (
    <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-[400px] w-full rounded-3xl" />
            </div>
            <div className="lg:col-span-1 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    </div>
);
