
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, NotebookPen, TrendingUp, UserCheck, Activity, ShieldCheck, BarChart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, collectionGroup, limit } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { User as UserType, Role, AssessmentTemplate, AssessmentAttempt } from '@/lib/types';
import { format, subMonths, startOfMonth, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

type ActivityItem = {
    type: 'new_candidate' | 'assessment_completed';
    text: string;
    subtext: string;
    timestamp: number;
    icon: React.ReactNode;
    avatarUrl?: string;
    avatarFallback: string;
}

export default function AdminHomePage() {
  const { user } = useAuth();
  const { firestore } = initializeFirebase();
  
  const [stats, setStats] = useState({ candidates: 0, activeAssessments: 0, roles: 0 });
  const [chartData, setChartData] = useState<{name: string, Candidates: number}[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) return;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // --- STATS AND CHART ---
            const usersQuery = query(collection(firestore, 'users'), where('role', '==', 'candidate'));
            const usersSnapshot = await getDocs(usersQuery);
            const rolesSnapshot = await getDocs(collection(firestore, 'roles'));
            const assessmentsSnapshot = await getDocs(collection(firestore, 'assessments'));

            const candidateCount = usersSnapshot.size;
            const activeAssessmentsCount = assessmentsSnapshot.docs.filter(doc => (doc.data() as AssessmentTemplate).status === 'active').length;
            const totalRoles = rolesSnapshot.size;

            setStats({
                candidates: candidateCount,
                activeAssessments: activeAssessmentsCount,
                roles: totalRoles
            });

            const monthlyData: Record<string, { Candidates: number }> = {};
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                monthlyData[format(subMonths(now, i), 'MMM')] = { Candidates: 0 };
            }

            usersSnapshot.docs.forEach(doc => {
                 const c = doc.data() as UserType;
                 if (c.createdAt && typeof c.createdAt === 'object' && 'seconds' in c.createdAt) {
                     const joinDate = new Date((c.createdAt as any).seconds * 1000);
                     if (joinDate >= startOfMonth(subMonths(now, 5))) {
                        const month = format(joinDate, 'MMM');
                        if (monthlyData[month]) monthlyData[month].Candidates++;
                     }
                 }
            });
            setChartData(Object.entries(monthlyData).map(([name, values]) => ({ name, ...values })));
            
            // --- ACTIVITY FEED (REFACTORED) ---
            const newCandidatesQuery = query(collection(firestore, 'users'), where('role', '==', 'candidate'), orderBy('createdAt', 'desc'), limit(5));
            const recentAttemptsQuery = query(collectionGroup(firestore, 'assessments'), orderBy('submittedAt', 'desc'), limit(5));
            
            const [newCandidatesSnap, recentAttemptsSnap] = await Promise.all([
                getDocs(newCandidatesQuery),
                getDocs(recentAttemptsQuery),
            ]);

            const candidateActivities: ActivityItem[] = newCandidatesSnap.docs
                .filter(doc => doc.data().createdAt)
                .map(doc => {
                    const candidate = doc.data() as UserType;
                    return {
                        type: 'new_candidate',
                        text: `${candidate.name} signed up.`,
                        subtext: 'New candidate joined the talent pool.',
                        timestamp: (candidate.createdAt as any).seconds * 1000,
                        icon: <UserCheck className="h-5 w-5" />,
                        avatarUrl: candidate.avatarUrl,
                        avatarFallback: candidate.name.charAt(0)
                    };
                });
            
            const assessmentActivities: ActivityItem[] = [];
            for (const attemptDoc of recentAttemptsSnap.docs) {
                const attempt = attemptDoc.data() as AssessmentAttempt;
                if (!attempt.userId || !attempt.submittedAt) continue;

                // Fetch the user data for this attempt
                const userDoc = await getDoc(doc(firestore, 'users', attempt.userId));
                if (!userDoc.exists()) continue;
                const userData = userDoc.data() as UserType;

                // Fetch the role name
                const roleDoc = await getDoc(doc(firestore, 'roles', attempt.roleId));
                const roleName = roleDoc.exists() ? (roleDoc.data() as Role).name : 'an assessment';

                assessmentActivities.push({
                    type: 'assessment_completed',
                    text: `${userData.name} completed the ${roleName} assessment.`,
                    subtext: `Scored ${Math.round(attempt.finalScore!)}%`,
                    timestamp: attempt.submittedAt!,
                    icon: <NotebookPen className="h-5 w-5" />,
                    avatarUrl: userData.avatarUrl,
                    avatarFallback: userData.name.charAt(0)
                });
            }
            
            const combinedActivities = [...candidateActivities, ...assessmentActivities]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5);

            setActivityFeed(combinedActivities);

        } catch (error) {
            console.error("Failed to fetch admin dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [firestore, user]); 
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="relative min-h-full w-full p-4 md:p-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2">Recruiter Dashboard</h1>
        <p className="text-lg text-muted-foreground mb-8">Welcome back, {user?.name}! Here's what's happening.</p>
      </motion.div>

       <motion.div 
         variants={containerVariants}
         initial="hidden"
         animate="visible"
         className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
       >
            <motion.div variants={itemVariants}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.candidates}</div>
                    </CardContent>
                </Card>
            </motion.div>
             <motion.div variants={itemVariants}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Assessments</CardTitle>
                        <NotebookPen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeAssessments}</div>
                    </CardContent>
                </Card>
            </motion.div>
             <motion.div variants={itemVariants}>
                 <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.roles}</div>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Success Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">N/A</div>
                    </CardContent>
                </Card>
            </motion.div>
       </motion.div>

       <motion.div 
         variants={containerVariants}
         initial="hidden"
         animate="visible"
         className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
       >
        <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart /> Candidate Growth</CardTitle>
                    <CardDescription>New candidates who signed up over the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] pl-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Area type="monotone" dataKey="Candidates" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCandidates)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity /> Recent Activity</CardTitle>
                    <CardDescription>Latest platform events.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activityFeed.length > 0 ? (
                      activityFeed.map((item, index) => (
                          <div key={index} className="flex items-center gap-4">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={item.avatarUrl} />
                                    <AvatarFallback>{item.avatarFallback}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{item.text}</p>
                                    <p className="text-sm text-muted-foreground">{item.subtext}</p>
                                </div>
                                <div className="ml-auto text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                </div>
                          </div>
                      ))
                  ) : (
                    <p className="text-sm text-center text-muted-foreground py-8">No recent activity.</p>
                  )}
                </CardContent>
            </Card>
        </motion.div>
       </motion.div>
    </div>
  );
}
