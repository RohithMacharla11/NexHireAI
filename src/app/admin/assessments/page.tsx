
'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, onSnapshot, deleteDoc, doc, writeBatch, where, addDoc, updateDoc, collectionGroup } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, NotebookPen, CheckCircle, BarChart, Clock, Loader2, FileJson, BrainCircuit, Trash2, Pencil, Copy, PowerOff, Upload, Download, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AssessmentTemplate, Question, AssessmentAttempt } from '@/lib/types';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

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
    const { toast } = useToast();
    const [assessments, setAssessments] = useState<AssessmentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, avgTime: 0, avgScore: 0 });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedForDelete, setSelectedForDelete] = useState<AssessmentTemplate | null>(null);

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);
        const q = query(collection(firestore, 'assessments'));
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const assessmentData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentTemplate));
            setAssessments(assessmentData);

            const activeAssessments = assessmentData.filter(a => a.status === 'active');
            const totalDuration = activeAssessments.reduce((acc, a) => acc + (a.duration || 0), 0);
            const avgTime = activeAssessments.length > 0 ? Math.round(totalDuration / activeAssessments.length) : 0;
            
            // Fetch all attempts and filter to only include those that match our official assessment templates
            const templateIds = assessmentData.map(t => t.id);
            let avgScore = 0;
            if (templateIds.length > 0) {
                try {
                    const attemptsGroupRef = collectionGroup(firestore, 'assessments');
                    // Filter attempts where rootAssessmentId is one of the template IDs
                    const attemptsSnap = await getDocs(query(attemptsGroupRef, where('rootAssessmentId', 'in', templateIds)));
                    
                    const officialAttempts = attemptsSnap.docs.map(doc => doc.data() as AssessmentAttempt);

                    if (officialAttempts.length > 0) {
                        const totalScore = officialAttempts.reduce((acc, attempt) => acc + (attempt.finalScore || 0), 0);
                        avgScore = Math.round(totalScore / officialAttempts.length);
                    }
                } catch(e) {
                    console.error("Could not query assessment attempts. This may be due to a missing Firestore index.", e)
                }
            }


            setStats({
                total: assessmentData.length,
                active: activeAssessments.length,
                avgTime: avgTime,
                avgScore: avgScore
            });
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching assessments:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleDelete = async () => {
        if (!selectedForDelete || !firestore) return;
        
        try {
            const batch = writeBatch(firestore);

            // 1. Delete the main assessment template
            const assessmentRef = doc(firestore, 'assessments', selectedForDelete.id);
            batch.delete(assessmentRef);

            // 2. Delete all associated questions from the question bank
            if (selectedForDelete.questionIds && selectedForDelete.questionIds.length > 0) {
                // Firestore 'in' query has a limit of 30, so batch deletions if necessary
                 for (let i = 0; i < selectedForDelete.questionIds.length; i += 30) {
                    const chunk = selectedForDelete.questionIds.slice(i, i + 30);
                    for (const questionId of chunk) {
                         const questionRef = doc(firestore, 'questionBank', questionId);
                         batch.delete(questionRef);
                    }
                }
            }

            await batch.commit();
            toast({ title: "Assessment Deleted", description: `"${selectedForDelete.name}" and its questions have been removed.` });

        } catch (error) {
            toast({ title: "Error", description: "Could not delete the assessment.", variant: "destructive" });
            console.error("Error deleting assessment:", error);
        } finally {
            setDialogOpen(false);
            setSelectedForDelete(null);
        }
    };
    
    const handleExport = async (assessment: AssessmentTemplate) => {
        if (!firestore) return;
        
        try {
            let questions: Question[] = [];
            const questionIds = assessment.questionIds || [];
            if (questionIds.length > 0) {
                for (let i = 0; i < questionIds.length; i += 30) {
                    const chunk = questionIds.slice(i, i + 30);
                    const qQuery = query(collection(firestore, 'questionBank'), where('__name__', 'in', chunk));
                    const questionsSnap = await getDocs(qQuery);
                    questions.push(...questionsSnap.docs.map(d => ({ ...d.data() } as Omit<Question, 'id'>)));
                }
            }
            
            const exportData = { ...assessment, questions };
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${assessment.name.replace(/\s+/g, '_')}_export.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast({ title: "Export Successful", description: `"${assessment.name}" has been exported.` });

        } catch (error) {
            console.error("Error exporting assessment:", error);
            toast({ title: "Export Failed", variant: "destructive" });
        }
    };
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("File could not be read.");
                }
                const importedData = JSON.parse(text) as AssessmentTemplate & { questions?: Omit<Question, 'id'>[] };
                
                if (!importedData.name || !importedData.role || !importedData.questions) {
                    throw new Error("Invalid JSON structure for assessment template.");
                }

                const { questions, ...templateData } = importedData;
                
                const newTemplateId = uuidv4();
                const newQuestions = questions.map(q => ({ ...q, id: uuidv4(), tags: [templateData.role, q.skill] }));
                const newQuestionIds = newQuestions.map(q => q.id);

                const batch = writeBatch(firestore);

                const finalTemplate: Omit<AssessmentTemplate, 'id'> = {
                    ...templateData,
                    name: `${templateData.name} (Imported)`,
                    questionIds: newQuestionIds,
                    questionCount: newQuestions.length,
                    createdAt: Date.now(),
                    status: 'draft', // Always import as draft
                };
                delete (finalTemplate as any).id;
                delete (finalTemplate as any).questions;

                const templateRef = doc(firestore, 'assessments', newTemplateId);
                batch.set(templateRef, finalTemplate);
                
                for (const question of newQuestions) {
                    const { id, ...questionData } = question;
                    const questionRef = doc(firestore, 'questionBank', id);
                    batch.set(questionRef, questionData);
                }

                await batch.commit();

                toast({ title: "Import Successful!", description: `"${finalTemplate.name}" has been added as a draft.` });

            } catch (error) {
                console.error("Error importing assessment:", error);
                toast({ title: "Import Failed", description: (error as Error).message, variant: "destructive" });
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleClone = async (assessment: AssessmentTemplate) => {
        if (!firestore) return;
        toast({ title: "Cloning Assessment..." });

        try {
            const batch = writeBatch(firestore);

            // 1. Fetch original questions
            let originalQuestions: Question[] = [];
            const questionIds = assessment.questionIds || [];
            if (questionIds.length > 0) {
                 for (let i = 0; i < questionIds.length; i += 30) {
                    const chunk = questionIds.slice(i, i + 30);
                    const qQuery = query(collection(firestore, 'questionBank'), where('__name__', 'in', chunk));
                    const questionsSnap = await getDocs(qQuery);
                    originalQuestions.push(...questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
                }
            }

            // 2. Create new questions with new IDs
            const newQuestions = originalQuestions.map(q => {
                const { id, ...data } = q;
                return { id: uuidv4(), ...data };
            });
            const newQuestionIds = newQuestions.map(q => q.id);

            // 3. Add new questions to the batch
            for (const question of newQuestions) {
                 const { id, ...questionData } = question;
                const questionRef = doc(firestore, 'questionBank', id);
                batch.set(questionRef, questionData);
            }

            // 4. Create the new assessment template
            const { id, ...originalTemplateData } = assessment;
            const newTemplate: Omit<AssessmentTemplate, 'id'> = {
                ...originalTemplateData,
                name: `${assessment.name} (Copy)`,
                status: 'draft',
                createdAt: Date.now(),
                questionIds: newQuestionIds,
            };
            const newTemplateRef = doc(collection(firestore, 'assessments'));
            batch.set(newTemplateRef, newTemplate);

            await batch.commit();
            toast({ title: "Clone Successful!", description: `A copy of "${assessment.name}" has been created as a draft.` });
        } catch (error) {
             console.error("Error cloning assessment:", error);
            toast({ title: "Clone Failed", description: (error as Error).message, variant: "destructive" });
        }
    };
    
    const handleToggleStatus = async (assessment: AssessmentTemplate) => {
        if (!firestore) return;
        const newStatus = assessment.status === 'active' ? 'draft' : 'active';
        const assessmentRef = doc(firestore, 'assessments', assessment.id);
        try {
            await updateDoc(assessmentRef, { status: newStatus });
            toast({ title: `Status Updated`, description: `"${assessment.name}" is now ${newStatus}.` });
        } catch (error) {
            toast({ title: "Update Failed", variant: "destructive" });
        }
    };


    const openDeleteDialog = (assessment: AssessmentTemplate) => {
        setSelectedForDelete(assessment);
        setDialogOpen(true);
    }

    return (
        <div className="p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold">Assessment Management</h1>
                    <div className="flex gap-2">
                         <Button asChild variant="outline">
                            <label htmlFor="import-json" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" /> Import from JSON
                                <input type="file" id="import-json" accept=".json" className="hidden" onChange={handleImport} />
                            </label>
                         </Button>
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
                <motion.div variants={itemVariants}><StatCard icon={<BarChart />} title="Avg. Candidate Score" value={stats.avgScore > 0 ? `${stats.avgScore}%` : 'N/A'} /></motion.div>
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
                                                        <DropdownMenuItem onSelect={() => router.push(`/admin/assessments/${assessment.id}/edit`)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleClone(assessment)}>
                                                            <Copy className="mr-2 h-4 w-4" /> Clone
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleExport(assessment)}>
                                                            <Download className="mr-2 h-4 w-4" /> Export as JSON
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleToggleStatus(assessment)}>
                                                            {assessment.status === 'active' ? (
                                                                <><PowerOff className="mr-2 h-4 w-4" /> Deactivate</>
                                                            ) : (
                                                                <><Power className="mr-2 h-4 w-4" /> Activate</>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-500" onSelect={() => openDeleteDialog(assessment)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
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

             <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the assessment template "{selectedForDelete?.name}" and all of its associated questions from the question bank.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete it
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
