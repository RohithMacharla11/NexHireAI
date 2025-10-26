'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ViewProfile } from './ViewProfile';
import type { User } from '@/lib/types';
import { BrainCircuit, Pencil, Eye, ArrowLeft } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { useRouter } from 'next/navigation';

interface ProfileCardProps {
  profileData: User;
  onRunAnalysis: () => Promise<void>;
  onEdit: () => void;
  onViewInsights?: () => void;
  onAvatarUpload: (file: File) => void;
  isOwnProfile: boolean;
}

export function ProfileCard({ profileData, onRunAnalysis, onEdit, onViewInsights, onAvatarUpload, isOwnProfile }: ProfileCardProps) {
  const router = useRouter();

  const handleResumeUpload = async (file: File) => {
      // Mock upload and analysis trigger.
      // In a real app, you would upload this to storage and update the user's resumeUrl
      console.log('Resume uploaded:', file.name);
  }

  const hasAnalysis = !!profileData.analysis?.summary;

  return (
      <div className="w-full h-full rounded-3xl border border-white/10 bg-card/60 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/20 flex flex-col">
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
                </div>
                <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
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
        </div>
        <div className="flex-grow overflow-y-auto pr-4">
          <ViewProfile profileData={profileData} onResumeUpload={handleResumeUpload} isOwnProfile={isOwnProfile} />
        </div>
      </div>
  );
}
