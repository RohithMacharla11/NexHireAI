'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AssessmentAttempt, Role, Question, UserResponse } from '@/lib/types';
import { Loader2, ArrowLeft, Download, BarChart, BrainCircuit, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CodeEditor } from '@/components/assessment/CodeEditor';

type AttemptWithDetails = AssessmentAttempt & {
    roleName?: string;
    questionsWithAnswers?: (Question & UserResponse)[];
};

export default function AssessmentResultPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { firestore } = initializeFirebase();
    
    const [attempt, setAttempt] = useState<AttemptWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const attemptId = params.id as string;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user || !firestore || !attemptId) return;

        const fetchAttemptDetails = async () => {
            setIsLoading(true);
            try {
                // Step 1: Directly fetch the assessment attempt using the unique ID from the URL
                const attemptDocRef = doc(firestore, 'users', user.id, 'assessments', attemptId);
                const attemptDoc = await getDoc(attemptDocRef);

                if (!attemptDoc.exists()) {
                    setAttempt(null);
                    console.error("Assessment attempt not found at path:", attemptDocRef.path);
                    return;
                }

                const attemptData = { id: attemptDoc.id, ...attemptDoc.data() } as AssessmentAttempt;

                // Step 2: Fetch the role name for display purposes
                const roleDocRef = doc(firestore, 'roles', attemptData.roleId);
                const roleDoc = await getDoc(roleDocRef);
                const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'Unknown Role';

                // Step 3: Fetch all question data to show the user's answers in context
                let questionsWithAnswers: (Question & UserResponse)[] = [];
                const questionIds = attemptData.responses?.map(res => res.questionId) || [];
                
                if (questionIds.length > 0) {
                    // Fetch questions in batches of 30 (Firestore 'in' query limit)
                    let questionsFromDb: Question[] = [];
                    for (let i = 0; i < questionIds.length; i += 30) {
                        const chunk = questionIds.slice(i, i + 30);
                        const qQuery = query(collection(firestore, 'questionBank'), where('__name__', 'in', chunk));
                        const questionsSnapshot = await getDocs(qQuery);
                        questionsFromDb.push(...questionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
                    }
                    
                    // Combine questions with their corresponding user responses
                    questionsWithAnswers = attemptData.responses
                        .map(res => {
                            const question = questionsFromDb.find(q => q.id === res.questionId);
                            if (!question) return null;
                            return { ...question, ...res };
                        })
                        .filter(Boolean) as (Question & UserResponse)[];
                }
                
                // Step 4: Set the final state for the page
                setAttempt({ ...attemptData, roleName, questionsWithAnswers });

            } catch (error) {
                console.error("Error fetching assessment result:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttemptDetails();
    }, [user, firestore, attemptId]);
    
    // Memoize radar chart data to prevent recalculation on re-renders
    const radarData = useMemo(() => {
        if (!attempt?.skillScores) return [];
        return Object.entries(attempt.skillScores)
            .filter(([, score]) => typeof score === 'number')
            .map(([skill, score]) => ({
                subject: skill,
                score: score as number,
                fullMark: 100,
            }));
    }, [attempt]);

    if (isLoading || authLoading) {
        return <div className="flex items-center justify-center h-full w-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!attempt) {
        return <div className="flex items-center justify-center h-full w-full"><Card className="text-center p-8"><CardHeader><CardTitle>Assessment Not Found</CardTitle><CardDescription>We couldn't find the result you're looking for. It may have been deleted or there was an error.</CardDescription></CardHeader><CardContent><Button onClick={() => router.push('/dashboard/assessments')}>Back to My Assessments</Button></CardContent></Card></div>;
    }

    return (
         <div className="relative min-h-full w-full p-4 md:p-8">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
            
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8">
                <div>
                     <Button variant="ghost" onClick={() => router.push('/dashboard/assessments')} className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to All Assessments</Button>
                    <h1 className="text-4xl font-bold">{attempt.roleName} - Results</h1>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download Report (PDF)</Button>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2, staggerChildren: 0.1 } }} className="space-y-6">
                <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InfoCard title="Final Score" value={`${Math.round(attempt.finalScore!)}%`} />
                    <InfoCard title="Completion Time" value={`${Math.round((attempt.submittedAt! - attempt.startedAt) / 1000 / 60)} mins`} />
                    <InfoCard title="Date" value={new Date(attempt.submittedAt!).toLocaleDateString()} />
                </motion.div>
                
                <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <Card className="lg:col-span-3 bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart /> Skill-wise Performance</CardTitle></CardHeader>
                        <CardContent className="h-[300px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="hsl(var(--border))" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                    <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-2 bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                        <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit /> AI Feedback</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {attempt.aiFeedback ? (
                                <>
                                    <p className="font-semibold text-muted-foreground">{attempt.aiFeedback.overall}</p>
                                    <Separator />
                                    <h4 className="font-bold">Suggestions:</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {attempt.aiFeedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </>
                            ) : <p>AI feedback is being generated or was not available.</p>}
                        </CardContent>
                    </Card>
                </motion.div>

                 <motion.div>
                    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                        <CardHeader><CardTitle>Question Breakdown</CardTitle></CardHeader>
                        <CardContent>
                           <div className="space-y-2">
                             {(attempt.questionsWithAnswers || []).map((qa, index) => (
                                <Collapsible key={qa.id} className="border-b last:border-b-0">
                                    <CollapsibleTrigger className="w-full text-left py-4 flex justify-between items-center hover:bg-muted/30 px-2 rounded-md">
                                        <div className="flex items-center gap-4">
                                            {qa.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                            <span className="font-medium">Q{index + 1}: {qa.questionText}</span>
                                        </div>
                                        <Badge variant="outline">{qa.skill}</Badge>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="p-4 bg-background/50 rounded-b-md">
                                        {qa.type === 'mcq' && (
                                            <div className="space-y-2 text-sm">
                                                <p><strong>Your Answer:</strong> <span className={qa.isCorrect ? 'text-green-500' : 'text-red-500'}>{qa.answer || "No answer"}</span></p>
                                                {!qa.isCorrect && <p><strong>Correct Answer:</strong> {qa.correctAnswer}</p>}
                                            </div>
                                        )}
                                        {qa.type === 'short' && (
                                            <div className="space-y-2 text-sm">
                                                <p><strong>Your Answer:</strong></p>
                                                <pre className="p-2 bg-muted rounded-md whitespace-pre-wrap font-sans">{qa.answer || "No answer"}</pre>
                                                <p><strong>Correct Answer:</strong></p>
                                                <pre className="p-2 bg-muted rounded-md whitespace-pre-wrap font-sans">{qa.correctAnswer}</pre>
                                            </div>
                                        )}
                                        {qa.type === 'coding' && (
                                             <CodeEditor 
                                                question={qa}
                                                response={qa}
                                                onResponseChange={() => {}}
                                                isReadOnly={true}
                                            />
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                           </div>
                        </CardContent>
                    </Card>
                 </motion.div>
            </motion.div>
         </div>
    );
}

const InfoCard = ({ title, value }: { title: string, value: string }) => (
    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg text-center p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <p className="text-3xl font-bold mt-2">{value}</p>
    </Card>
)
