
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, Query, getDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Trophy, BarChart, BrainCircuit } from 'lucide-react';
import type { AssessmentAttempt, Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { firestore } = initializeFirebase();
  const [attempts, setAttempts] = useState<(AssessmentAttempt & { roleName?: string })[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !firestore) return;

    const attemptsQuery: Query = query(collection(firestore, 'users', user.id, 'assessments'), orderBy('submittedAt', 'desc'));
    
    const unsubscribe = onSnapshot(attemptsQuery, async (querySnapshot) => {
      const attemptsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const attempt = { id: docSnapshot.id, ...docSnapshot.data() } as AssessmentAttempt;
        const roleDocRef = doc(firestore, 'roles', attempt.roleId);
        const roleDoc = await getDoc(roleDocRef);
        const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'Unknown Role';
        return { ...attempt, roleName };
      }));
      setAttempts(attemptsData);
      setIsFetching(false);
    }, (error) => {
      console.error("Error fetching assessment attempts:", error);
      setIsFetching(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const latestAttempt = useMemo(() => attempts.length > 0 ? attempts[0] : null, [attempts]);

  const skillScoresData = useMemo(() => {
    if (!latestAttempt?.skillScores) return [];
    return Object.entries(latestAttempt.skillScores).map(([skill, score]) => ({
        subject: skill.charAt(0).toUpperCase() + skill.slice(1),
        A: score,
        fullMark: 100,
    }));
  }, [latestAttempt]);

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, },
  };

  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] w-full bg-secondary">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      <div className="container mx-auto px-4 py-8 md:px-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold mb-8"
        >
          Welcome, {user?.name}
        </motion.h1>
        
        <AnimatePresence mode="wait">
            {!latestAttempt ? (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg text-center p-8">
                        <CardHeader>
                            <CardTitle className="text-2xl">No Assessments Taken Yet</CardTitle>
                            <CardDescription>Your performance analytics and learning path will appear here once you complete an assessment.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => router.push('/skill-assessment')}>Take Your First Assessment</Button>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
                <motion.div 
                  key="dashboard-content"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div variants={itemVariants}>
                            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Latest Result: {latestAttempt.roleName}</span>
                                        <span className="text-sm font-normal text-muted-foreground">{new Date(latestAttempt.submittedAt!).toLocaleDateString()}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                    <div className="relative h-48 w-48 mx-auto">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <path className="text-secondary/50" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <motion.path 
                                                className="text-primary" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"
                                                initial={{ strokeDasharray: `0, 100` }}
                                                animate={{ strokeDasharray: `${latestAttempt.finalScore}, 100` }}
                                                transition={{ duration: 1, ease: "easeInOut" }}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-bold">{Math.round(latestAttempt.finalScore!)}</span>
                                            <span className="text-muted-foreground">Score</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Card className="bg-background/40">
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2"><BrainCircuit /> AI Feedback</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latestAttempt.aiFeedback}</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                         <motion.div variants={itemVariants}>
                            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                                <CardHeader><CardTitle>Skill-wise Performance</CardTitle></CardHeader>
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
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <motion.div variants={itemVariants}>
                            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                                <CardHeader><CardTitle className="flex items-center gap-2"><Trophy /> Gamification</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="flex justify-between items-center">
                                        <span className="font-medium">Experience Points</span>
                                        <span className="font-bold text-primary">{user?.xp || 0} XP</span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium mb-2">Badges</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {user?.badges?.length ? user.badges.map(b => <Badge key={b} variant="secondary">{b}</Badge>) : <p className="text-sm text-muted-foreground">No badges yet.</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart /> Past Assessments</CardTitle></CardHeader>
                                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                                    {attempts.map(attempt => (
                                        <div key={attempt.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                                            <div>
                                                <p className="font-semibold">{attempt.roleName}</p>
                                                <p className="text-sm text-muted-foreground">{new Date(attempt.submittedAt!).toLocaleDateString()}</p>
                                            </div>
                                            <div className="font-bold text-lg">{Math.round(attempt.finalScore!)}</div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
