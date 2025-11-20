
'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, NotebookPen, CheckCircle, BarChart, Clock, Loader2, FileJson, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AssessmentTemplate } from '@/lib/types';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const containerVariants = {
    hidden: { opacity: 1 },
    visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, },
};

export default function AssessmentsPage() {
    const { firestore } = initializeFirebase();
    const router = useRouter();
    const [assessments, setAssessments] = useState<AssessmentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, avgTime: 0 });

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);
        const q = query(collection(firestore, 'assessments'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const assessmentData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentTemplate));
            setAssessments(assessmentData);

            const activeAssessments = assessmentData.filter(a => a.status === 'active');
            const totalDuration = activeAssessments.reduce((acc, a) => acc + (a.duration || 0), 0);
            const avgTime = activeAssessments.length > 0 ? Math.round(totalDuration / activeAssessments.length) : 0;
            
            setStats({
                total: assessmentData.length,
                active: activeAssessments.length,
                avgTime: avgTime
            });
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching assessments:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    return (
        <div className="p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold">Assessment Management</h1>
                    <div className="flex gap-2">
                         <Button variant="outline"><FileJson className="mr-2 h-4 w-4" /> Import from JSON</Button>
                         <Button onClick={() => router.push('/admin/assessments/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Assessment</Button>
                    </div>
                </div>
            </motion.div>
            
             <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
                <motion.div variants={itemVariants}><StatCard icon={<NotebookPen />} title="Total Templates" value={stats.total} /></motion.div>
                <motion.div variants={itemVariants}><StatCard icon={<CheckCircle />} title="Active Templates" value={stats.active} /></motion.div>
                <motion.div variants={itemVariants}><StatCard icon={<Clock />} title="Avg. Duration" value={`${stats.avgTime} min`} /></motion.div>
                <motion.div variants={itemVariants}><StatCard icon={<BarChart />} title="Avg. Candidate Score" value="72%" /></motion.div>
            </motion.div>

            <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                <CardHeader>
                    <CardTitle>All Assessment Templates</CardTitle>
                    <CardDescription>
                        Browse, manage, and create assessment templates for different roles.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center text-center text-muted-foreground h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : assessments.length === 0 ? (
                         <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
                            <NotebookPen className="h-16 w-16 mb-4" />
                            <p className="mb-4">No assessment templates found. Create your first one to get started.</p>
                            <Button onClick={() => router.push('/admin/assessments/new')}><PlusCircle className="mr-2 h-4 w-4" /> Create New Assessment</Button>
                        </div>
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="border rounded-lg"
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Assessment Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Questions</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assessments.map(assessment => (
                                        <motion.tr
                                            key={assessment.id}
                                            variants={itemVariants}
                                            className="w-full"
                                        >
                                            <TableCell className="font-medium">{assessment.name}</TableCell>
                                            <TableCell><Badge variant="outline">{assessment.role}</Badge></TableCell>
                                            <TableCell>{assessment.questionCount}</TableCell>
                                            <TableCell>{assessment.duration} min</TableCell>
                                            <TableCell><Badge variant={assessment.status === 'active' ? 'default' : 'secondary'}>{assessment.status}</Badge></TableCell>
                                            <TableCell>{assessment.createdAt ? format(new Date(assessment.createdAt), 'PP') : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem>Clone</DropdownMenuItem>
                                                        <DropdownMenuItem>Deactivate</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const StatCard = ({ icon, title, value }: { icon: React.ReactNode, title: string, value: string | number }) => (
    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);
