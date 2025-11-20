
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, getDocs, query, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { generateAssessmentTemplate } from '@/ai/flows/generate-assessment-template-flow';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, ArrowLeft, Wand2, Save, AlertTriangle } from 'lucide-react';
import type { Role, Question, AssessmentTemplate } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionPreview } from '@/components/assessment/QuestionPreview';


const assessmentSchema = z.object({
    name: z.string().min(5, 'Name must be at least 5 characters'),
    roleId: z.string().min(1, 'Please select a role'),
    questionCount: z.number().min(5).max(50),
    duration: z.number().min(10).max(180),
    difficultyMix: z.object({
        easy: z.number(),
        medium: z.number(),
        hard: z.number(),
    }),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

type ViewState = 'config' | 'preview';

export default function NewAssessmentPage() {
    const { firestore } = initializeFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [view, setView] = useState<ViewState>('config');
    const [generatedTemplate, setGeneratedTemplate] = useState<(AssessmentTemplate & { questions: Question[] }) | null>(null);

    const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<AssessmentFormData>({
        resolver: zodResolver(assessmentSchema),
        defaultValues: {
            questionCount: 30,
            duration: 60,
            difficultyMix: { easy: 40, medium: 40, hard: 20 },
        },
    });

    const questionCount = watch('questionCount');
    const difficultyMix = watch('difficultyMix');

    useState(() => {
        if (!firestore) return;
        const fetchRoles = async () => {
            setIsLoadingRoles(true);
            const q = query(collection(firestore, 'roles'));
            const querySnapshot = await getDocs(q);
            setRoles(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role)));
            setIsLoadingRoles(false);
        };
        fetchRoles();
    });

    const onGenerate = (data: AssessmentFormData) => {
        setIsGenerating(true);
        const selectedRole = roles.find(r => r.id === data.roleId);
        if (!selectedRole) {
            toast({ title: "Error", description: "Selected role not found.", variant: "destructive" });
            setIsGenerating(false);
            return;
        }

        toast({ title: "Generating Assessment...", description: "AI is crafting questions based on your specifications. This can take a moment." });
        generateAssessmentTemplate({
            roleName: selectedRole.name,
            roleId: selectedRole.id,
            subSkills: selectedRole.subSkills,
            assessmentName: data.name,
            questionCount: data.questionCount,
            duration: data.duration,
            difficultyMix: data.difficultyMix,
        }).then((template) => {
            setGeneratedTemplate(template);
            setView('preview');
            toast({ title: "Draft Generated!", description: "Review the questions below before saving." });
        }).catch((error) => {
            console.error("Error generating assessment:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during generation.";
            toast({ title: "Generation Failed", description: errorMessage, variant: "destructive" });
        }).finally(() => {
            setIsGenerating(false);
        });
    };

    const handleSave = async () => {
        if (!generatedTemplate) return;
        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'assessments'), generatedTemplate);
            toast({ title: "Assessment Created!", description: `${generatedTemplate.name} has been added to the templates.` });
            router.push('/admin/assessments');
        } catch(error) {
            console.error("Error saving assessment:", error);
            toast({ title: "Save Failed", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    const handleSliderChange = (values: number[]) => {
        const [easy, medium] = values;
        setValue('difficultyMix', {
            easy: easy,
            medium: medium - easy,
            hard: 100 - medium,
        });
    };
    
    return (
        <div className="p-8">
            <Button variant="ghost" onClick={() => view === 'preview' ? setView('config') : router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to {view === 'preview' ? 'Configuration' : 'Assessments'}
            </Button>
            <h1 className="text-4xl font-bold mb-2">Create New Assessment Template</h1>
            <p className="text-muted-foreground mb-8">Define parameters for the AI to generate a new assessment, then review and save.</p>
            
             <AnimatePresence mode="wait">
                {view === 'config' && (
                     <motion.div
                        key="config"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <form onSubmit={handleSubmit(onGenerate)}>
                            <Card className="max-w-4xl mx-auto bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                                <CardHeader>
                                    <CardTitle>1. Configure AI Generation</CardTitle>
                                    <CardDescription>Set the high-level details for your assessment.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Assessment Name</Label>
                                            <Input id="name" {...register('name')} placeholder="e.g., Senior Frontend Developer Screening" />
                                            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="roleId">Target Role</Label>
                                            <Controller
                                                name="roleId"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <SelectTrigger disabled={isLoadingRoles}>
                                                            <SelectValue placeholder="Select a role..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {isLoadingRoles ? (
                                                                <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                                                            ) : (
                                                                roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                            {errors.roleId && <p className="text-red-500 text-sm">{errors.roleId.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                        <div className="space-y-2">
                                            <Label htmlFor="questionCount">Number of Questions ({questionCount})</Label>
                                            <Controller name="questionCount" control={control} render={({ field: { onChange, value } }) => (
                                                <Slider onValueChange={(v) => onChange(v[0])} value={[value]} min={5} max={50} step={1} />
                                            )}/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="duration">Duration (minutes)</Label>
                                            <Controller name="duration" control={control} render={({ field: { onChange, value } }) => (
                                                 <Input type="number" value={value} onChange={e => onChange(parseInt(e.target.value))} min={10} max={180} step={5} />
                                            )}/>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Difficulty Mix</Label>
                                        <Controller name="difficultyMix" control={control} render={({ field }) => (
                                            <>
                                                <Slider
                                                    value={[field.value.easy, field.value.easy + field.value.medium]}
                                                    onValueChange={handleSliderChange}
                                                    min={0} max={100} step={5}
                                                    className="mt-4"
                                                />
                                                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                                                    <span style={{ color: '#22c55e' }}>Easy: {difficultyMix.easy}%</span>
                                                    <span style={{ color: '#f97316' }}>Medium: {difficultyMix.medium}%</span>
                                                    <span style={{ color: '#ef4444' }}>Hard: {difficultyMix.hard}%</span>
                                                </div>
                                            </>
                                        )}/>
                                    </div>

                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={isGenerating}>
                                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        {isGenerating ? 'Generating...' : 'Generate Questions'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                    </motion.div>
                )}

                 {view === 'preview' && generatedTemplate && (
                     <motion.div
                        key="preview"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                         <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                            <CardHeader>
                                <CardTitle>2. Review & Save</CardTitle>
                                <CardDescription>
                                    The AI has generated {generatedTemplate.questions.length} questions for the assessment "{generatedTemplate.name}".
                                    Review them below. You can make changes after saving.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                                {generatedTemplate.questions.map((q, i) => (
                                    <QuestionPreview key={q.id} question={q} index={i} />
                                ))}
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setView('config')}>Back to Config</Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                         <Button disabled={isSaving}>
                                            <Save className="mr-2 h-4 w-4" /> Save Template
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will create a new assessment template available to all candidates.
                                                Are you sure you want to save this template?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSave} disabled={isSaving}>
                                                 {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                 Confirm & Save
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

