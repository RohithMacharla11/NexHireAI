
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useAssessmentStore } from '@/hooks/use-assessment-store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Timer, Loader2, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AssessmentAttempt, UserResponse } from '@/lib/types';
import { CodeEditor } from '@/components/assessment/CodeEditor';
import { scoreAssessment } from '@/ai/flows/score-assessment-flow';

const AssessmentRunner = () => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { firestore } = initializeFirebase();
  const [isSubmitting, startSubmitting] = useTransition();
  
  const { user, isLoading: authLoading } = useAuth();
  const {
    assessment,
    responses,
    currentQuestionIndex,
    startTime,
    nextQuestion,
    prevQuestion,
    setResponse,
    reset,
    isHydrated,
  } = useAssessmentStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Redirect if user is not logged in or assessment is not loaded
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    // Only check for assessment after the store has been hydrated from localStorage
    if (isHydrated && !assessment) {
      toast({ title: "Assessment session not found.", description: "Please start a new assessment.", variant: "destructive" });
      router.push('/skill-assessment');
    }
  }, [user, authLoading, router, assessment, toast, isHydrated]);

  // Timer logic
  useEffect(() => {
    if (!startTime || !assessment) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = assessment.totalTimeLimit - elapsed;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!isSubmitting) { // Ensure handleSubmit isn't already running
           toast({ title: "Time's up!", description: "Submitting your assessment automatically." });
           handleSubmit();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, assessment]);

  const handleSubmit = () => {
    if (!user || !assessment) {
        toast({ title: "Error", description: "User or assessment data not found.", variant: "destructive" });
        return;
    }
    
    startSubmitting(async () => {
      toast({ title: "Submitting Assessment", description: "Evaluating your answers and generating feedback. Please wait." });

      const finalResponses: UserResponse[] = Object.values(responses).map(r => ({
        ...r,
        questionId: r.questionId || '',
        timeTaken: (Date.now() - startTime!) / 1000 / assessment.questions.length, // Approximate
        skill: r.skill || '',
        difficulty: r.difficulty || 'Easy',
      }));

      const attemptShell: Omit<AssessmentAttempt, 'id' | 'finalScore' | 'skillScores' | 'aiFeedback' | 'responses'> & { responses: UserResponse[] } = {
          userId: user.id,
          assessmentId: assessment.id,
          roleId: assessment.roleId,
          startedAt: startTime!,
          submittedAt: Date.now(),
          responses: finalResponses,
          questions: assessment.questions, // Pass full question data for scoring
      };

      try {
          const scoredAttempt = await scoreAssessment(attemptShell);
          const attemptToSave = { ...scoredAttempt };
          // @ts-ignore
          delete attemptToSave.questions; // Don't save full questions back to the attempt doc

          const attemptDocRef = doc(firestore, `users/${user.id}/assessments`, assessment.id);
          await setDoc(attemptDocRef, attemptToSave);
          
          toast({ title: "Assessment Submitted!", description: "Your results are now available on your dashboard." });
          reset();
          router.push('/dashboard');

      } catch (error) {
          console.error("Error submitting and scoring assessment:", error);
          const errorMessage = (error as Error).message || "Could not save and score your assessment.";
          const userFriendlyMessage = errorMessage.includes("429") 
            ? "Submission failed due to high traffic. Please wait a moment and try again."
            : errorMessage;
          toast({ title: "Submission Failed", description: userFriendlyMessage, variant: "destructive" });
      }
    });
  };


  if (authLoading || !assessment || !isHydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading Assessment...</p>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const currentResponse = responses[currentQuestion.id];

  const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    setResponse(currentQuestion.id, { answer: value });
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary p-4">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <Card className="w-full max-w-6xl mx-auto bg-card/70 backdrop-blur-sm border-border/20 shadow-xl">
        <CardHeader className="border-b sticky top-[80px] bg-card/80 backdrop-blur-sm z-20">
           <div className="flex justify-between items-center">
             <CardTitle className="text-2xl">{assessment.roleName} Assessment</CardTitle>
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                <Timer className="h-5 w-5" />
                <span>{timeLeft !== null ? formatTime(timeLeft) : 'Loading...'}</span>
             </div>
           </div>
           <div className="pt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-1 text-center">Question {currentQuestionIndex + 1} of {assessment.questions.length}</p>
           </div>
        </CardHeader>
        
        <div className="overflow-y-auto">
             {currentQuestion.type === 'coding' ? (
                <CodeEditor 
                    question={currentQuestion}
                    code={currentResponse?.code || currentQuestion.starterCode || ''}
                    onCodeChange={(code) => setResponse(currentQuestion.id, { code })}
                    language={currentResponse?.language || 'javascript'}
                    onLanguageChange={(lang) => setResponse(currentQuestion.id, { language: lang })}
                    executionResult={currentResponse?.executionResult}
                    onRunComplete={(result) => setResponse(currentQuestion.id, { executionResult: result })}
                />
            ) : (
            <CardContent className="p-6 md:p-8 min-h-[400px]">
                <h2 className="text-xl font-semibold mb-4">{currentQuestion.questionText}</h2>

                {currentQuestion.type === 'mcq' && (
                    <RadioGroup 
                        onValueChange={handleAnswerChange}
                        value={currentResponse?.answer}
                        className="space-y-3"
                    >
                        {currentQuestion.options?.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="text-base cursor-pointer">{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}

                {currentQuestion.type === 'short' && (
                    <Textarea 
                        placeholder="Your answer..." 
                        className="text-base"
                        rows={6}
                        value={currentResponse?.answer || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                    />
                )}
            </CardContent>
            )}
        </div>

        <CardFooter className="flex justify-between border-t pt-6 sticky bottom-0 bg-card/80 backdrop-blur-sm z-10">
            <Button variant="outline" onClick={prevQuestion} disabled={currentQuestionIndex === 0 || isSubmitting}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            {currentQuestionIndex === assessment.questions.length - 1 ? (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                </Button>
            ) : (
                <Button onClick={nextQuestion} disabled={isSubmitting}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default AssessmentRunner;
