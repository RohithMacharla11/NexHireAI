
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Loader2, Shield, Users, Briefcase } from 'lucide-react';
import type { User as UserType, Role } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { firestore } = initializeFirebase();

  const [stats, setStats] = useState({ totalUsers: 0, totalAssessments: 0 });
  const [users, setUsers] = useState<UserType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin' && firestore) {
      const fetchData = async () => {
        setIsLoading(true);
        // Fetch all users
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserType[];
        setUsers(usersList);

        // Fetch all roles
        const rolesSnapshot = await getDocs(collection(firestore, 'roles'));
        const rolesList = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setRoles(rolesList);
        
        // Fetch stats (simplified)
        let totalAssessments = 0;
        for (const u of usersList) {
            const assessmentsSnapshot = await getDocs(collection(firestore, `users/${u.id}/assessments`));
            totalAssessments += assessmentsSnapshot.size;
        }
        setStats({ totalUsers: usersList.length, totalAssessments });

        setIsLoading(false);
      };
      fetchData();
    }
  }, [user, firestore]);

  if (authLoading || isLoading || user?.role !== 'admin') {
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard icon={<Users />} title="Total Users" value={stats.totalUsers} />
        <StatCard icon={<Briefcase />} title="Total Roles" value={roles.length} />
        <StatCard icon={<Users />} title="Assessments Taken" value={stats.totalAssessments} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
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
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge></TableCell>
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
                    {roles.map(r => (
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
