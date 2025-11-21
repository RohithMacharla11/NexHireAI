
'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, onSnapshot, deleteDoc, doc, writeBatch, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, NotebookPen, CheckCircle, BarChart, Clock, Loader2, FileJson, BrainCircuit, Trash2, Pencil, Copy, PowerOff, Upload, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AssessmentTemplate, Question } from '@/lib/types';
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
    const [stats, setStats] = useState({ total: 0, active: 0, avgTime: 0 });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedForDelete, setSelectedForDelete] = useState<AssessmentTemplate | null>(null);

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

    const handleDelete = async () => {
        if (!selectedForDelete || !firestore) return;
        
        try {
            await deleteDoc(doc(firestore, 'assessments', selectedForDelete.id));
            toast({ title: "Assessment Deleted", description: `"${selectedForDelete.name}" has been removed.` });
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
            if (assessment.questionIds && assessment.questionIds.length > 0) {
                const qQuery = query(collection(firestore, 'questionBank'), where('__name__', 'in', assessment.questionIds));
                const questionsSnap = await getDocs(qQuery);
                questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
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
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("File could not be read.");
                }
                const importedData = JSON.parse(text) as AssessmentTemplate & { questions?: Question[] };
                
                // Validate the imported data structure
                if (!importedData.name || !importedData.role || !importedData.questions) {
                    throw new Error("Invalid JSON structure for assessment template.");
                }

                const { questions, ...templateData } = importedData;
                
                // Generate new IDs for the template and questions to avoid collisions
                const newTemplateId = uuidv4();
                const newQuestions = questions.map(q => ({ ...q, id: uuidv4() }));
                const newQuestionIds = newQuestions.map(q => q.id);

                const batch = writeBatch(firestore);

                const finalTemplate = {
                    ...templateData,
                    id: newTemplateId,
                    name: `${templateData.name} (Imported)`, // Append to name to indicate it's an import
                    questionIds: newQuestionIds,
                    questionCount: newQuestions.length,
                    createdAt: Date.now(),
                };
                delete (finalTemplate as any).questions;

                const templateRef = doc(firestore, 'assessments', newTemplateId);
                batch.set(templateRef, finalTemplate);
                
                for (const question of newQuestions) {
                    const questionRef = doc(firestore, 'questionBank', question.id);
                    batch.set(questionRef, question);
                }

                await batch.commit();

                toast({ title: "Import Successful!", description: `"${finalTemplate.name}" has been added.` });

            } catch (error) {
                console.error("Error importing assessment:", error);
                toast({ title: "Import Failed", description: (error as Error).message, variant: "destructive" });
            } finally {
                // Reset file input to allow re-uploading the same file
                event.target.value = '';
            }
        };
        reader.readAsText(file);
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
                                                        <DropdownMenuItem onSelect={() => router.push(`/admin/assessments/${assessment.id}/edit`)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleExport(assessment)}>
                                                            <Download className="mr-2 h-4 w-4" /> Export as JSON
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => toast({title: "Coming Soon!", description: "Cloning will be enabled in a future update."})}>
                                                            <Copy className="mr-2 h-4 w-4" /> Clone
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => toast({title: "Coming Soon!", description: "Deactivation will be enabled in a future update."})}>
                                                            <PowerOff className="mr-2 h-4 w-4" /> Deactivate
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
                            This action cannot be undone. This will permanently delete the assessment template "{selectedForDelete?.name}".
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
