'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AssessmentAttempt, Role, Question, UserResponse } from '@/lib/types';
import { Loader2, ArrowLeft, Download, BarChart, BrainCircuit, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CodeEditor } from '@/components/assessment/CodeEditor';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type AttemptWithDetails = AssessmentAttempt & {
    roleName?: string;
    questionsWithAnswers?: (Question & UserResponse)[];
};

export default function AssessmentResultPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { firestore } = initializeFirebase();
    
    const [history, setHistory] = useState<AttemptWithDetails[]>([]);
    const [currentAttempt, setCurrentAttempt] = useState<AttemptWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initialAttemptId = params.id as string;

    const getDetailedAttempt = async (attemptData: AssessmentAttempt): Promise<AttemptWithDetails> => {
        const roleDocRef = doc(firestore, 'roles', attemptData.roleId);
        const roleDoc = await getDoc(roleDocRef);
        const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'Unknown Role';

        let questionsWithAnswers: (Question & UserResponse)[] = [];
        const questionIds = attemptData.responses?.map(res => res.questionId) || [];
        
        if (questionIds.length > 0) {
            let questionsFromDb: Question[] = [];
            for (let i = 0; i < questionIds.length; i += 30) {
                const chunk = questionIds.slice(i, i + 30);
                const qQuery = query(collection(firestore, 'questionBank'), where('__name__', 'in', chunk));
                const questionsSnapshot = await getDocs(qQuery);
                questionsFromDb.push(...questionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
            }
            questionsWithAnswers = attemptData.responses
                .map(res => {
                    const question = questionsFromDb.find(q => q.id === res.questionId);
                    if (!question) return null;
                    return { ...question, ...res };
                })
                .filter(Boolean) as (Question & UserResponse)[];
        }
        
        return { ...attemptData, roleName, questionsWithAnswers };
    }

    useEffect(() => {
        if (!user || !firestore || !initialAttemptId) return;

        const fetchAttemptAndHistory = async () => {
            setIsLoading(true);
            try {
                // Step 1: Directly fetch the specific assessment attempt using the unique ID from the URL
                const initialAttemptDocRef = doc(firestore, 'users', user.id, 'assessments', initialAttemptId);
                const initialAttemptSnap = await getDoc(initialAttemptDocRef);

                if (!initialAttemptSnap.exists()) {
                    setCurrentAttempt(null);
                    setHistory([]);
                    console.error("Assessment attempt not found at path:", initialAttemptDocRef.path);
                    return;
                }

                const initialAttemptData = { id: initialAttemptSnap.id, ...initialAttemptSnap.data() } as AssessmentAttempt;
                const detailedInitialAttempt = await getDetailedAttempt(initialAttemptData);
                setCurrentAttempt(detailedInitialAttempt);

                // Step 2: If a rootAssessmentId exists, fetch all related historical attempts
                if (initialAttemptData.rootAssessmentId) {
                    const historyQuery = query(
                        collection(firestore, 'users', user.id, 'assessments'),
                        where('rootAssessmentId', '==', initialAttemptData.rootAssessmentId),
                        orderBy('submittedAt', 'asc')
                    );
                    const historySnapshot = await getDocs(historyQuery);
                    const historyData = await Promise.all(
                        historySnapshot.docs.map(doc => getDetailedAttempt({ id: doc.id, ...doc.data() } as AssessmentAttempt))
                    );
                    setHistory(historyData);
                } else {
                    // If there's no root ID, the history is just the single attempt
                    setHistory([detailedInitialAttempt]);
                }

            } catch (error) {
                console.error("Error fetching assessment result:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttemptAndHistory();
    }, [user, firestore, initialAttemptId]);

    const radarData = useMemo(() => {
        if (!currentAttempt?.skillScores) return [];
        return Object.entries(currentAttempt.skillScores)
            .filter(([, score]) => typeof score === 'number')
            .map(([skill, score]) => ({
                subject: skill,
                score: score as number,
                fullMark: 100,
            }));
    }, [currentAttempt]);

    const progressChartData = useMemo(() => {
        return history.map((h, i) => ({
            name: `Attempt ${i + 1}`,
            score: h.finalScore || 0,
        }));
    }, [history]);

    if (isLoading || authLoading) {
        return <div className="flex items-center justify-center h-full w-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!currentAttempt) {
        return <div className="flex items-center justify-center h-full w-full"><Card className="text-center p-8"><CardHeader><CardTitle>Assessment Not Found</CardTitle><CardDescription>We couldn't find the result you're looking for. It may have been deleted or there was an error.</CardDescription></CardHeader><CardContent><Button onClick={() => router.push('/dashboard/assessments')}>Back to My Assessments</Button></CardContent></Card></div>;
    }

    return (
         <div className="relative min-h-full w-full p-4 md:p-8">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
            
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8">
                <div>
                     <Button variant="ghost" onClick={() => router.push('/dashboard/assessments')} className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to All Assessments</Button>
                    <h1 className="text-4xl font-bold">{currentAttempt.roleName} - Results</h1>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {history.length > 1 && (
                         <Select value={currentAttempt.id} onValueChange={(id) => setCurrentAttempt(history.find(h => h.id === id) || null)}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="View history..." />
                            </SelectTrigger>
                            <SelectContent>
                                {history.map((h, i) => (
                                    <SelectItem key={h.id} value={h.id}>
                                        Attempt {i+1} - {new Date(h.submittedAt!).toLocaleDateString()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download Report (PDF)</Button>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2, staggerChildren: 0.1 } }} className="space-y-6">
                <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InfoCard title="Final Score" value={`${Math.round(currentAttempt.finalScore!)}%`} />
                    <InfoCard title="Completion Time" value={`${Math.round((currentAttempt.submittedAt! - currentAttempt.startedAt) / 1000 / 60)} mins`} />
                    <InfoCard title="Date" value={new Date(currentAttempt.submittedAt!).toLocaleDateString()} />
                </motion.div>

                 {history.length > 1 && (
                     <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart /> Score Progression</CardTitle>
                             <CardDescription>
                                Your score across all {history.length} attempts for the {currentAttempt.roleName} assessment.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={progressChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background) / 0.8)', borderColor: 'hsl(var(--border))' }}/>
                                    <Line type="monotone" dataKey="score" strokeWidth={2} stroke="hsl(var(--primary))" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
                
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
                            {currentAttempt.aiFeedback ? (
                                <>
                                    <p className="font-semibold text-muted-foreground">{currentAttempt.aiFeedback.overall}</p>
                                    <Separator />
                                    <h4 className="font-bold">Suggestions:</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {currentAttempt.aiFeedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
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
                             {(currentAttempt.questionsWithAnswers || []).map((qa, index) => (
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
