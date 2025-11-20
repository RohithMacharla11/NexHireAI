
'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import type { Role } from '@/lib/types';
import { Loader2, PlusCircle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const containerVariants = {
    hidden: { opacity: 1 },
    visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

export default function RolesPage() {
    const { firestore } = initializeFirebase();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);
        const q = query(collection(firestore, 'roles'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const rolesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
            setRoles(rolesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching roles:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    return (
        <div className="p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                 <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold">Roles & Skills</h1>
                    <div className="flex gap-2">
                         <Button><PlusCircle className="mr-2 h-4 w-4" /> Create New Role</Button>
                    </div>
                </div>
            </motion.div>

            {isLoading ? (
                <div className="flex items-center justify-center text-center text-muted-foreground h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : roles.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
                    <ShieldCheck className="h-16 w-16 mb-4" />
                    <p>No roles found. Create one to get started.</p>
                </div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {roles.map(role => (
                        <motion.div key={role.id} variants={itemVariants}>
                             <Card className="h-full flex flex-col bg-card/60 backdrop-blur-sm border-border/20 shadow-lg hover:border-primary/60 hover:-translate-y-1 transition-transform">
                                <CardHeader>
                                    <CardTitle>{role.name}</CardTitle>
                                    <CardDescription>{role.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <h4 className="text-sm font-semibold mb-2">Sub-skills:</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {role.subSkills.map(skill => (
                                            <Badge key={skill} variant="secondary">{skill}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
