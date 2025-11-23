
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AssessmentAttempt, Role, Question, UserResponse } from '@/lib/types';
import { Loader2, ArrowLeft, Download, BarChart, BrainCircuit, CheckCircle, XCircle, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CodeEditor } from '@/components/assessment/CodeEditor';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Helper component to display detailed coding feedback
const CodingFeedback = ({ executionResult }: { executionResult: any[] }) => {
  if (!executionResult || executionResult.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Terminal className="h-4 w-4" /> Code Execution Results
      </h4>
      {executionResult.map((result, idx) => (
        <div key={idx} className={`p-3 rounded-md text-xs font-mono border ${result.status === 'Passed' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex justify-between mb-2 font-bold">
            <span className={result.status === 'Passed' ? 'text-green-600' : 'text-red-600'}>
              Test Case {idx + 1}: {result.status}
            </span>
            <span className="text-muted-foreground">{result.time}</span>
          </div>
          
          {result.status === 'Failed' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-muted-foreground mb-1">Your Output:</span>
                <div className="bg-background p-2 rounded border border-border/50 whitespace-pre-wrap">
                  {result.output}
                </div>
              </div>
              <div>
                <span className="block text-muted-foreground mb-1">Expected Output:</span>
                <div className="bg-background p-2 rounded border border-border/50 whitespace-pre-wrap">
                  {result.expectedOutput}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};


type AttemptWithDetails = AssessmentAttempt & {
    roleName?: string;
    questionsWithAnswers?: (Question & UserResponse)[];
};

export default function AdminAssessmentResultPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { firestore } = initializeFirebase();
    const { toast } = useToast();
    
    const [currentAttempt, setCurrentAttempt] = useState<AttemptWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const attemptId = params.attemptId as string;
    const userId = searchParams.get('userId');

    const getDetailedAttempt = async (attemptData: AssessmentAttempt): Promise<AttemptWithDetails> => {
        let roleName = 'Unknown Role';
        if (attemptData.roleId) {
            try {
                const roleDocRef = doc(firestore, 'roles', attemptData.roleId);
                const roleDoc = await getDoc(roleDocRef);
                if (roleDoc.exists()) {
                    roleName = (roleDoc.data() as Role).name;
                }
            } catch (e) { console.error("Could not fetch role name", e) }
        }
        
        let questionsWithAnswers: (Question & UserResponse)[] = [];
        const questionsSource = attemptData.questionSnapshots || [];
        
        if (questionsSource.length > 0 && attemptData.responses) {
             questionsWithAnswers = attemptData.responses
                .map(res => {
                    const question = questionsSource.find(q => q.id === res.questionId);
                    if (!question) return null;
                    return { ...question, ...res };
                })
                .filter(Boolean) as (Question & UserResponse)[];
        }
        
        return { ...attemptData, roleName, questionsWithAnswers };
    }

    useEffect(() => {
        if (!userId || !firestore || !attemptId) {
            if(!isLoading) {
                toast({ title: "Missing Information", description: "User ID or Attempt ID not found in URL.", variant: "destructive" });
                router.back();
            }
            return;
        }

        const fetchAttempt = async () => {
            setIsLoading(true);
            try {
                const attemptDocRef = doc(firestore, 'users', userId, 'assessments', attemptId);
                const attemptSnap = await getDoc(attemptDocRef);

                if (!attemptSnap.exists()) {
                    toast({ title: "Assessment attempt not found.", variant: "destructive" });
                    setCurrentAttempt(null);
                    return;
                }

                const attemptData = { ...attemptSnap.data(), docId: attemptSnap.id } as AssessmentAttempt;
                const detailedAttempt = await getDetailedAttempt(attemptData);
                setCurrentAttempt(detailedAttempt);

            } catch (error) {
                console.error("Error fetching assessment result:", error);
                toast({ title: "Error", description: "Failed to fetch assessment result.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttempt();
    }, [userId, firestore, attemptId, router, toast]);

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


    if (isLoading || authLoading) {
        return <div className="flex items-center justify-center h-full w-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!currentAttempt) {
        return <div className="flex items-center justify-center h-full w-full"><Card className="text-center p-8"><CardHeader><CardTitle>Assessment Not Found</CardTitle><CardDescription>We couldn't find the result you're looking for. It may have been deleted or there was an error.</CardDescription></CardHeader><CardContent><Button onClick={() => router.back()}>Go Back</Button></CardContent></Card></div>;
    }

    return (
         <div className="relative min-h-full w-full p-4 md:p-8">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
            
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8">
                <div>
                     <Button variant="ghost" onClick={() => router.back()} className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Leaderboard</Button>
                    <h1 className="text-4xl font-bold">{currentAttempt.roleName} - Results</h1>
                     <CardDescription>Viewing result for {currentAttempt.userId}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download Report (PDF)</Button>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2, staggerChildren: 0.1 } }} className="space-y-6">
                <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InfoCard title="Final Score" value={`${Math.round(currentAttempt.finalScore!)}%`} />
                    <InfoCard title="Completion Time" value={`${Math.round((currentAttempt.submittedAt! - currentAttempt.startedAt) / 1000 / 60)} mins`} />
                    <InfoCard title="Date" value={new Date(currentAttempt.submittedAt!).toLocaleDateString()} />
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
                                                <p><strong>Answer:</strong> <span className={qa.isCorrect ? 'text-green-500' : 'text-red-500'}>{qa.answer || "No answer"}</span></p>
                                                {!qa.isCorrect && <p><strong>Correct Answer:</strong> {qa.correctAnswer}</p>}
                                            </div>
                                        )}
                                        {qa.type === 'short' && (
                                            <div className="space-y-2 text-sm">
                                                <p><strong>Answer:</strong></p>
                                                <pre className="p-2 bg-muted rounded-md whitespace-pre-wrap font-sans">{qa.answer || "No answer"}</pre>
                                                <p><strong>Correct Answer:</strong></p>
                                                <pre className="p-2 bg-muted rounded-md whitespace-pre-wrap font-sans">{qa.correctAnswer}</pre>
                                            </div>
                                        )}
                                        {qa.type === 'coding' && (
                                             <div className="space-y-4">
                                                <CodeEditor 
                                                    question={qa}
                                                    response={qa}
                                                    onResponseChange={() => {}}
                                                    isReadOnly={true}
                                                />
                                                {qa.executionResult && (
                                                    <CodingFeedback executionResult={qa.executionResult} />
                                                )}
                                            </div>
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

