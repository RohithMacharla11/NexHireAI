

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { collection, onSnapshot, query, where, getDocs, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Loader2, BookCopy, Sparkles, AlertTriangle, CheckCircle, Play, Trash2 } from 'lucide-react';
import type { Role, AssessmentTemplate, Question, Cohort, AssessmentAttempt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { populateRoles } from '@/ai/flows/populate-roles-flow';
import { generateAssessment } from '@/ai/flows/generate-assessment-flow';
import { useAssessmentStore } from '@/hooks/use-assessment-store';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { v4 as uuidv4 } from 'uuid';

type PendingAssessment = 
    | { type: 'practice'; roleId: string; roleName: string; }
    | { type: 'official'; template: AssessmentTemplate; };

export default function SkillAssessmentPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { firestore } = initializeFirebase();
  const { toast } = useToast();
  const assessmentStore = useAssessmentStore();

  const [roles, setRoles] = useState<Role[]>([]);
  const [assignedTemplates, setAssignedTemplates] = useState<AssessmentTemplate[]>([]);
  const [attemptedTemplateIds, setAttemptedTemplateIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [generatingRoleId, setGeneratingRoleId] = useState<string | null>(null);

  // New state to manage the confirmation dialog
  const [showInProgressDialog, setShowInProgressDialog] = useState(false);
  const [pendingAssessmentAction, setPendingAssessmentAction] = useState<PendingAssessment | null>(null);

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
    if (!firestore || !user) return;
    
    setIsLoading(true);

    const rolesQuery = query(collection(firestore, 'roles'));

    // Listen for roles
    const unsubRoles = onSnapshot(rolesQuery, (querySnapshot) => {
      if (querySnapshot.empty && !isPopulating) {
        handlePopulate();
      } else {
        const rolesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setRoles(rolesData);
      }
      if(!isPopulating) setIsLoading(false);
    }, (error) => {
        console.error("Error fetching roles:", error)
        setIsLoading(false);
    });

    // Fetch assigned assessments and past attempts
    const fetchAssignmentsAndHistory = async () => {
        // 1. Find all cohorts the user is in
        const cohortsRef = collection(firestore, 'cohorts');
        const userCohortsQuery = query(cohortsRef, where('candidateIds', 'array-contains', user.id));
        const userCohortsSnap = await getDocs(userCohortsQuery);

        // 2. Get all the assignedAssessmentIds from those cohorts
        const assignedIds = userCohortsSnap.docs
            .map(doc => (doc.data() as Cohort).assignedAssessmentId)
            .filter((id): id is string => !!id);

        if (assignedIds.length > 0) {
            // 3. Fetch the assessment templates for those IDs
            const templatesQuery = query(collection(firestore, 'assessments'), where('__name__', 'in', assignedIds));
            const templatesSnap = await getDocs(templatesQuery);
            const templatesData = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentTemplate));
            setAssignedTemplates(templatesData);
        } else {
            setAssignedTemplates([]);
        }
        
        // 4. Fetch user's assessment history to check for completed official assessments
        const attemptsQuery = query(collection(firestore, `users/${user.id}/assessments`));
        const attemptsSnap = await getDocs(attemptsQuery);
        const attemptedIds = new Set(attemptsSnap.docs.map(doc => (doc.data() as AssessmentAttempt).assessmentId));
        setAttemptedTemplateIds(attemptedIds);
    };
    
    fetchAssignmentsAndHistory().finally(() => {
        if (!isPopulating) setIsLoading(false);
    });


    return () => {
        unsubRoles();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, user, isPopulating]);
  
  const executeAssessmentStart = (action: PendingAssessment) => {
    if (action.type === 'practice') {
      startPracticeAssessment(action.roleId, action.roleName);
    } else if (action.type === 'official') {
      startOfficialAssessment(action.template);
    }
  }

  const handleStartPractice = (roleId: string, roleName: string) => {
    if (assessmentStore.assessment) {
      setPendingAssessmentAction({ type: 'practice', roleId, roleName });
      setShowInProgressDialog(true);
    } else {
      startPracticeAssessment(roleId, roleName);
    }
  }
  
  const handleStartOfficial = (template: AssessmentTemplate) => {
     if (assessmentStore.assessment) {
      setPendingAssessmentAction({ type: 'official', template });
      setShowInProgressDialog(true);
    } else {
      startOfficialAssessment(template);
    }
  }

  const startPracticeAssessment = (roleId: string, roleName: string) => {
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

  const startOfficialAssessment = async (template: AssessmentTemplate) => {
    // We must fetch the questions for the template before starting
    if (!template.questionIds || template.questionIds.length === 0) {
        toast({ title: "Not Ready", description: "This assessment has no questions. Please contact an admin.", variant: "destructive" });
        return;
    }

    toast({ title: "Loading Assessment..." });

    try {
        const questions: Question[] = [];
        for (let i = 0; i < template.questionIds.length; i += 30) {
            const chunk = template.questionIds.slice(i, i + 30);
            const questionsQuery = query(collection(firestore, 'questionBank'), where('__name__', 'in', chunk));
            const questionsSnap = await getDocs(questionsQuery);
            const questionsChunk = questionsSnap.docs.map(d => ({id: d.id, ...d.data()} as Question));
            questions.push(...questionsChunk);
        }

        const orderedQuestions = template.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];

        assessmentStore.setAssessment({
            id: template.id,
            roleId: template.roleId,
            roleName: template.name,
            questions: orderedQuestions,
            totalTimeLimit: template.duration * 60,
            isTemplate: true,
            templateId: template.id,
        });
        router.push(`/assessment/${template.id}`);

    } catch(error) {
        console.error("Error fetching questions for official assessment:", error);
        toast({ title: "Failed to load", description: "Could not retrieve questions for this assessment.", variant: "destructive" });
    }
  }
  
  const handleDiscardAndStart = () => {
    assessmentStore.reset();
    if(pendingAssessmentAction) {
        executeAssessmentStart(pendingAssessmentAction);
    }
    setShowInProgressDialog(false);
    setPendingAssessmentAction(null);
  }

  if (authIsLoading || isLoading || isPopulating || !assessmentStore.isHydrated) {
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
    <>
      <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
        <div className="container mx-auto px-4 py-8 md:px-6 space-y-12">
          
          {/* Official Assessments */}
          <div>
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                  <h1 className="text-4xl font-bold flex items-center gap-3"><Sparkles className="text-primary"/> Official Assessments</h1>
                  <p className="text-lg text-muted-foreground">These are assessments assigned to you by recruiters.</p>
              </motion.div>
              
              {assignedTemplates.length > 0 ? (
                  <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } }}}
                      initial="hidden"
                      animate="show"
                  >
                      {assignedTemplates.map((template) => {
                          const isAttempted = attemptedTemplateIds.has(template.id);
                          return (
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
                                      <Button 
                                        className="w-full mt-auto" 
                                        onClick={() => handleStartOfficial(template)}
                                        disabled={isAttempted}
                                      >
                                          {isAttempted ? <><CheckCircle className="mr-2 h-4 w-4" /> Attempted</> : 'Start Official Assessment'}
                                      </Button>
                                  </CardFooter>
                              </Card>
                          </motion.div>
                      )})}
                  </motion.div>
              ) : (
                  <Card className="bg-card/30 border-dashed">
                      <CardContent className="p-8 text-center text-muted-foreground">
                          <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
                          You have no official assessments assigned to you yet.
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
                                  <h4 className="text-sm font-semibold mb-2">Key Skills:</h4>
                                  <div className="flex flex-wrap gap-1">
                                      {role.subSkills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                                  </div>
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

       <AlertDialog open={showInProgressDialog} onOpenChange={setShowInProgressDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assessment in Progress</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unfinished assessment for "{assessmentStore.assessment?.roleName}". Resuming will take you back where you left off. Discarding will start a new test and your previous progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAssessmentAction(null)}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => router.push(`/assessment/${assessmentStore.assessment?.id}`)}>
              <Play className="mr-2 h-4 w-4" /> Resume Test
            </Button>
            <AlertDialogAction onClick={handleDiscardAndStart} className="bg-destructive hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" /> Discard & Start New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
