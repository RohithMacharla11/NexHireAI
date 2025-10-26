'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, BookOpen, Lightbulb, Youtube, Newspaper, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateLearningPlan } from '@/ai/flows/generate-learning-plan-flow';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface LearningResource {
    title: string;
    type: 'article' | 'video';
    url: string;
    description: string;
    skill: string;
}

export default function AILearningPage() {
    const { user, isLoading: authLoading, profileData, isProfileLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [resources, setResources] = useState<LearningResource[]>([]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleGeneratePlan = async () => {
        if (!profileData?.candidateSpecific?.skills?.length) {
            toast({
                title: 'Profile Incomplete',
                description: 'Please add skills to your profile for personalized recommendations.',
                variant: 'destructive',
            });
            router.push('/profile/me');
            return;
        }

        setIsGenerating(true);
        toast({
            title: 'Generating Your Learning Plan...',
            description: 'Our AI is finding the best resources to help you grow.',
        });

        try {
            const result = await generateLearningPlan({
                skills: profileData.candidateSpecific.skills,
                existingKnowledge: profileData.candidateSpecific.bio || '',
            });
            setResources(result.resources);
            toast({
                title: 'Learning Plan Ready!',
                description: 'Here are your AI-curated learning resources.',
            });
        } catch (error) {
            console.error("Error generating learning plan:", error);
            toast({
                title: 'Generation Failed',
                description: (error as Error).message || "An unknown error occurred.",
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
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
                <BookOpen /> AI Learning Hub
            </motion.h1>

            <AnimatePresence mode="wait">
                {isGenerating ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <p className="mt-4 text-lg font-semibold">Curating resources...</p>
                    </motion.div>
                ) : resources.length > 0 ? (
                    <motion.div 
                        key="resources"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    >
                        {resources.map((resource, index) => (
                             <motion.div
                                key={index}
                                variants={{
                                    hidden: { y: 20, opacity: 0 },
                                    visible: { y: 0, opacity: 1 }
                                }}
                            >
                                <Card className="h-full flex flex-col bg-card/60 backdrop-blur-sm border-border/20 shadow-lg hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300">
                                    <CardHeader>
                                        <CardTitle className="flex items-start gap-3">
                                            {resource.type === 'video' ? <Youtube className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" /> : <Newspaper className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />}
                                            <span>{resource.title}</span>
                                        </CardTitle>
                                        <Badge variant="secondary" className="w-fit">{resource.skill}</Badge>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground">{resource.description}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button asChild className="w-full">
                                            <Link href={resource.url} target="_blank" rel="noopener noreferrer">
                                                {resource.type === 'video' ? 'Watch Video' : 'Read Article'}
                                            </Link>
                                        </Button>
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
                                    <Lightbulb className="text-primary" /> Personalized Learning, Powered by AI
                                </CardTitle>
                                <CardDescription>Generate a custom-tailored list of articles and videos to help you master the skills you need for your dream job.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button size="lg" onClick={handleGeneratePlan}>
                                    <BookOpen className="mr-2 h-5 w-5" /> Generate My Learning Plan
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
