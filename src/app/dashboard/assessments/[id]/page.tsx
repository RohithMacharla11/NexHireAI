
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AssessmentAttempt, Role, Question, UserResponse } from '@/lib/types';
import { Loader2, ArrowLeft, Download, BarChart, BrainCircuit, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CodeEditor } from '@/components/assessment/CodeEditor';


export default function AssessmentResultPage() {
    const { user, isLoading: authLoading, profileData } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { firestore } = initializeFirebase();
    const [attempt, setAttempt] = useState<(AssessmentAttempt & { roleName?: string, questionsWithAnswers?: (Question & UserResponse)[] }) | null>(null);
    const [isFetching, setIsFetching] = useState(true);

    const userIdToFetch = profileData?.role === 'admin' && params.userId ? params.userId as string : user?.id;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user || !firestore || !params.id) return;

        const fetchAttempt = async () => {
            setIsFetching(true);
            const pathUserId = params.userId as string || user.id;

            try {
                const attemptId = params.id as string;
                const attemptDocRef = doc(firestore, 'users', pathUserId, 'assessments', attemptId);
                const attemptDoc = await getDoc(attemptDocRef);

                if (!attemptDoc.exists()) {
                    setAttempt(null);
                    return;
                }

                const attemptData = { id: attemptDoc.id, ...attemptDoc.data() } as AssessmentAttempt;
                
                const roleDocRef = doc(firestore, 'roles', attemptData.roleId);
                const roleDoc = await getDoc(roleDocRef);
                const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'Unknown Role';

                let questionsFromDb: Question[] = [];
                const questionsCollectionRef = collection(firestore, `roles/${attemptData.roleId}/questions`);
                const questionsSnapshot = await getDocs(questionsCollectionRef);
                questionsFromDb = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
                
                const questionsWithAnswers = attemptData.responses.map(res => {
                    const question = questionsFromDb.find(q => q.id === res.questionId) || { id: res.questionId, questionText: 'Question not found', type: 'short', difficulty: 'Medium', timeLimit: 0, tags: [], skill: 'unknown' };
                    return { ...question, ...res };
                });

                setAttempt({ ...attemptData, roleName, questionsWithAnswers });

            } catch (error) {
                console.error("Error fetching assessment result:", error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchAttempt();
    }, [user, firestore, params.id, params.userId]);

    const containerVariants = {
        hidden: { opacity: 1 },
        visible: { transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    if (isFetching || authLoading) {
        return (
          <div className="flex items-center justify-center h-full w-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        );
    }
    
    if (!attempt) {
        return (
             <div className="flex items-center justify-center h-full w-full">
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg text-center p-8">
                    <CardHeader>
                        <CardTitle>Assessment Not Found</CardTitle>
                        <CardDescription>We couldn't find the assessment result you're looking for.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard/assessments')}>Back to Assessments</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const skillScoresData = Object.entries(attempt.skillScores || {})
      .filter(([, score]) => typeof score === 'number')
      .map(([skill, score]) => ({
        subject: skill.charAt(0).toUpperCase() + skill.slice(1),
        A: score,
        fullMark: 100,
    }));
    
    const completionTime = attempt.submittedAt && attempt.startedAt
        ? Math.round((attempt.submittedAt - attempt.startedAt) / 1000 / 60)
        : 'N/A';

    return (
         <div className="relative min-h-full w-full p-4 md:p-8">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
            
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
                <div>
                     <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <h1 className="text-4xl font-bold">{attempt.roleName} - Results</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download Report (PDF)</Button>
                </div>
            </motion.div>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InfoCard title="Final Score" value={`${Math.round(attempt.finalScore!)}%`} />
                    <InfoCard title="Completion Time" value={`${completionTime} mins`} />
                    <InfoCard title="Date" value={new Date(attempt.submittedAt!).toLocaleDateString()} />
                </motion.div>
                
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <Card className="lg:col-span-3 bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart /> Skill-wise Performance</CardTitle></CardHeader>
                        <CardContent className="h-[300px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillScoresData}>
                                    <PolarGrid stroke="hsl(var(--border))" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
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

                 <motion.div variants={itemVariants}>
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

    