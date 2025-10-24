
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { collection, onSnapshot, Query } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { populateRoles } from '@/ai/flows/populate-roles-flow';
import { generateAssessment } from '@/ai/flows/generate-assessment-flow';
import { useAssessmentStore } from '@/hooks/use-assessment-store';


export default function SkillAssessmentPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { firestore } = initializeFirebase();
  const { toast } = useToast();
  const setAssessment = useAssessmentStore((state) => state.setAssessment);

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [generatingRoleId, setGeneratingRoleId] = useState<string | null>(null);


  const handlePopulate = async () => {
    setIsPopulating(true);
    toast({ title: 'Setting up NexHireAI for the first time...', description: 'AI is generating 30+ roles and sub-skills. This may take a moment.' });
    try {
      await populateRoles();
      toast({ title: 'Setup Complete!', description: 'You can now start an assessment.' });
    } catch (error) {
      console.error("Error populating roles:", error);
      toast({ title: "Population Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      // The onSnapshot listener will handle setting isPopulating to false by updating roles
    }
  };

  useEffect(() => {
    if (!authIsLoading && !user) {
      router.push('/login');
    }
  }, [user, authIsLoading, router]);

  useEffect(() => {
    if (!firestore) return;

    const rolesQuery: Query = collection(firestore, 'roles');
    const unsubscribe = onSnapshot(rolesQuery, (querySnapshot) => {
      if (querySnapshot.empty && !isPopulating) {
        // Automatically populate roles if the collection is empty and not already in the process
        handlePopulate();
      } else {
        const rolesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setRoles(rolesData);
        setIsLoading(false);
        if (isPopulating) {
            setIsPopulating(false);
        }
      }
    }, (error) => {
      console.error("Error fetching roles:", error);
      toast({ title: "Error", description: "Could not fetch roles.", variant: "destructive" });
      setIsLoading(false);
      setIsPopulating(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);
  
  const handleStartAssessment = (roleId: string, roleName: string) => {
    startTransition(async () => {
      setGeneratingRoleId(roleId);
      toast({ title: `Generating Assessment for ${roleName}`, description: 'The AI is creating a unique set of 30 questions. Please wait.' });
      try {
        const assessment = await generateAssessment(roleId);
        
        setAssessment(assessment);

        toast({ title: 'Assessment Ready!', description: `Your test for ${roleName} is about to begin.` });

        router.push(`/assessment/${assessment.id}`);
        
      } catch (error) {
         console.error("Error generating assessment:", error);
         toast({ title: "Generation Failed", description: (error as Error).message, variant: "destructive" });
      } finally {
        setGeneratingRoleId(null);
      }
    });
  }

  if (authIsLoading || isLoading || isPopulating) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">
            { isPopulating ? "Preparing the platform for the first time..." : "Loading Assessments..." }
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      <div className="container mx-auto px-4 py-8 md:px-6">
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <h1 className="text-4xl font-bold">Skill Assessments</h1>
        </motion.div>
        
        {roles.length > 0 ? (
          <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
              initial="hidden"
              animate="show"
          >
            {roles.map((role) => (
              <motion.div key={role.id} variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
                <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg transition-all duration-300 hover:border-primary/60 hover:shadow-primary/10 hover:-translate-y-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>{role.name}</CardTitle>
                        <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col">
                        <div className="flex-grow space-y-1 text-sm text-muted-foreground mb-4">
                          <p className="font-semibold">Sub-skills include:</p>
                          <ul className="list-disc list-inside">
                            {role.subSkills?.slice(0, 3).map(skill => <li key={skill}>{skill}</li>)}
                            {role.subSkills?.length > 3 && <li>...and more</li>}
                          </ul>
                        </div>
                        <Button 
                          className="w-full mt-auto" 
                          onClick={() => handleStartAssessment(role.id, role.name)} 
                          disabled={isPending}
                        >
                          {isPending && generatingRoleId === role.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isPending && generatingRoleId === role.id ? 'Generating...' : 'Start Assessment'}
                        </Button>
                    </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : null }
      </div>
    </div>
  );
}
