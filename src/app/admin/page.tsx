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
import { format, subMonths } from 'date-fns';

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
}

export default function AdminHomePage() {
  const { user } = useAuth();
  const { firestore } = initializeFirebase();
  
  const [stats, setStats] = useState({ candidates: 0, activeAssessments: 0, roles: 0, avgSuccess: 0 });
  const [chartData, setChartData] = useState<{name: string, Candidates: number}[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run if firestore is initialized
    if (!firestore) return;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // --- Fetch all primary collections in parallel ---
            const candidatesQuery = query(collection(firestore, 'users'), where('role', '==', 'candidate'));
            const rolesQuery = query(collection(firestore, 'roles'));
            const assessmentTemplatesQuery = query(collection(firestore, 'assessments'), where('status', '==', 'active'));
            // This collectionGroup query requires an index.
            const allAttemptsQuery = query(collectionGroup(firestore, 'assessments'), orderBy('submittedAt', 'desc'), limit(5));
            
            const [
                candidatesSnapshot,
                rolesSnapshot,
                templatesSnapshot,
                allAttemptsSnapshot,
            ] = await Promise.all([
                getDocs(candidatesQuery),
                getDocs(rolesQuery),
                getDocs(assessmentTemplatesQuery),
                getDocs(allAttemptsQuery),
            ]);

            // --- Process Candidates ---
            const candidates = candidatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType & { createdAt?: { seconds: number } }));
            const candidateCount = candidates.length;
            
            // --- Process Roles & Templates ---
            const totalRoles = rolesSnapshot.size;
            const activeTemplates = templatesSnapshot.size;

            // --- Process Assessments for Stats ---
            // To get avg score, we need all attempts, not just the last 5.
            // This is a potentially expensive query. For now, we'll use the limited query for a sample avg.
            // A better solution would be a Cloud Function that aggregates this.
            const allAttempts = allAttemptsSnapshot.docs.map(doc => doc.data() as AssessmentAttempt);
            const totalScore = allAttempts.reduce((acc, att) => acc + (att.finalScore || 0), 0);
            const avgSuccess = allAttempts.length > 0 ? Math.round(totalScore / allAttempts.length) : 0;
            
            setStats({ 
                candidates: candidateCount, 
                activeAssessments: activeTemplates,
                roles: totalRoles, 
                avgSuccess 
            });

            // --- Prepare Candidate Growth Chart Data (last 6 months) ---
            const monthlyData: Record<string, { Candidates: number }> = {};
            for (let i = 5; i >= 0; i--) {
                const month = format(subMonths(new Date(), i), 'MMM');
                monthlyData[month] = { Candidates: 0 };
            }
            candidates.forEach(c => {
                if (c.createdAt?.seconds) {
                     const month = format(new Date(c.createdAt.seconds * 1000), 'MMM');
                     if (monthlyData[month]) {
                        monthlyData[month].Candidates++;
                    }
                }
            });
            setChartData(Object.entries(monthlyData).map(([name, values]) => ({ name, ...values })));
            
            // --- Prepare Unified Recent Activity Feed ---
            const userNames = new Map(candidates.map(c => [c.id, c.name]));
            const roleNames = new Map(rolesSnapshot.docs.map(d => [d.id, (d.data() as Role).name]));
            
            const newCandidates = query(collection(firestore, 'users'), where('role', '==', 'candidate'), orderBy('createdAt', 'desc'), limit(5));
            const newCandidatesSnapshot = await getDocs(newCandidates);

            const candidateActivities: ActivityItem[] = newCandidatesSnapshot.docs.map(doc => {
                const c = doc.data() as UserType & { createdAt?: { seconds: number } };
                return {
                    type: 'new_candidate',
                    text: `${c.name} just signed up`,
                    subtext: c.createdAt ? `Joined on ${format(new Date(c.createdAt.seconds * 1000), 'PP')}` : '',
                    timestamp: (c.createdAt?.seconds || 0) * 1000,
                    icon: <UserCheck className="h-4 w-4 text-primary" />,
                }
            });

            const assessmentActivities: ActivityItem[] = allAttempts.map(a => ({
                type: 'assessment_completed',
                text: `${userNames.get(a.userId) || 'A candidate'} completed an assessment`,
                subtext: `${roleNames.get(a.roleId) || 'Unknown Role'} - Score: ${Math.round(a.finalScore || 0)}%`,
                timestamp: a.submittedAt || 0,
                icon: <NotebookPen className="h-4 w-4 text-primary" />,
            }));

            const combinedActivity = [...candidateActivities, ...assessmentActivities]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5);
                
            setRecentActivity(combinedActivity);

        } catch (error) {
            console.error("Failed to fetch admin dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [firestore]); // This dependency is crucial
  
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
                        <div className="text-2xl font-bold">{stats.avgSuccess}%</div>
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
                  {recentActivity.length > 0 ? recentActivity.map((item, index) => (
                       <div key={index} className="flex items-center">
                            <div className="p-2 bg-primary/10 rounded-full mr-3">
                              {item.icon}
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">{item.text}</p>
                                <p className="text-xs text-muted-foreground">{item.subtext}</p>
                            </div>
                       </div>
                  )) : (
                    <p className="text-sm text-center text-muted-foreground py-8">No recent activity.</p>
                  )}
                </CardContent>
            </Card>
        </motion.div>
       </motion.div>
    </div>
  );
}