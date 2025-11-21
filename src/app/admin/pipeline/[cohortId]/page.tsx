
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, onSnapshot, getDoc, doc, where, getDocs, writeBatch, updateDoc, collectionGroup } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Cohort, User, AssessmentAttempt, CandidateStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Crown, Medal, Gem, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type LeaderboardEntry = {
    user: User;
    attempt?: AssessmentAttempt;
    status: CandidateStatus;
};

export default function LeaderboardPage() {
    const { firestore } = initializeFirebase();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const cohortId = params.cohortId as string;

    const [cohort, setCohort] = useState<Cohort | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !cohortId) return;

        const cohortRef = doc(firestore, 'cohorts', cohortId);
        const unsubscribe = onSnapshot(cohortRef, async (docSnap) => {
            if (!docSnap.exists()) {
                toast({ title: "Cohort not found", variant: "destructive" });
                router.push('/admin/pipeline');
                return;
            }
            setIsLoading(true);
            const cohortData = { id: docSnap.id, ...docSnap.data() } as Cohort;
            setCohort(cohortData);

            if (!cohortData.candidateIds || cohortData.candidateIds.length === 0) {
                 setLeaderboard([]);
                 setIsLoading(false);
                 return;
            }

            // Fetch all users in the cohort
            const usersRef = collection(firestore, 'users');
            const usersQuery = query(usersRef, where('__name__', 'in', cohortData.candidateIds));
            const usersSnap = await getDocs(usersQuery);
            const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));

            let attempts: AssessmentAttempt[] = [];
            if (cohortData.assignedAssessmentId) {
                // Query the collection group for all assessments attempts that match the assigned ID
                const attemptsColGroup = collectionGroup(firestore, 'assessments');
                const attemptsQuery = query(
                    attemptsColGroup, 
                    where('assessmentId', '==', cohortData.assignedAssessmentId),
                    where('userId', 'in', cohortData.candidateIds)
                );
                const attemptsSnap = await getDocs(attemptsQuery);
                attempts = attemptsSnap.docs.map(d => d.data() as AssessmentAttempt);
            }
            
            const entries = users.map(user => {
                const userAttempt = attempts.find(a => a.userId === user.id);
                // In a real app, status might be stored in the cohort doc, e.g., cohortData.statuses[user.id]
                const status: CandidateStatus = (cohortData.statuses && cohortData.statuses[user.id]) || 'Shortlisted'; 
                return { user, attempt: userAttempt, status };
            });

            // Sort by score if available, otherwise keep original order
            entries.sort((a, b) => (b.attempt?.finalScore ?? -1) - (a.attempt?.finalScore ?? -1));

            setLeaderboard(entries);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, cohortId, router, toast]);

    const handleStatusChange = async (userId: string, newStatus: CandidateStatus) => {
        if (!firestore || !cohort) return;

        toast({ title: `Updating status to ${newStatus}...` });

        const cohortRef = doc(firestore, 'cohorts', cohort.id);
        
        try {
            await updateDoc(cohortRef, {
                [`statuses.${userId}`]: newStatus
            });

            const notificationRef = doc(collection(firestore, `users/${userId}/notifications`));
            await setDoc(notificationRef, {
                title: `Update on ${cohort.name}`,
                message: `Your application status has been updated to: ${newStatus}.`,
                isRead: false,
                createdAt: Date.now(),
                ...(newStatus === 'Hired' && { link: '/dashboard/gamification' }),
            });
            
            toast({ title: "Status Updated", description: `Candidate has been notified.` });
        } catch (error) {
            toast({ title: "Update Failed", description: (error as Error).message, variant: 'destructive' });
        }
    };


    const getPerformanceTier = (score: number) => {
        if (score >= 85) return { label: 'Excellent', color: 'bg-green-500' };
        if (score >= 60) return { label: 'Good', color: 'bg-yellow-500' };
        return { label: 'Needs Improvement', color: 'bg-red-500' };
    };

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
        if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (rank === 2) return <Gem className="h-5 w-5 text-amber-600" />;
        return <span className="text-sm font-bold text-muted-foreground">{rank + 1}</span>;
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="p-8">
             <Button variant="ghost" onClick={() => router.push('/admin/pipeline')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pipeline
            </Button>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <CardHeader className="px-0">
                    <CardTitle className="text-4xl font-bold">Leaderboard: {cohort?.name}</CardTitle>
                    <CardDescription>
                        Results for the assigned assessment: "{cohort?.assignedAssessmentName || 'N/A'}"
                    </CardDescription>
                </CardHeader>
            </motion.div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 text-center">Rank</TableHead>
                                <TableHead>Candidate</TableHead>
                                <TableHead className="text-center">Score</TableHead>
                                <TableHead>Performance</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.map((entry, index) => (
                                <TableRow key={entry.user.id}>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center h-full">
                                            {entry.attempt ? getRankIcon(index) : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />
                                                <AvatarFallback>{entry.user.name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{entry.user.name}</div>
                                                <div className="text-sm text-muted-foreground">{entry.user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                     <TableCell className="text-center font-bold text-lg">
                                        {entry.attempt ? `${Math.round(entry.attempt.finalScore!)}%` : <span className="text-muted-foreground italic text-sm">Pending</span>}
                                    </TableCell>
                                    <TableCell>
                                         {entry.attempt ? (
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-2.5 w-2.5 rounded-full", getPerformanceTier(entry.attempt.finalScore!).color)}></div>
                                                <span>{getPerformanceTier(entry.attempt.finalScore!).label}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic">Not Taken</span>
                                        )}
                                    </TableCell>
                                     <TableCell className="text-center">
                                        <Badge variant="outline">{entry.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">Change Status</Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {(['Shortlisted', 'Under Review', 'Hired', 'Rejected'] as CandidateStatus[]).map(status => (
                                                    <DropdownMenuItem key={status} onSelect={() => handleStatusChange(entry.user.id, status)} disabled={entry.status === status}>
                                                        {status}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     {leaderboard.length === 0 && (
                        <div className="text-center p-12 text-muted-foreground">
                            <Users className="mx-auto h-12 w-12 mb-4" />
                            <p>No candidates in this cohort or no results yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
