
'use client';

import { useEffect, useState } from 'react';
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
import { AlertTriangle, Timer, Loader2, ChevronLeft, ChevronRight, CheckCircle, Send } from 'lucide-react';

const AssessmentRunner = () => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
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
  } = useAssessmentStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Redirect if user is not logged in or assessment is not loaded
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!assessment) {
      // Maybe they refreshed the page. Send them back.
      // A more robust solution might use localStorage to persist assessment state.
      if (!authLoading && user) { // only redirect if we are sure we are logged in
         toast({ title: "Assessment session not found.", description: "Please start a new assessment.", variant: "destructive" });
         router.push('/skill-assessment');
      }
    }
  }, [user, authLoading, router, assessment, toast]);

  // Timer logic
  useEffect(() => {
    if (!startTime || !assessment) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = assessment.totalTimeLimit - elapsed;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Handle submission on timeout
        toast({ title: "Time's up!", description: "Submitting your assessment." });
        // handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, assessment, toast]);

  if (authLoading || !assessment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const currentResponse = responses[currentQuestion.id];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    if (currentQuestion.type === 'mcq') {
       setResponse(currentQuestion.id, { answer: value });
    } else if (currentQuestion.type === 'short') {
       setResponse(currentQuestion.id, { answer: value });
    }
  }

  const handleSubmit = () => {
    // TODO: Implement submission logic to save to Firestore
    toast({ title: "Submitting Assessment", description: "This is a placeholder. Answers are not yet saved." });
    console.log("Final Responses:", responses);
    // After submission...
    // reset();
    // router.push('/dashboard');
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary flex items-center justify-center p-4">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <Card className="w-full max-w-4xl bg-card/70 backdrop-blur-sm border-border/20 shadow-xl">
        <CardHeader className="border-b">
           <div className="flex justify-between items-center">
             <CardTitle className="text-2xl">Skill Assessment</CardTitle>
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
        <CardContent className="p-6 md:p-8 min-h-[300px]">
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

            {currentQuestion.type === 'coding' && (
                <div className="text-muted-foreground p-4 border-dashed border rounded-md">
                    <AlertTriangle className="inline-block mr-2 h-5 w-5" />
                    Coding question UI is under development.
                </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevQuestion} disabled={currentQuestionIndex === 0}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            {currentQuestionIndex === assessment.questions.length - 1 ? (
                <Button onClick={handleSubmit}>
                    Submit Assessment <Send className="ml-2 h-4 w-4" />
                </Button>
            ) : (
                <Button onClick={nextQuestion}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default AssessmentRunner;
