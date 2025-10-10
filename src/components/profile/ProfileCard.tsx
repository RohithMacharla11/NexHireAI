
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EditProfileForm } from './EditProfileForm';
import { ViewProfile } from './ViewProfile';
import type { User } from '@/lib/types';
import { BrainCircuit, Pencil } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';

interface ProfileCardProps {
  profileData: User;
  onProfileUpdate: (data: Partial<User>) => Promise<void>;
  onRunAnalysis: () => Promise<void>;
}

export function ProfileCard({ profileData, onProfileUpdate, onRunAnalysis }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (updatedData: Partial<User>) => {
    await onProfileUpdate(updatedData);
    setIsEditing(false);
  };
  
  const handleAvatarUpload = async (file: File) => {
    // Mock upload. In a real app, upload to Firebase Storage and get URL.
    const reader = new FileReader();
    reader.onload = (e) => {
      const avatarUrl = e.target?.result as string;
      onProfileUpdate({ avatarUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleResumeUpload = async (file: File) => {
      // Mock upload and analysis trigger.
      console.log('Resume uploaded:', file.name);
      await onProfileUpdate({ resumeUrl: `/resumes/${file.name}` });
      // The analysis is now triggered by a dedicated button
  }

  return (
    <div className="relative perspective w-full">
      <motion.div
        className="relative w-full h-full preserve-3d transition-transform duration-700"
        animate={{ rotateY: isEditing ? -180 : 0 }}
      >
        {/* View Face */}
        <div className="absolute w-full h-full backface-hidden">
          <div className="w-full rounded-3xl border border-white/10 bg-card/60 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/20">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                <div className="relative group">
                     <Avatar className="h-24 w-24 border-4 border-primary/50">
                        <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
                        <AvatarFallback className="text-3xl bg-muted">{profileData.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                     <FileUpload
                        onFileSelect={handleAvatarUpload}
                        accept="image/*"
                        id="avatar-upload-view"
                    >
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Pencil className="h-6 w-6 text-white" />
                        </div>
                    </FileUpload>
                </div>

              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">{profileData.name}</h1>
                <p className="text-muted-foreground">{profileData.email}</p>
              </div>
              <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setIsEditing(true)} variant="outline">Edit Profile</Button>
                {profileData.role === 'candidate' && 
                    <Button onClick={onRunAnalysis}><BrainCircuit className="mr-2 h-4 w-4" /> Analyze Profile</Button>
                }
              </div>
            </div>
            <ViewProfile profileData={profileData} onResumeUpload={handleResumeUpload} />
          </div>
        </div>

        {/* Edit Face */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          <div className="w-full rounded-3xl border border-white/10 bg-card/60 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/20">
            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
            <EditProfileForm
              profileData={profileData}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
