
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ViewProfile } from './ViewProfile';
import type { User, AssessmentAttempt, Role } from '@/lib/types';
import { BrainCircuit, Pencil, Eye, ArrowLeft, History } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../ui/card';
import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';

interface ProfileCardProps {
  profileData: User;
  assessmentHistory: (AssessmentAttempt & { roleName?: string })[];
  onRunAnalysis: () => Promise<void>;
  onEdit: () => void;
  onViewInsights?: () => void;
  onAvatarUpload: (file: File) => void;
  isOwnProfile: boolean;
}

export function ProfileCard({ profileData, assessmentHistory, onRunAnalysis, onEdit, onViewInsights, onAvatarUpload, isOwnProfile }: ProfileCardProps) {
  const router = useRouter();

  const handleResumeUpload = async (file: File) => {
      // Mock upload and analysis trigger.
      // In a real app, you would upload this to storage and update the user's resumeUrl
      console.log('Resume uploaded:', file.name);
  }

  const hasAnalysis = !!profileData.analysis?.summary;

  return (
      <div className="w-full h-full rounded-3xl border border-white/10 bg-card/60 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/40 flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2 lg:w-2/5 flex flex-col">
            <div className="flex-shrink-0">
                <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                    <div className="relative group">
                        <Avatar className="h-24 w-24 border-4 border-primary/50">
                            <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
                            <AvatarFallback className="text-3xl bg-muted">{profileData.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {isOwnProfile && (
                            <FileUpload
                                onFileSelect={onAvatarUpload}
                                accept="image/*"
                                id="avatar-upload-view"
                            >
                                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Pencil className="h-6 w-6 text-white" />
                                </div>
                            </FileUpload>
                        )}
                    </div>

                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-bold">{profileData.name}</h1>
                        <p className="text-muted-foreground">{profileData.email}</p>
                        <Badge variant={profileData.role === 'admin' ? 'default' : 'secondary'} className="capitalize mt-2">{profileData.role}</Badge>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-6">
                    {isOwnProfile && (
                        <Button onClick={onEdit} variant="outline"><Pencil className="mr-2 h-4 w-4" />Edit Profile</Button>
                    )}
                    {profileData.role === 'candidate' && isOwnProfile && (
                        hasAnalysis ? (
                        <Button onClick={onViewInsights}><Eye className="mr-2 h-4 w-4" /> View AI Insights</Button>
                        ) : (
                        <Button onClick={onRunAnalysis}><BrainCircuit className="mr-2 h-4 w-4" /> Analyze Profile</Button>
                        )
                    )}
                    {!isOwnProfile && (
                        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                    )}
                </div>
            </div>
            <div className="flex-grow overflow-y-auto pr-4">
            <ViewProfile profileData={profileData} onResumeUpload={handleResumeUpload} isOwnProfile={isOwnProfile} />
            </div>
        </div>
        <div className="md:w-1/2 lg:w-3/5 flex flex-col">
           <Card className="h-full bg-background/30 flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History /> Assessment History
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto space-y-4">
                    {assessmentHistory.length > 0 ? (
                        assessmentHistory.map(attempt => (
                            <motion.div
                                key={attempt.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="bg-card/60 backdrop-blur-sm border-border/20 shadow-lg transition-all duration-300 hover:border-primary/60 hover:shadow-primary/10">
                                    <CardHeader className="flex flex-row justify-between items-center pb-2">
                                        <div>
                                            <CardTitle className="text-lg">{attempt.roleName}</CardTitle>
                                            <CardDescription>
                                                Taken on {new Date(attempt.submittedAt!).toLocaleDateString()}
                                            </CardDescription>
                                        </div>
                                         <div className="text-2xl font-bold text-primary">{Math.round(attempt.finalScore!)}%</div>
                                    </CardHeader>
                                    <CardFooter className="pt-4">
                                        <Button className="w-full" onClick={() => router.push(`/dashboard/assessments/${attempt.id}?userId=${profileData.id}`)}>
                                            View Results
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <p>No assessments taken yet.</p>
                        </div>
                    )}
                </CardContent>
           </Card>
        </div>
      </div>
  );
}
