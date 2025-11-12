
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Bot, Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyzeResume } from '@/ai/flows/analyze-resume-flow';
import type { AnalysisSummary } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function AIJobRecommenderPage() {
    const { user, isLoading: authLoading, profileData, isProfileLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisSummary | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleRunAnalysis = async () => {
        if (!profileData) {
             toast({
                title: 'Profile Incomplete',
                description: 'Please complete your profile to get AI recommendations.',
                variant: 'destructive',
            });
            router.push('/profile/me');
            return;
        }

        const { candidateSpecific } = profileData;
        if (!candidateSpecific?.skills?.length || !candidateSpecific?.bio) {
            toast({
                title: 'Profile Incomplete',
                description: 'Please add skills and a bio to your profile for an accurate analysis.',
                variant: 'destructive',
            });
            router.push('/profile/me');
            return;
        }

        setIsAnalyzing(true);
        toast({
            title: 'Analyzing Your Profile...',
            description: 'Our AI is crafting personalized job recommendations for you.',
        });

        try {
            const result = await analyzeResume({
                skills: candidateSpecific.skills,
                bio: candidateSpecific.bio,
                experienceLevel: candidateSpecific.experienceLevel || 'Fresher',
            });
            setAnalysisResult(result);
            toast({
                title: 'Analysis Complete!',
                description: 'Here are your top job matches.',
            });
        } catch (error) {
            console.error("Error running resume analysis:", error);
            toast({
                title: 'Analysis Failed',
                description: "The AI service is currently busy. Please try again in a moment.",
                variant: 'destructive',
            });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const isLoading = authLoading || isProfileLoading;

    if (isLoading) {
        return (
          <div className="flex items-center justify-center h-full w-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        );
    }
    
    return (
        <div className="relative min-h-full w-full p-4 md:p-8">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
            
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold mb-8 flex items-center gap-3"
            >
                <Bot /> AI Job Recommender
            </motion.h1>

            <AnimatePresence mode="wait">
                {isAnalyzing ? (
                     <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Card className="max-w-2xl mx-auto bg-card/60 backdrop-blur-sm border-border/20 shadow-lg text-center p-8">
                            <CardContent className="flex flex-col items-center justify-center gap-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-lg font-semibold">Analyzing your skills...</p>
                                <p className="text-muted-foreground">The AI is evaluating your profile to find the best roles for you. This might take a moment.</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : analysisResult ? (
                    <motion.div 
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
                    >
                        {analysisResult.topRoles.map((role, index) => (
                             <motion.div
                                key={role.role}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.15 }}
                            >
                                <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-center">
                                            <span>{role.role}</span>
                                            <Badge variant={role.score > 80 ? "default" : "secondary"}>{role.score}% Match</Badge>
                                        </CardTitle>
                                        <div className="pt-2">
                                            <Progress value={role.score} />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-3">Based on your skills in React, Next.js, and AI development.</p>
                                    </CardContent>
                                    <CardFooter className="flex-col items-start gap-2">
                                         <Button className="w-full">View Similar Jobs</Button>
                                         <Button variant="outline" className="w-full">Improve Match Score</Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                     <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Card className="max-w-2xl mx-auto bg-card/60 backdrop-blur-sm border-border/20 shadow-lg text-center p-8">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                                    <Sparkles className="text-primary" /> Unlock Your Career Path
                                </CardTitle>
                                <CardDescription>Let our AI analyze your profile to recommend the perfect job roles for your skills and experience.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button size="lg" onClick={handleRunAnalysis}>
                                    <Bot className="mr-2 h-5 w-5" /> Analyze My Profile
                                </Button>
                                {!profileData?.candidateSpecific?.skills?.length || !profileData?.candidateSpecific?.bio ? (
                                    <div className="mt-4 text-amber-500 text-sm flex items-center justify-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Your profile is incomplete. Please add skills and a bio.</span>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
