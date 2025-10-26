'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Star, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateSkillMatrix } from '@/ai/flows/generate-skill-matrix-flow';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';

interface SkillMatrix {
    skill: string;
    proficiency: number;
    description: string;
}

interface LearningPlanItem {
    task: string;
    category: string;
    estHours: number;
}

interface SkillMasterResult {
    skillMatrix: SkillMatrix[];
    learningPlan: LearningPlanItem[];
}

export default function AISkillMasterPage() {
    const { user, isLoading: authLoading, profileData, isProfileLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<SkillMasterResult | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleGenerate = async () => {
        if (!profileData?.candidateSpecific?.skills?.length) {
            toast({
                title: 'Profile Incomplete',
                description: 'Please add some skills to your profile to generate your Skill Matrix.',
                variant: 'destructive',
            });
            router.push('/profile/me');
            return;
        }

        setIsGenerating(true);
        toast({
            title: 'Generating Your Skill Matrix...',
            description: 'Our AI is analyzing your profile to build your personalized skill map.',
        });

        try {
            const res = await generateSkillMatrix({
                skills: profileData.candidateSpecific.skills,
                bio: profileData.candidateSpecific.bio || '',
            });
            setResult(res);
            toast({
                title: 'Skill Matrix Generated!',
                description: 'Explore your personalized skill map and learning plan.',
            });
        } catch (error) {
            console.error("Error generating skill matrix:", error);
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

    const chartData = result?.skillMatrix.map(skill => ({
        subject: skill.skill,
        A: skill.proficiency,
        fullMark: 10,
    })) || [];
    
    return (
        <div className="relative min-h-full w-full p-4 md:p-8">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
            
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold mb-8 flex items-center gap-3"
            >
                <Star /> AI Skill Master
            </motion.h1>

            <AnimatePresence mode="wait">
                {isGenerating ? (
                     <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <p className="mt-4 text-lg font-semibold">Building your skill universe...</p>
                    </motion.div>
                ) : result ? (
                    <motion.div 
                        key="results"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: {},
                            visible: { transition: { staggerChildren: 0.1 } }
                        }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                         <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                            <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                                <CardHeader>
                                    <CardTitle>Your Skill Matrix</CardTitle>
                                    <CardDescription>A visual representation of your proficiency.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-96">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                            <PolarGrid stroke="hsl(var(--border))" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                            <Radar name="Proficiency" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                            <Tooltip contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))'
                                            }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </motion.div>
                         <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                            <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                                <CardHeader>
                                    <CardTitle>Personalized Learning Plan</CardTitle>
                                    <CardDescription>Actionable steps to level up your skills.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     {result.learningPlan.map((item, index) => (
                                        <div key={index} className="p-3 bg-background/50 rounded-lg border">
                                            <p className="font-semibold">{item.task}</p>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                                <Badge variant="outline">{item.category}</Badge>
                                                <span>Est. {item.estHours} hours</span>
                                            </div>
                                        </div>
                                     ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Card className="max-w-2xl mx-auto bg-card/60 backdrop-blur-sm border-border/20 shadow-lg text-center p-8">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                                    <Lightbulb className="text-primary" /> Map Your Skills, Master Your Career
                                </CardTitle>
                                <CardDescription>Generate a personalized skill matrix and a targeted learning plan to guide your professional development.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button size="lg" onClick={handleGenerate}>
                                    <Star className="mr-2 h-5 w-5" /> Generate My Skill Matrix
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
