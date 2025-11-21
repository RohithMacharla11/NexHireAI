
'use client';
import { useState, useEffect, useTransition } from 'react';
import { collection, query, onSnapshot, getDocs, doc, writeBatch, where, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Cohort, User, AssessmentTemplate } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FolderKanban, Users, NotebookPen, Send, BarChart2, Wand2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { matchCandidates, MatchCandidatesOutput } from '@/ai/flows/match-candidates-flow';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import Select as ReactSelect from 'react-select';
import makeAnimated from 'react-select/animated';
import { skillsOptions, experienceLevels } from '@/components/profile/profile-options';

const animatedComponents = makeAnimated();
type PipelineView = 'main' | 'ai_results' | 'manual_select';

export default function PipelinePage() {
    const { firestore } = initializeFirebase();
    const { user: adminUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // Data states
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [allCandidates, setAllCandidates] = useState<User[]>([]);
    const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
    
    // UI/Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAiMatching, startAiMatching] = useTransition();
    const [view, setView] = useState<PipelineView>('main');

    // Interactive states
    const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [jobDescription, setJobDescription] = useState('');
    const [aiMatchedCandidates, setAiMatchedCandidates] = useState<MatchCandidatesOutput>([]);
    const [draftCohortName, setDraftCohortName] = useState('');
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

    // Filtering states for manual selection
    const [nameFilter, setNameFilter] = useState('');
    const [skillFilter, setSkillFilter] = useState<string[]>([]);
    const [experienceFilter, setExperienceFilter] = useState<string[]>([]);

    useEffect(() => {
        if (!firestore) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch all candidates once
                const candidatesQuery = query(collection(firestore, 'users'), where('role', '==', 'candidate'));
                const candidatesSnap = await getDocs(candidatesQuery);
                const candidatesData = candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setAllCandidates(candidatesData);

                // Fetch assessment templates
                const templatesQuery = query(collection(firestore, 'assessments'), where('status', '==', 'active'));
                const templatesSnap = await getDocs(templatesQuery);
                setTemplates(templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentTemplate)));

                // Set up listener for cohorts
                const cohortsQuery = query(collection(firestore, 'cohorts'));
                const unsubscribeCohorts = onSnapshot(cohortsQuery, async (querySnapshot) => {
                    const cohortsData: Cohort[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cohort));
                    // Simple population, can be enhanced later if needed
                    const populatedCohorts = cohortsData.map(cohort => ({
                        ...cohort,
                        candidates: cohort.candidateIds.map(id => allCandidates.find(c => c.id === id)).filter(Boolean) as User[]
                    }));
                    setCohorts(populatedCohorts);
                });
                return unsubscribeCohorts;
            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ title: 'Error', description: 'Failed to load pipeline data.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        const unsubscribe = fetchData();
        return () => { unsubscribe.then(unsub => unsub && unsub()); };
    }, [firestore, toast]);
    
    // --- Handlers for AI and Cohort Creation ---

    const handleRunAiMatching = () => {
        if (jobDescription.length < 50) {
            toast({ title: 'Job Description Too Short', description: 'Please provide a more detailed job description for accurate matching.', variant: 'destructive'});
            return;
        }
        startAiMatching(async () => {
            toast({ title: 'AI is Analyzing...', description: 'Finding the best candidates for your job description.' });
            try {
                const results = await matchCandidates({ jobDescription });
                setAiMatchedCandidates(results);
                setSelectedCandidates(new Set(results.map(c => c.candidateId)));
                setDraftCohortName(`AI Matches for: ${jobDescription.substring(0, 30)}...`);
                setView('ai_results');
            } catch (error) {
                 toast({ title: 'AI Matching Failed', description: (error as Error).message, variant: 'destructive'});
            }
        });
    }

    const handleSelectCandidate = (candidateId: string) => {
        setSelectedCandidates(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(candidateId)) newSelection.delete(candidateId);
            else newSelection.add(candidateId);
            return newSelection;
        });
    };

    const handleCreateCohort = async () => {
        if (!adminUser || !firestore) return;
        if (draftCohortName.trim() === '') {
            toast({ title: "Name required", description: "Please give your cohort a name.", variant: "destructive" });
            return;
        }
        if (selectedCandidates.size === 0) {
            toast({ title: "No candidates", description: "Select at least one candidate.", variant: "destructive" });
            return;
        }

        try {
            await addDoc(collection(firestore, 'cohorts'), {
                name: draftCohortName,
                candidateIds: Array.from(selectedCandidates),
                createdBy: adminUser.id,
                createdAt: Date.now(),
            });
            toast({ title: "Cohort Created!", description: `Cohort "${draftCohortName}" has been added to your pipeline.` });
            resetDraftState();
        } catch (error) {
            toast({ title: "Error", description: "Could not create the cohort.", variant: "destructive" });
        }
    };
    
    const resetDraftState = () => {
        setView('main');
        setAiMatchedCandidates([]);
        setSelectedCandidates(new Set());
        setDraftCohortName('');
        setJobDescription('');
    };

    // --- Handlers for Assigning Assessments ---

    const handleOpenDialog = (cohort: Cohort) => {
        setSelectedCohort(cohort);
        setIsDialogOpen(true);
    };

    const handleAssignAssessment = async () => {
        if (!selectedCohort || !selectedTemplateId || !firestore) return;
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        if (!selectedTemplate) return;

        const batch = writeBatch(firestore);
        const cohortRef = doc(firestore, 'cohorts', selectedCohort.id);
        batch.update(cohortRef, {
            assignedAssessmentId: selectedTemplateId,
            assignedAssessmentName: selectedTemplate.name,
            assessmentAssignedAt: Date.now(),
        });

        selectedCohort.candidateIds.forEach(candidateId => {
            const notificationRef = doc(collection(firestore, `users/${candidateId}/notifications`));
            batch.set(notificationRef, {
                title: 'New Assessment Assigned',
                message: `You have been invited to take the "${selectedTemplate.name}" assessment.`,
                link: '/skill-assessment',
                isRead: false,
                createdAt: Date.now(),
            });
        });

        try {
            await batch.commit();
            toast({ title: 'Assessment Assigned!', description: `"${selectedTemplate.name}" has been sent to the cohort.` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to assign the assessment.', variant: 'destructive' });
        } finally {
            setIsDialogOpen(false);
            setSelectedCohort(null);
            setSelectedTemplateId('');
        }
    };

    // --- Memoized filter for manual selection ---
    const filteredCandidates = allCandidates.filter(candidate => {
        const nameMatch = candidate.name.toLowerCase().includes(nameFilter.toLowerCase()) || candidate.email.toLowerCase().includes(nameFilter.toLowerCase());
        const skillMatch = skillFilter.length === 0 || skillFilter.every(skill => candidate.candidateSpecific?.skills?.includes(skill));
        const expMatch = experienceFilter.length === 0 || experienceFilter.includes(candidate.candidateSpecific?.experienceLevel || '');
        return nameMatch && skillMatch && expMatch;
    });

    const selectStyles = {
        control: (styles: any) => ({ ...styles, backgroundColor: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }),
        menu: (styles: any) => ({ ...styles, backgroundColor: 'hsl(var(--card))', zIndex: 50 }),
        option: (styles: any, { isFocused, isSelected }: any) => ({ ...styles, backgroundColor: isSelected ? 'hsl(var(--primary))' : isFocused ? 'hsl(var(--accent))' : 'transparent', color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))' }),
        multiValue: (styles: any) => ({...styles, backgroundColor: 'hsl(var(--background))' }),
    };

    const renderContent = () => {
        if (isLoading) {
             return <div className="flex items-center justify-center text-center text-muted-foreground h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        }

        switch(view) {
            case 'ai_results':
                return <AiResultsView 
                    candidates={aiMatchedCandidates}
                    selectedCandidates={selectedCandidates}
                    handleSelectCandidate={handleSelectCandidate}
                    cohortName={draftCohortName}
                    setCohortName={setDraftCohortName}
                    handleCreateCohort={handleCreateCohort}
                    onCancel={resetDraftState}
                 />;
            case 'manual_select':
                return <ManualSelectView 
                    candidates={filteredCandidates}
                    selectedCandidates={selectedCandidates}
                    handleSelectCandidate={handleSelectCandidate}
                    cohortName={draftCohortName}
                    setCohortName={setDraftCohortName}
                    handleCreateCohort={handleCreateCohort}
                    onCancel={resetDraftState}
                    filters={{ nameFilter, setNameFilter, skillFilter, setSkillFilter, experienceFilter, setExperienceFilter }}
                    selectStyles={selectStyles}
                />;
            case 'main':
            default:
                return <MainPipelineView 
                    cohorts={cohorts} 
                    jobDescription={jobDescription}
                    setJobDescription={setJobDescription}
                    handleRunAiMatching={handleRunAiMatching}
                    isAiMatching={isAiMatching}
                    onManualCreate={() => { setDraftCohortName(''); setView('manual_select');}}
                    handleOpenDialog={handleOpenDialog}
                    router={router}
                />;
        }
    }

    return (
        <div className="p-8">
             <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    {renderContent()}
                </motion.div>
             </AnimatePresence>

             {/* Assign Assessment Dialog remains at top level */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Assessment to "{selectedCohort?.name}"</DialogTitle>
                        <DialogDescription>
                            Select an assessment template to send to all candidates in this cohort. They will be notified to take the test.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger><SelectValue placeholder="Select an assessment..." /></SelectTrigger>
                            <SelectContent>
                                {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssignAssessment} disabled={!selectedTemplateId}>Confirm & Send</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


// --- View Components ---

const MainPipelineView = ({ cohorts, jobDescription, setJobDescription, handleRunAiMatching, isAiMatching, onManualCreate, handleOpenDialog, router }: any) => (
    <>
        <h1 className="text-4xl font-bold mb-8">Recruitment Pipeline</h1>
        
        <Card className="mb-8 bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl">Create New Cohort</CardTitle>
                <CardDescription>Start a new recruitment cycle by sourcing candidates with AI or selecting them manually.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Wand2 className="text-primary"/> AI-Powered Sourcing</h3>
                    <Textarea 
                        placeholder="Paste a detailed job description here..."
                        rows={6}
                        value={jobDescription}
                        onChange={e => setJobDescription(e.target.value)}
                    />
                    <Button onClick={handleRunAiMatching} disabled={isAiMatching || jobDescription.length < 50}>
                        {isAiMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isAiMatching ? 'Analyzing...' : 'Find Top Matches'}
                    </Button>
                </div>
                 <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><UserPlus /> Manual Sourcing</h3>
                    <p className="text-sm text-muted-foreground">
                        Use advanced filters to search your entire talent pool and build a shortlist from scratch.
                    </p>
                    <Button variant="outline" onClick={onManualCreate}>
                        <UserPlus className="mr-2 h-4 w-4" /> Build a Cohort Manually
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        <h2 className="text-3xl font-bold mb-6">Active Cohorts</h2>
        {cohorts.length === 0 ? (
            <Card className="bg-card/30 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                    <FolderKanban className="mx-auto h-12 w-12 mb-2"/>
                    No shortlists created yet. Use the tools above to start a new cohort.
                </CardContent>
            </Card>
        ) : (
             <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } }}}
                initial="hidden"
                animate="show"
            >
                {cohorts.map((cohort: Cohort) => (
                    <motion.div key={cohort.id} variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
                        <Card className="h-full flex flex-col bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                            <CardHeader>
                                <CardTitle>{cohort.name}</CardTitle>
                                <CardDescription>Created on {format(new Date(cohort.createdAt), 'PP')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex items-center gap-2 text-muted-foreground mb-4"><Users className="h-4 w-4" /><span>{cohort.candidateIds.length} candidate(s)</span></div>
                                <div className="flex -space-x-2 overflow-hidden">
                                    {cohort.candidates?.slice(0, 5).map(c => (
                                        <Avatar key={c.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background"><AvatarImage src={c.avatarUrl} alt={c.name} /><AvatarFallback>{c.name.charAt(0)}</AvatarFallback></Avatar>
                                    ))}
                                    {cohort.candidates && cohort.candidates.length > 5 && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-xs ring-2 ring-background">+{cohort.candidates.length - 5}</div>}
                                </div>
                                {cohort.assignedAssessmentId && (
                                    <div className="mt-4 p-3 bg-primary/10 rounded-md">
                                        <p className="text-sm font-semibold flex items-center gap-2"><NotebookPen className="h-4 w-4 text-primary" /> Assessment Assigned</p>
                                        <p className="text-xs text-muted-foreground">{cohort.assignedAssessmentName}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                {cohort.assignedAssessmentId ? (
                                    <Button className="w-full" onClick={() => router.push(`/admin/pipeline/${cohort.id}`)}><BarChart2 className="mr-2 h-4 w-4" /> View Leaderboard</Button>
                                ) : (
                                    <Button className="w-full" onClick={() => handleOpenDialog(cohort)}><Send className="mr-2 h-4 w-4" /> Assign Assessment</Button>
                                )}
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        )}
    </>
);

const AiResultsView = ({ candidates, selectedCandidates, handleSelectCandidate, cohortName, setCohortName, handleCreateCohort, onCancel }: any) => (
    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
        <CardHeader>
            <CardTitle>AI-Generated Shortlist</CardTitle>
            <CardDescription>Review the AI's top picks. Uncheck any candidates to exclude them from the cohort.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="space-y-2">
                <Label htmlFor="cohortName">Cohort Name</Label>
                <Input id="cohortName" value={cohortName} onChange={e => setCohortName(e.target.value)} placeholder="e.g., Senior Frontend - Q3 2024" />
            </div>
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto p-1">
                {candidates.map((candidate: any) => (
                    <div key={candidate.candidateId} className={cn("p-3 border rounded-lg flex items-start gap-4 transition-colors", selectedCandidates.has(candidate.candidateId) && "bg-primary/10")}>
                        <Checkbox 
                            id={`candidate-${candidate.candidateId}`}
                            className="mt-1"
                            checked={selectedCandidates.has(candidate.candidateId)}
                            onCheckedChange={() => handleSelectCandidate(candidate.candidateId)}
                        />
                        <div className="flex-grow">
                            <Label htmlFor={`candidate-${candidate.candidateId}`} className="flex items-center justify-between font-semibold">
                                <span>{candidate.name}</span>
                                <Badge>{candidate.matchScore}% Match</Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground">{candidate.justification}</p>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleCreateCohort}>Create Cohort ({selectedCandidates.size} candidates)</Button>
        </CardFooter>
    </Card>
);

const ManualSelectView = ({ candidates, selectedCandidates, handleSelectCandidate, cohortName, setCohortName, handleCreateCohort, onCancel, filters, selectStyles }: any) => (
    <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
        <CardHeader>
            <CardTitle>Build Cohort Manually</CardTitle>
            <CardDescription>Filter and select candidates from your talent pool to create a new cohort.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="cohortName">Cohort Name</Label>
                    <Input id="cohortName" value={cohortName} onChange={e => setCohortName(e.target.value)} placeholder="e.g., Senior Frontend - Q3 2024" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-background/50">
                    <Input placeholder="Filter by name or email..." value={filters.nameFilter} onChange={(e) => filters.setNameFilter(e.target.value)} />
                    <ReactSelect isMulti options={skillsOptions} components={animatedComponents} styles={selectStyles} placeholder="Filter by skills..." onChange={(val: any) => filters.setSkillFilter(val.map((c: any) => c.value))} />
                    <ReactSelect isMulti options={experienceLevels} components={animatedComponents} styles={selectStyles} placeholder="Filter by experience..." onChange={(val: any) => filters.setExperienceFilter(val.map((c: any) => c.value))} />
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 p-1">
                    {candidates.map((candidate: User) => (
                         <div key={candidate.id} className={cn("p-3 border rounded-lg flex items-start gap-4 transition-colors", selectedCandidates.has(candidate.id) && "bg-primary/10")}>
                            <Checkbox id={`manual-candidate-${candidate.id}`} className="mt-1" checked={selectedCandidates.has(candidate.id)} onCheckedChange={() => handleSelectCandidate(candidate.id)} />
                            <Label htmlFor={`manual-candidate-${candidate.id}`} className="flex-grow">
                               <div className="flex justify-between items-center">
                                 <span className="font-semibold">{candidate.name}</span>
                                 <Badge variant="outline">{candidate.candidateSpecific?.experienceLevel || 'N/A'}</Badge>
                               </div>
                                <p className="text-sm text-muted-foreground">{candidate.email}</p>
                            </Label>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleCreateCohort} disabled={!cohortName.trim() || selectedCandidates.size === 0}>Create Cohort ({selectedCandidates.size} candidates)</Button>
        </CardFooter>
    </Card>
);
