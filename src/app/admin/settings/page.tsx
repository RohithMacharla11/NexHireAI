
'use client';
import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Settings, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { clearAllData } from '@/ai/flows/clear-data-flow';

export default function SettingsPage() {
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleClearData = () => {
        startDeleteTransition(async () => {
            toast({
                title: "Clearing Data...",
                description: "This may take a moment. The page will reload upon completion.",
            });
            try {
                const result = await clearAllData();
                const total = Object.values(result.deletedCounts).reduce((acc, count) => acc + count, 0);
                toast({
                    title: "Data Cleared Successfully",
                    description: `${total} documents were removed from the database.`,
                });
                // Reload the page to reflect the cleared state
                window.location.reload();
            } catch (error) {
                 toast({
                    title: "Deletion Failed",
                    description: (error as Error).message || "An unexpected error occurred.",
                    variant: "destructive",
                });
            } finally {
                setIsDialogOpen(false);
            }
        });
    };

    return (
        <div className="p-8">
            <h1 className="text-4xl font-bold mb-8">Admin Settings</h1>
            <div className="grid gap-8">
                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                    <CardHeader>
                        <CardTitle>Platform Settings</CardTitle>
                        <CardDescription>
                            General platform configurations will be managed here. This feature is coming soon.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground h-48">
                        <Settings className="h-12 w-12 mb-4" />
                        <p>Theme, branding, and integration settings will appear here.</p>
                    </CardContent>
                </Card>

                <Card className="border-destructive bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle /> Danger Zone
                        </CardTitle>
                        <CardDescription>
                           These actions are irreversible and will permanently affect your platform's data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center p-4 border border-destructive/20 rounded-lg">
                            <div>
                                <h3 className="font-semibold">Clear All Platform Data</h3>
                                <p className="text-sm text-muted-foreground">Wipe all users, roles, assessments, and cohorts. Useful for a clean start.</p>
                            </div>
                            <Button variant="destructive" onClick={() => setIsDialogOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4"/> Clear Data
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all users (except your admin account if implementation allows), roles, assessments, questions, and cohort data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={handleClearData}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Delete Everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
