

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Loader2, BookCopy, Sparkles, AlertTriangle } from 'lucide-react';
import type { Role, AssessmentTemplate, Question } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { populateRoles } from '@/ai/flows/populate-roles-flow';
import { generateAssessment } from '@/ai/flows/generate-assessment-flow';
import { useAssessmentStore } from '@/hooks/use-assessment-store';
import { Separator } from '@/components/ui/separator';

export default function SkillAssessmentPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { firestore } = initializeFirebase();
  const { toast } = useToast();
  const assessmentStore = useAssessmentStore();

  const [roles, setRoles] = useState<Role[]>([]);
  const [assessmentTemplates, setAssessmentTemplates] = useState<AssessmentTemplate[]>([]);
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
       setIsPopulating(false);
    }
  };

  useEffect(() => {
    if (!authIsLoading && !user) {
      router.push('/login');
    }
  }, [user, authIsLoading, router]);

  useEffect(() => {
    if (!firestore) return;
    
    setIsLoading(true);

    const rolesQuery = query(collection(firestore, 'roles'));
    const templatesQuery = query(collection(firestore, 'assessments'), where('status', '==', 'active'));

    const unsubRoles = onSnapshot(rolesQuery, (querySnapshot) => {
      if (querySnapshot.empty && !isPopulating) {
        handlePopulate();
      } else {
        const rolesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setRoles(rolesData);
      }
    }, (error) => console.error("Error fetching roles:", error));
    
    const unsubTemplates = onSnapshot(templatesQuery, (querySnapshot) => {
        const templatesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentTemplate));
        setAssessmentTemplates(templatesData);
    }, (error) => console.error("Error fetching assessment templates:", error));


    Promise.all([new Promise(res => onSnapshot(rolesQuery, res)), new Promise(res => onSnapshot(templatesQuery, res))])
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false));

    return () => {
        unsubRoles();
        unsubTemplates();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);
  
  const handleStartPractice = (roleId: string, roleName: string) => {
    startTransition(async () => {
      setGeneratingRoleId(roleId);
      toast({ title: `Generating Practice for ${roleName}`, description: 'The AI is creating a unique set of 30 questions. Please wait.' });
      try {
        const assessment = await generateAssessment(roleId);
        assessmentStore.setAssessment(assessment);
        toast({ title: 'Practice Ready!', description: `Your test for ${roleName} is about to begin.` });
        router.push(`/assessment/${assessment.id}`);
      } catch (error) {
         console.error("Error generating assessment:", error);
         toast({ title: "Generation Failed", description: (error as Error).message, variant: "destructive" });
      } finally {
        setGeneratingRoleId(null);
      }
    });
  }

  const handleStartOfficial = async (template: AssessmentTemplate) => {
    if (!template.questionIds || template.questionIds.length === 0) {
        toast({ title: "Not Ready", description: "This assessment is not configured with questions yet.", variant: "destructive" });
        return;
    }
    
    // In a real app, you'd fetch the full question objects from a `questionBank` collection
    // Here we'll create placeholder questions based on the template.
    const questions: Question[] = template.questionIds.map((id, i) => ({
        id,
        questionText: `Official Question ${i+1} for ${template.name}`,
        type: 'mcq',
        difficulty: 'Medium',
        skill: template.skills[0] || 'general',
        timeLimit: 120, // 2 minutes per question
        tags: [template.role]
    }));

    assessmentStore.setAssessment({
        id: template.id,
        roleId: template.roleId,
        roleName: template.name,
        questions: questions,
        totalTimeLimit: template.duration * 60,
        isTemplate: true,
        templateId: template.id,
    });
    router.push(`/assessment/${template.id}`);
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
      <div className="container mx-auto px-4 py-8 md:px-6 space-y-12">
        
        {/* Official Assessments */}
        <div>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-4xl font-bold flex items-center gap-3"><Sparkles className="text-primary"/> Official Assessments</h1>
                <p className="text-lg text-muted-foreground">Take these assessments to get a verified score for your profile.</p>
            </motion.div>
            
            {assessmentTemplates.length > 0 ? (
                 <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } }}}
                    initial="hidden"
                    animate="show"
                >
                    {assessmentTemplates.map((template) => (
                        <motion.div key={template.id} variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
                            <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg transition-all duration-300 hover:border-primary/60 hover:shadow-primary/10 hover:-translate-y-1 flex flex-col">
                                <CardHeader>
                                    <CardTitle>{template.name}</CardTitle>
                                    <CardDescription>Role: <Badge variant="outline">{template.role}</Badge></CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">{template.questionCount} Questions, {template.duration} Minutes</p>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full mt-auto" onClick={() => handleStartOfficial(template)}>Start Official Assessment</Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                 </motion.div>
            ) : (
                <Card className="bg-card/30 border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                        <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
                        No official assessments have been created by admins yet. Check back soon!
                    </CardContent>
                </Card>
            )}
        </div>
        
        <Separator />

        {/* Practice by Role */}
        <div>
             <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-3"><BookCopy /> Practice by Role</h2>
                <p className="text-lg text-muted-foreground">Generate a unique practice test for any role to sharpen your skills.</p>
            </motion.div>
            
            {roles.length > 0 ? (
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } }}}
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
                            <CardContent className="flex-grow">
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {role.subSkills?.slice(0, 3).map(skill => <li key={skill}>{skill}</li>)}
                                </ul>
                            </CardContent>
                             <CardFooter>
                                <Button 
                                    className="w-full mt-auto" 
                                    variant="secondary"
                                    onClick={() => handleStartPractice(role.id, role.name)} 
                                    disabled={isPending}
                                >
                                    {isPending && generatingRoleId === role.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isPending && generatingRoleId === role.id ? 'Generating...' : 'Start Practice'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                    ))}
                </motion.div>
            ) : null }
        </div>
      </div>
    </div>
  );
}
