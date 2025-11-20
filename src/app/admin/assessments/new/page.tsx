
'use client';
import { useState, useEffect, useTransition } from 'react';
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
import { Loader2, ArrowLeft } from 'lucide-react';
import type { Role } from '@/lib/types';

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

export default function NewAssessmentPage() {
    const { firestore } = initializeFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isRolesLoading, setIsRolesLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

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

    useEffect(() => {
        if (!firestore) return;
        const fetchRoles = async () => {
            setIsRolesLoading(true);
            const q = query(collection(firestore, 'roles'));
            const querySnapshot = await getDocs(q);
            setRoles(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role)));
            setIsRolesLoading(false);
        };
        fetchRoles();
    }, [firestore]);

    const onSubmit = (data: AssessmentFormData) => {
        startTransition(async () => {
            const selectedRole = roles.find(r => r.id === data.roleId);
            if (!selectedRole) {
                toast({ title: "Error", description: "Selected role not found.", variant: "destructive" });
                return;
            }

            toast({ title: "Generating Assessment...", description: "AI is crafting questions based on your specifications. This can take a moment." });
            try {
                const generatedTemplate = await generateAssessmentTemplate({
                    roleName: selectedRole.name,
                    roleId: selectedRole.id,
                    subSkills: selectedRole.subSkills,
                    assessmentName: data.name,
                    questionCount: data.questionCount,
                    duration: data.duration,
                    difficultyMix: data.difficultyMix,
                });

                // Save the generated template to Firestore
                await addDoc(collection(firestore, 'assessments'), generatedTemplate);
                
                toast({ title: "Assessment Created!", description: `${data.name} has been added to the templates.` });
                router.push('/admin/assessments');

            } catch (error) {
                console.error("Error generating or saving assessment:", error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during generation.";
                toast({ title: "Generation Failed", description: errorMessage, variant: "destructive" });
            }
        });
    };

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
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assessments
            </Button>
            <h1 className="text-4xl font-bold mb-8">Create New Assessment Template</h1>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="max-w-4xl mx-auto bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader>
                        <CardTitle>Assessment Details</CardTitle>
                        <CardDescription>Define the parameters for the AI to generate a new assessment.</CardDescription>
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
                                            <SelectTrigger disabled={isRolesLoading}>
                                                <SelectValue placeholder="Select a role..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {isRolesLoading ? (
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

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="questionCount">Number of Questions ({questionCount})</Label>
                                <Controller
                                    name="questionCount"
                                    control={control}
                                    render={({ field: { onChange, value } }) => (
                                        <Slider onValueChange={(v) => onChange(v[0])} value={[value]} min={5} max={50} step={1} />
                                    )}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="duration">Duration (in minutes, approx. {Math.round(duration/questionCount * 10)/10} min/q)</Label>
                                 <Controller
                                    name="duration"
                                    control={control}
                                    render={({ field: { onChange, value } }) => (
                                        <Slider onValueChange={(v) => onChange(v[0])} value={[value]} min={10} max={180} step={5} />
                                    )}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Difficulty Mix</Label>
                             <Controller
                                name="difficultyMix"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        <Slider
                                            value={[field.value.easy, field.value.easy + field.value.medium]}
                                            onValueChange={handleSliderChange}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="mt-4"
                                        />
                                        <div className="flex justify-between text-sm text-muted-foreground mt-2">
                                            <span style={{ color: '#22c55e' }}>Easy: {difficultyMix.easy}%</span>
                                            <span style={{ color: '#f97316' }}>Medium: {difficultyMix.medium}%</span>
                                            <span style={{ color: '#ef4444' }}>Hard: {difficultyMix.hard}%</span>
                                        </div>
                                    </>
                                )}
                            />
                        </div>

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? 'Generating...' : 'Generate & Save Assessment'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
