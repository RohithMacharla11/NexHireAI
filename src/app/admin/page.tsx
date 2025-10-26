
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs, collectionGroup, query, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Loader2, Shield, Users, Briefcase, FileText, Search, View } from 'lucide-react';
import type { User as UserType, Role, AssessmentAttempt } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type UserWithAssessmentCount = UserType & { assessmentCount?: number };
type PlatformAssessmentAttempt = AssessmentAttempt & { userName?: string; roleName?: string; };

export default function AdminHomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { firestore } = initializeFirebase();

  const [stats, setStats] = useState({ totalUsers: 0, totalAssessments: 0 });
  const [users, setUsers] = useState<UserWithAssessmentCount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allAssessments, setAllAssessments] = useState<PlatformAssessmentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'recruiter'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'recruiter') && firestore) {
      const fetchData = async () => {
        setIsLoading(true);
        // Fetch all users
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserType[];
        const userMap = new Map(usersList.map(u => [u.id, u.name]));
        
        // Fetch all assessments across all users
        const assessmentsQuery = query(collectionGroup(firestore, 'assessments'), orderBy('submittedAt', 'desc'));
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        let totalAssessments = assessmentsSnapshot.size;
        
        const usersWithCounts = usersList.map(u => {
            const count = assessmentsSnapshot.docs.filter(doc => doc.ref.path.startsWith(`users/${u.id}`)).length;
            return { ...u, assessmentCount: count };
        });
        setUsers(usersWithCounts);
        
        // Fetch roles
        const rolesSnapshot = await getDocs(collection(firestore, 'roles'));
        const rolesList = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setRoles(rolesList);
        const roleMap = new Map(rolesList.map(r => [r.id, r.name]));

        const assessmentsData = assessmentsSnapshot.docs.map(doc => {
            const data = doc.data() as AssessmentAttempt;
            // The userId is on the attempt object itself
            const userId = (doc.ref.parent.parent as any).id;
            return {
                ...data,
                id: doc.id,
                userId: userId,
                userName: userMap.get(userId) || 'Unknown User',
                roleName: roleMap.get(data.roleId) || 'Unknown Role',
            };
        });
        setAllAssessments(assessmentsData);
        
        // Set overall stats
        setStats({ totalUsers: usersList.length, totalAssessments });

        setIsLoading(false);
      };
      fetchData();
    }
  }, [user, firestore]);

  const filteredUsers = useMemo(() => 
    users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [users, searchTerm]
  );
  
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, currentPage, usersPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full w-full p-4 md:p-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <h1 className="text-4xl font-bold mb-8 flex items-center gap-3"><Shield /> Admin Panel</h1>

      <Tabs defaultValue="overview">
        <TabsList className="mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <StatCard icon={<Users />} title="Total Users" value={stats.totalUsers} />
                <StatCard icon={<Briefcase />} title="Total Roles" value={roles.length} />
                <StatCard icon={<FileText />} title="Assessments Taken" value={stats.totalAssessments} />
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Recent Users</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.slice(0, 5).map(u => (
                          <TableRow key={u.id}>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell><Badge variant={u.role === 'admin' ? 'default' : (u.role === 'recruiter' ? 'secondary' : 'outline')}>{u.role}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader><CardTitle>Role Management</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role Name</TableHead>
                                <TableHead>Sub-skills</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.slice(0,5).map(r => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">{r.name}</TableCell>
                                    <TableCell>{r.subSkills.join(', ')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
        </TabsContent>
        <TabsContent value="candidates">
            <Card>
                <CardHeader>
                    <CardTitle>Candidate Management</CardTitle>
                    <div className="mt-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search candidates..." 
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-center">Assessments Taken</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedUsers.map(u => (
                            <TableRow key={u.id}>
                                <TableCell>{u.name}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell><Badge variant={u.role === 'admin' ? 'default' : (u.role === 'recruiter' ? 'secondary' : 'outline')}>{u.role}</Badge></TableCell>
                                 <TableCell className="text-center font-medium">{u.assessmentCount}</TableCell>
                                 <TableCell>
                                    <Button asChild variant="ghost" size="sm">
                                      <Link href={`/profile/${u.id}`}><View className="mr-2 h-4 w-4"/>View</Link>
                                    </Button>
                                 </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="assessments">
             <Card>
                <CardHeader><CardTitle>Platform Assessment History</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Assessment Role</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allAssessments.map(attempt => (
                            <TableRow key={`${attempt.userId}-${attempt.id}`}>
                                <TableCell>{attempt.userName}</TableCell>
                                <TableCell>{attempt.roleName}</TableCell>
                                <TableCell>
                                    <Badge variant={attempt.finalScore! > 70 ? 'default' : 'secondary'}>
                                        {Math.round(attempt.finalScore!)}%
                                    </Badge>
                                </TableCell>
                                <TableCell>{new Date(attempt.submittedAt!).toLocaleDateString()}</TableCell>
                                 <TableCell>
                                    <Button asChild variant="ghost" size="sm">
                                      <Link href={`/dashboard/assessments/${attempt.id}?userId=${attempt.userId}`}><View className="mr-2 h-4 w-4"/>View Report</Link>
                                    </Button>
                                 </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const StatCard = ({ icon, title, value }: { icon: React.ReactNode, title: string, value: string | number }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

    