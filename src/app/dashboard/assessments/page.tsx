
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Loader2, History } from 'lucide-react';
import type { AssessmentAttempt, Role } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function AssessmentsPage() {
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

    const fetchAttempts = async () => {
      setIsFetching(true);
      try {
        const attemptsQuery = query(collection(firestore, 'users', user.id, 'assessments'), orderBy('submittedAt', 'desc'));
        const querySnapshot = await getDocs(attemptsQuery);
        
        const attemptsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
          const attempt = { id: docSnapshot.id, ...docSnapshot.data() } as AssessmentAttempt;
          let roleName = 'Unknown Role';
          
          if (attempt.roleId) {
            const roleDocRef = doc(firestore, 'roles', attempt.roleId);
            const roleDoc = await getDoc(roleDocRef);
            if (roleDoc.exists()) {
                roleName = (roleDoc.data() as Role).name;
            }
          }
          return { ...attempt, roleName };
        }));

        setAttempts(attemptsData);
      } catch (error) {
        console.error("Error fetching assessment attempts:", error);
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchAttempts();
  }, [user, firestore]);

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
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full w-full p-4 md:p-8">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold mb-8 flex items-center gap-3"
        >
          <History /> Previous Assessments
        </motion.h1>
        
        {attempts.length === 0 ? (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg text-center p-8">
                    <CardHeader>
                        <CardTitle className="text-2xl">No Assessments Taken Yet</CardTitle>
                        <CardDescription>Your past assessments will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/skill-assessment')}>Take Your First Assessment</Button>
                    </CardContent>
                </Card>
            </motion.div>
        ) : (
             <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {attempts.map(attempt => (
                  <motion.div key={attempt.id} variants={itemVariants}>
                    <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg transition-all duration-300 hover:border-primary/60 hover:shadow-primary/10 hover:-translate-y-1 flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-xl">{attempt.roleName}</CardTitle>
                            <CardDescription>
                                {attempt.submittedAt ? `Taken on ${new Date(attempt.submittedAt).toLocaleDateString()}` : 'Date not available'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center justify-center">
                             <div className="relative h-24 w-24">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path className="text-secondary/50" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <motion.path 
                                        className="text-primary" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"
                                        initial={{ strokeDasharray: `0, 100` }}
                                        animate={{ strokeDasharray: `${attempt.finalScore || 0}, 100` }}
                                        transition={{ duration: 1, ease: "easeInOut" }}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold">{Math.round(attempt.finalScore || 0)}</span>
                                    <span className="text-xs text-muted-foreground">Score</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => router.push(`/dashboard/assessments/${attempt.id}`)}>
                                View Details
                            </Button>
                        </CardFooter>
                    </Card>
                  </motion.div>
                ))}
            </motion.div>
        )}
    </div>
  );
}

    