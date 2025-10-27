'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, NotebookPen, TrendingUp, UserCheck, Activity, ShieldCheck, BarChart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, limit, orderBy, collectionGroup } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { User as UserType, Role, AssessmentAttempt } from '@/lib/types';
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
}

export default function AdminHomePage() {
  const { user } = useAuth();
  const { firestore } = initializeFirebase();
  
  const [stats, setStats] = useState({ candidates: 0, assessments: 0, roles: 0, avgSuccess: 0 });
  const [chartData, setChartData] = useState<{name: string, Candidates: number, Assessments: number}[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch all assessments for stats and chart
            const assessmentsQuery = query(collectionGroup(firestore, 'assessments'), orderBy('submittedAt', 'desc'));
            const assessmentsSnapshot = await getDocs(assessmentsQuery);
            const allAssessments = assessmentsSnapshot.docs.map(doc => doc.data() as AssessmentAttempt);
            const totalAssessments = allAssessments.length;
            
            const totalScore = allAssessments.reduce((acc, att) => acc + (att.finalScore || 0), 0);
            const avgSuccess = totalAssessments > 0 ? Math.round(totalScore / totalAssessments) : 0;

            // Fetch users for candidate count
            const usersQuery = query(collection(firestore, 'users'), where('role', '==', 'candidate'));
            const usersSnapshot = await getDocs(usersQuery);
            const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserType));
            const candidateCount = allUsers.length;

            // Fetch roles
            const rolesQuery = query(collection(firestore, 'roles'));
            const rolesSnapshot = await getDocs(rolesQuery);
            const totalRoles = rolesSnapshot.size;

            setStats({ candidates: candidateCount, assessments: totalAssessments, roles: totalRoles, avgSuccess });

            // Prepare chart data for last 6 months
            const monthlyData: Record<string, { Candidates: number, Assessments: number }> = {};
            for (let i = 5; i >= 0; i--) {
                const month = format(subMonths(new Date(), i), 'MMM');
                monthlyData[month] = { Candidates: 0, Assessments: 0 };
            }

            const candidateJoinMonth: Record<string, string> = {};
            allAssessments.forEach(a => {
                if (a.submittedAt) {
                     const month = format(new Date(a.submittedAt), 'MMM');
                     if (monthlyData[month]) {
                        monthlyData[month].Assessments++;
                        // If we haven't seen this user join yet, mark their first assessment month as their join month
                        if (!candidateJoinMonth[a.userId]) {
                            candidateJoinMonth[a.userId] = month;
                        }
                    }
                }
            });

            Object.values(candidateJoinMonth).forEach(month => {
                if(monthlyData[month]) {
                    monthlyData[month].Candidates++;
                }
            });


            setChartData(Object.entries(monthlyData).map(([name, values]) => ({ name, ...values })));
            
            // Prepare recent activity
            // Since we don't have user names on assessments, we fetch them separately
            const recentUserIds = [...new Set(allAssessments.slice(0, 5).map(a => a.userId))];
            const userNames = new Map<string, string>();
            if(recentUserIds.length > 0) {
              const usersByIdQuery = query(collection(firestore, 'users'), where('id', 'in', recentUserIds));
              const usersByIdSnap = await getDocs(usersByIdQuery);
              usersByIdSnap.forEach(doc => {
                const userData = doc.data() as UserType;
                userNames.set(doc.id, userData.name);
              });
            }
            
            const roleNames = new Map((await getDocs(collection(firestore, 'roles'))).docs.map(d => [d.id, (d.data() as Role).name]));

            const assessmentActivities = allAssessments.slice(0, 5).map(a => ({
                type: 'assessment_completed' as const,
                text: `${userNames.get(a.userId) || 'A candidate'} completed an assessment`,
                subtext: `${roleNames.get(a.roleId) || 'Unknown Role'} - ${Math.round(a.finalScore || 0)}%`,
                timestamp: a.submittedAt || 0,
            }));
                
            setRecentActivity(assessmentActivities);

        } catch (error) {
            console.error("Failed to fetch admin dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [firestore]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="relative min-h-full w-full p-4 md:p-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3"> Recruiter Dashboard</h1>
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
                        <CardTitle className="text-sm font-medium">Assessments Taken</CardTitle>
                        <NotebookPen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.assessments}</div>
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
             <motion.div variants={itemVariants}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.roles}</div>
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
                    <CardTitle className="flex items-center gap-2"><BarChart /> Platform Growth</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] pl-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorAssessments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Area type="monotone" dataKey="Candidates" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCandidates)" />
                            <Area type="monotone" dataKey="Assessments" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorAssessments)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity /> Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivity.length > 0 ? recentActivity.map((item, index) => (
                       <div key={index} className="flex items-center">
                            {item.type === 'new_candidate' ? <Users className="h-4 w-4 mr-3 text-muted-foreground" /> : <NotebookPen className="h-4 w-4 mr-3 text-muted-foreground" />}
                            <div className="text-sm">
                                <p className="font-medium">{item.text}</p>
                                <p className="text-xs text-muted-foreground">{item.subtext}</p>
                            </div>
                       </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  )}
                </CardContent>
            </Card>
        </motion.div>
       </motion.div>
    </div>
  );
}