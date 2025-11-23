'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AssessmentAttempt, AssessmentTemplate, Role, Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, RotateCcw, BarChart4 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/hooks/use-assessment-store';
import { useToast } from '@/hooks/use-toast';
import { generateAssessment } from '@/ai/flows/generate-assessment-flow';
import { v4 as uuidv4 } from 'uuid';

export default function AssessmentSummaryPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { firestore } = initializeFirebase();
    const { toast } = useToast();
    const assessmentStore = useAssessmentStore();
    const [isRetaking, startRetakeTransition] = useTransition();

    const [attempt, setAttempt] = useState<AssessmentAttempt & { roleName?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user || !firestore || !params.id) return;
        
        const fetchAttempt = async () => {
            setIsLoading(true);
            try {
                const attemptDoc = await getDoc(doc(firestore, `users/${user.id}/assessments`, params.id as string));
                if (!attemptDoc.exists()) {
                    toast({ title: "Result not found", variant: 'destructive' });
                    router.push('/dashboard/assessments');
                    return;
                }
                const attemptData = { id: attemptDoc.id, ...attemptDoc.data() } as AssessmentAttempt;

                const roleDoc = await getDoc(doc(firestore, 'roles', attemptData.roleId));
                const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'Unknown Role';

                setAttempt({ ...attemptData, roleName });
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to load assessment results.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttempt();
    }, [user, firestore, params.id, router, toast]);
    
    const handleRetake = async () => {
        if (!attempt) return;
        
        startRetakeTransition(async () => {
            try {
                let newAssessment;
                // If it was an official template-based assessment, use the root ID
                if (attempt.rootAssessmentId && attempt.assessmentId === attempt.rootAssessmentId) {
                    const templateDoc = await getDoc(doc(firestore, 'assessments', attempt.rootAssessmentId));
                    if (!templateDoc.exists()) throw new Error("Original assessment template not found.");
                    
                    const template = templateDoc.data() as AssessmentTemplate;
                    let questions: Question[] = [];
                    for (let i = 0; i < template.questionIds.length; i += 30) {
                        const chunk = template.questionIds.slice(i, i + 30);
                        const qQuery = query(collection(firestore, 'questionBank'), where('__name__', 'in', chunk));
                        const questionsSnap = await getDocs(qQuery);
                        questions.push(...questionsSnap.docs.map(d => ({id: d.id, ...d.data()} as Question)));
                    }
                    const orderedQuestions = template.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];

                    newAssessment = {
                        id: uuidv4(), // Generate a NEW id for the assessment instance to avoid conflicts
                        roleId: template.roleId,
                        roleName: template.name,
                        questions: orderedQuestions,
                        totalTimeLimit: template.duration * 60,
                        isTemplate: true,
                        templateId: template.id,
                        rootAssessmentId: attempt.rootAssessmentId, // Carry over the root ID
                    };
                } else {
                    // It was a practice assessment, so generate a new one for the same role
                    toast({ title: 'Generating New Practice Test...' });
                    newAssessment = await generateAssessment(attempt.roleId);
                    // For practice tests, the root ID should be the role ID
                    newAssessment.rootAssessmentId = attempt.roleId;
                }
                
                assessmentStore.setAssessment(newAssessment);
                toast({ title: 'New Test Ready!', description: `Your test for ${attempt.roleName} is about to begin.` });
                router.push(`/assessment/${newAssessment.id}`);

            } catch (error) {
                toast({ title: 'Failed to Start Retake', description: (error as Error).message, variant: 'destructive' });
            }
        });
    };

    if (isLoading || authLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    if (!attempt) return null;

    return (
        <div className="relative min-h-full w-full p-4 md:p-8 flex items-center justify-center">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="w-full max-w-lg bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
                        <CardDescription>You took the {attempt.roleName} assessment.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground">Your Score</p>
                        <p className="text-7xl font-bold text-primary">{Math.round(attempt.finalScore!)}%</p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" onClick={() => router.push(`/dashboard/assessments/${attempt.id}`)}>
                            <BarChart4 className="mr-2 h-4 w-4" />
                            View Detailed Results
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <RotateCcw className="mr-2 h-4 w-4" /> Retake Test
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure you want to retake?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will start a new assessment for the same role. Your previous attempt will be saved.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRetake} disabled={isRetaking}>
                                        {isRetaking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        {isRetaking ? 'Preparing...' : 'Yes, Retake Test'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" onClick={() => router.push('/dashboard/assessments')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Assessments
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
