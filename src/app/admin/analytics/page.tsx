
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BarChart, Users, NotebookPen, Target, TrendingUp, Crown, Medal, Gem, ArrowRight, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { collection, collectionGroup, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { User, AssessmentAttempt, Role } from '@/lib/types';
import { subMonths, format, startOfMonth } from 'date-fns';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

// A more robust helper to reliably get a timestamp in milliseconds from Firestore data
const getTimestamp = (timestamp: any): number => {
    if (!timestamp) return 0;
    // Handle server-generated Timestamps (e.g., from serverTimestamp())
    if (timestamp && typeof timestamp.seconds === 'number') {
        return timestamp.seconds * 1000;
    }
    // Handle client-generated numbers (e.g., from Date.now())
    if (typeof timestamp === 'number') {
        return timestamp;
    }
    return 0;
};


export default function AnalyticsPage() {
    const { firestore } = initializeFirebase();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        newCandidates: 0,
        assessmentsTaken: 0,
        avgScore: 0,
        hiringRate: 0
    });
    const [growthData, setGrowthData] = useState<{ month: string; Candidates: number }[]>([]);
    const [funnelData, setFunnelData] = useState<{ stage: string; value: number; color: string }[]>([]);
    const [leaderboard, setLeaderboard] = useState<(User & { score: number; time: number; role: string })[]>([]);

    useEffect(() => {
        if (!firestore) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Queries
                const usersQuery = query(collection(firestore, 'users'), where('role', '==', 'candidate'));
                const attemptsQuery = query(collectionGroup(firestore, 'assessments'), orderBy('submittedAt', 'desc'));
                
                const [userSnap, attemptSnap] = await Promise.all([
                    getDocs(usersQuery),
                    getDocs(attemptsQuery)
                ]);

                // --- Process Stats ---
                const now = new Date();
                const oneMonthAgo = subMonths(now, 1).getTime();
                
                const newCandidatesCount = userSnap.docs.filter(doc => {
                    const data = doc.data() as User;
                    const createdAt = getTimestamp(data.createdAt); // Use robust helper
                    return createdAt > oneMonthAgo;
                }).length;

                const totalAttempts = attemptSnap.size;
                const totalScore = attemptSnap.docs.reduce((acc, doc) => acc + (doc.data().finalScore || 0), 0);
                const avgScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
                
                // Hiring rate is complex, so we'll mock it for now
                const hiringRate = 8; 

                setStats({
                    newCandidates: newCandidatesCount,
                    assessmentsTaken: totalAttempts,
                    avgScore: avgScore,
                    hiringRate: hiringRate
                });

                // --- Process Growth Data ---
                const monthlyData: Record<string, { Candidates: number }> = {};
                for (let i = 5; i >= 0; i--) {
                    monthlyData[format(subMonths(now, i), 'MMM')] = { Candidates: 0 };
                }
                userSnap.docs.forEach(doc => {
                     const c = doc.data() as User;
                     const createdAt = getTimestamp(c.createdAt); // Use robust helper
                     if (createdAt) {
                         const joinDate = new Date(createdAt);
                         if (joinDate >= startOfMonth(subMonths(now, 5))) {
                            const month = format(joinDate, 'MMM');
                            if (monthlyData[month]) monthlyData[month].Candidates++;
                         }
                     }
                });
                setGrowthData(Object.entries(monthlyData).map(([month, values]) => ({ month, ...values })));

                // --- Process Funnel Data ---
                // Mocked based on total candidates as a baseline
                const totalApplied = userSnap.size;
                setFunnelData([
                    { stage: 'Applied', value: totalApplied, color: 'hsl(var(--chart-1))' },
                    { stage: 'Shortlisted', value: Math.round(totalApplied * 0.3), color: 'hsl(var(--chart-2))' },
                    { stage: 'Screened', value: Math.round(totalApplied * 0.2), color: 'hsl(var(--chart-3))' },
                    { stage: 'Interviewed', value: Math.round(totalApplied * 0.1), color: 'hsl(var(--chart-4))' },
                    { stage: 'Hired', value: Math.round(totalApplied * 0.02), color: 'hsl(var(--chart-5))' },
                ]);
                
                // --- Process Leaderboard Data ---
                 const topAttempts = attemptSnap.docs
                    .sort((a,b) => (b.data().finalScore || 0) - (a.data().finalScore || 0))
                    .slice(0, 4);

                 const leaderboardUsers = await Promise.all(
                     topAttempts.map(async (attemptDoc) => {
                         const attemptData = attemptDoc.data() as AssessmentAttempt;
                         const userId = attemptDoc.ref.parent.parent?.id; // Get userId from path
                         if (!userId) return null;
                         
                         const userDoc = await getDoc(doc(firestore, 'users', userId));
                         if (!userDoc.exists()) return null;
                         const userData = userDoc.data() as User;

                         // Fetch role name from roleId
                         let roleName = 'Practice Test';
                         if (attemptData.roleId) {
                            try {
                                const roleDoc = await getDoc(doc(firestore, 'roles', attemptData.roleId));
                                if (roleDoc.exists()) roleName = (roleDoc.data() as Role).name;
                            } catch {}
                         }
                         
                         const submittedAt = getTimestamp(attemptData.submittedAt); // Use robust helper
                         const startedAt = getTimestamp(attemptData.startedAt); // Use robust helper

                         return {
                             ...userData,
                             score: Math.round(attemptData.finalScore || 0),
                             time: submittedAt && startedAt ? Math.round((submittedAt - startedAt) / 60000) : 0,
                             role: roleName,
                         };
                     })
                 );
                 setLeaderboard(leaderboardUsers.filter(Boolean) as any);

            } catch (error) {
                console.error("Failed to fetch analytics data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [firestore]);
    
    if(isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <motion.div 
            className="p-8 space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Key insights into your recruitment pipeline and platform performance.</p>
            </motion.div>

            <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <StatCard icon={<Users />} title="New Candidates" value={`+${stats.newCandidates}`} change="in the last 30 days" />
                <StatCard icon={<NotebookPen />} title="Assessments Taken" value={stats.assessmentsTaken.toString()} change="all time" />
                <StatCard icon={<Target />} title="Avg. Score" value={`${stats.avgScore}%`} change="across all attempts" />
                <StatCard icon={<TrendingUp />} title="Hiring Rate" value={`${stats.hiringRate}%`} change="mocked data" />
            </motion.div>
            
            <motion.div 
                variants={containerVariants}
                className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
                <motion.div variants={itemVariants} className="lg:col-span-3">
                    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg h-full">
                        <CardHeader>
                            <CardTitle>Candidate Growth</CardTitle>
                            <CardDescription>Monthly new signups over the last 6 months.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] pl-0">
                           <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                     <defs>
                                        <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ 
                                            backgroundColor: 'hsl(var(--background) / 0.8)', 
                                            borderColor: 'hsl(var(--border))',
                                            backdropFilter: 'blur(4px)',
                                        }}
                                    />
                                    <Area type="monotone" dataKey="Candidates" strokeWidth={2} stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCandidates)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg h-full">
                        <CardHeader>
                            <CardTitle>Hiring Funnel</CardTitle>
                            <CardDescription>Conversion rates across stages.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {funnelData.map((item, index) => {
                                const prevValue = index > 0 ? funnelData[index - 1].value : item.value;
                                const percentage = prevValue > 0 ? (item.value / funnelData[0].value) * 100 : 0;
                                const conversion = index > 0 && prevValue > 0 ? `(${(item.value / prevValue * 100).toFixed(1)}%)` : '';
                                return (
                                    <div key={item.stage} className="space-y-1">
                                        <div className="flex justify-between items-center text-sm font-medium">
                                            <span>{item.stage}</span>
                                            <span>{item.value} <span className="text-muted-foreground">{conversion}</span></span>
                                        </div>
                                        <Progress value={percentage} style={{'--progress-color': item.color} as any} className="[&>div]:bg-[--progress-color] h-2" />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader>
                        <CardTitle>Recent Top Performers</CardTitle>
                        <CardDescription>Top performers across recent assessments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {leaderboard.length > 0 ? (
                            <div className="space-y-4">
                                {leaderboard.map((candidate, index) => (
                                    <div key={candidate.id} className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-lg">
                                        <div className="flex items-center justify-center w-12 shrink-0">
                                            {getRankIcon(index)}
                                        </div>
                                        <Avatar>
                                            <AvatarImage src={candidate.avatarUrl} />
                                            <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow">
                                            <p className="font-semibold">{candidate.name}</p>
                                            <p className="text-sm text-muted-foreground">{candidate.role}</p>
                                        </div>
                                        <div className="w-24 text-right">
                                            <p className="font-bold text-lg">{candidate.score}%</p>
                                            <p className="text-xs text-muted-foreground">{candidate.time} min</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/candidates/${candidate.id}`)}>
                                            View Profile <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No recent assessment data to display.</p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}

const StatCard = ({ icon, title, value, change }: { icon: React.ReactNode, title: string, value: string, change: string }) => (
    <motion.div variants={itemVariants}>
        <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">
                    {change}
                </p>
            </CardContent>
        </Card>
    </motion.div>
);

const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="h-6 w-6 text-yellow-400" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 2) return <Gem className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">{rank + 1}</span>;
};
