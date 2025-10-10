
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { User, Briefcase, Award, GraduationCap, Link, GitBranch, Linkedin, Phone, Building, Target, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User as UserType } from '@/lib/types';

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const firestore = getFirestore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.id);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setProfileData({ id: docSnap.id, ...docSnap.data() } as UserType);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          toast({ title: "Error", description: "Could not fetch profile.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchProfile();
  }, [user, firestore, toast]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profileData) return;

    try {
      const userDocRef = doc(firestore, 'users', user.id);
      await setDoc(userDocRef, profileData, { merge: true });
      toast({ title: "Success", description: "Profile updated successfully!" });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setProfileData(prev => prev ? { ...prev, [name]: value } : null);
  };


  if (isLoading || authLoading || !profileData) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="relative min-h-screen w-full bg-secondary overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.2),rgba(255,255,255,0))]"></div>
        <div className="container mx-auto px-4 py-12 md:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-full max-w-4xl mx-auto bg-card/80 backdrop-blur-lg border-white/20 shadow-2xl rounded-3xl">
                    <CardHeader className="p-8">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <motion.div whileHover={{ scale: 1.1 }}>
                                <Avatar className="h-24 w-24 border-4 border-primary/50">
                                    <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
                                    <AvatarFallback className="text-3xl">{profileData.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </motion.div>
                            <div className="text-center md:text-left">
                                <h1 className="text-3xl font-bold">{profileData.name}</h1>
                                <p className="text-muted-foreground">{profileData.email}</p>
                                <Badge variant="outline" className="mt-2 text-sm">{profileData.role}</Badge>
                            </div>
                            <div className="md:ml-auto">
                                <Button onClick={() => setIsEditing(!isEditing)} variant="outline">
                                    {isEditing ? 'Cancel' : 'Edit Profile'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isEditing ? 'edit' : 'view'}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {isEditing ? (
                                    <EditProfileForm
                                        profileData={profileData}
                                        handleSave={handleSave}
                                        handleInputChange={handleInputChange}
                                        handleSelectChange={handleSelectChange}
                                    />
                                ) : (
                                    profileData.role === 'candidate' ? <ViewCandidateProfile profileData={profileData} /> : <ViewRecruiterProfile profileData={profileData} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    </div>
  );
}

const EditProfileForm = ({ profileData, handleSave, handleInputChange, handleSelectChange }: { profileData: UserType, handleSave: (e: React.FormEvent<HTMLFormElement>) => void, handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, handleSelectChange: (name: string, value: string) => void }) => {
    return (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileInput id="name" name="name" label="Full Name" value={profileData.name || ''} onChange={handleInputChange} icon={<User />} />
            <ProfileInput id="email" name="email" label="Email" value={profileData.email || ''} readOnly icon={<User />} />

            {profileData.role === 'candidate' ? (
                <>
                    <ProfileInput id="college" name="college" label="College/University" value={profileData.college || ''} onChange={handleInputChange} icon={<GraduationCap />} />
                    <ProfileInput id="company" name="company" label="Current Company/Internship" value={profileData.company || ''} onChange={handleInputChange} icon={<Building />} />
                    <div className="md:col-span-2">
                        <Label htmlFor="skills">Skills (comma separated)</Label>
                        <Input id="skills" name="skills" value={Array.isArray(profileData.skills) ? profileData.skills.join(', ') : ''} onChange={(e) => handleInputChange({ target: { name: 'skills', value: e.target.value.split(',').map(s => s.trim()) } } as any)} className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="experienceLevel">Experience Level</Label>
                        <Select name="experienceLevel" value={profileData.experienceLevel || ''} onValueChange={(value) => handleSelectChange('experienceLevel', value)}>
                            <SelectTrigger id="experienceLevel" className="w-full mt-1">
                                <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Fresher">Fresher</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Experienced">Experienced</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" name="bio" value={profileData.bio || ''} onChange={handleInputChange} className="mt-1" />
                    </div>
                    <ProfileInput id="linkedin" name="linkedin" label="LinkedIn Profile" value={profileData.linkedin || ''} onChange={handleInputChange} icon={<Linkedin />} />
                    <ProfileInput id="github" name="github" label="Portfolio/GitHub" value={profileData.github || ''} onChange={handleInputChange} icon={<GitBranch />} />
                </>
            ) : (
                <>
                    <ProfileInput id="mobile" name="mobile" label="Mobile Number" value={profileData.mobile || ''} onChange={handleInputChange} icon={<Phone />} />
                    <ProfileInput id="companyName" name="companyName" label="Company Name" value={profileData.companyName || ''} onChange={handleInputChange} icon={<Building />} />
                    <ProfileInput id="designation" name="designation" label="Role/Designation" value={profileData.designation || ''} onChange={handleInputChange} icon={<Briefcase />} />
                    <ProfileInput id="companyWebsite" name="companyWebsite" label="Company Website" value={profileData.companyWebsite || ''} onChange={handleInputChange} icon={<Link />} />
                    <ProfileInput id="yearsOfExperience" name="yearsOfExperience" label="Years of Experience" type="number" value={profileData.yearsOfExperience || ''} onChange={handleInputChange} icon={<Calendar />} />
                    <ProfileInput id="hiringFocus" name="hiringFocus" label="Hiring Focus" value={profileData.hiringFocus || ''} onChange={handleInputChange} icon={<Target />} />
                    <ProfileInput id="linkedin" name="linkedin" label="LinkedIn Profile" value={profileData.linkedin || ''} onChange={handleInputChange} icon={<Linkedin />} />
                </>
            )}
            <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Save Changes</Button>
            </div>
        </form>
    );
};

const ViewCandidateProfile = ({ profileData }: { profileData: UserType }) => (
    <div className="space-y-6">
        <InfoSection icon={<GraduationCap />} label="College / University" value={profileData.college} />
        <InfoSection icon={<Building />} label="Current Company / Internship" value={profileData.company} />
        <InfoSection icon={<Award />} label="Experience Level" value={profileData.experienceLevel} />
        <div>
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2"><GitBranch className="h-4 w-4" /> Skills</h3>
            {profileData.skills && profileData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {profileData.skills.map(skill => <Badge key={skill}>{skill}</Badge>)}
                </div>
            ) : <p className="text-foreground/80">Add your skills</p>}
        </div>
        <InfoSection label="Bio" value={profileData.bio} />
        <div className="flex flex-wrap gap-4">
            <SocialLink icon={<Linkedin />} href={profileData.linkedin} label="LinkedIn" />
            <SocialLink icon={<GitBranch />} href={profileData.github} label="GitHub/Portfolio" />
        </div>
    </div>
);

const ViewRecruiterProfile = ({ profileData }: { profileData: UserType }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <InfoSection icon={<Building />} label="Company Name" value={profileData.companyName} />
        <InfoSection icon={<Briefcase />} label="Role / Designation" value={profileData.designation} />
        <InfoSection icon={<Phone />} label="Mobile Number" value={profileData.mobile} />
        <InfoSection icon={<Link />} label="Company Website" value={profileData.companyWebsite} isLink />
        <InfoSection icon={<Calendar />} label="Years of Experience" value={profileData.yearsOfExperience?.toString()} />
        <InfoSection icon={<Target />} label="Hiring Focus" value={profileData.hiringFocus} />
        <div className="md:col-span-2">
            <SocialLink icon={<Linkedin />} href={profileData.linkedin} label="LinkedIn" />
        </div>
    </div>
);

const ProfileInput = ({ id, label, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: React.ReactNode }) => (
    <div className="grid gap-2">
        <Label htmlFor={id} className="flex items-center gap-2 text-muted-foreground"><div className="h-4 w-4">{icon}</div> {label}</Label>
        <Input id={id} {...props} className="bg-background/50 dark:bg-black/20 border-border" />
    </div>
);

const InfoSection = ({ icon, label, value, isLink = false }: { icon?: React.ReactNode, label: string, value?: string, isLink?: boolean }) => (
    <div>
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
            {icon && <div className="h-4 w-4">{icon}</div>}
            {label}
        </h3>
        {value ? (
            isLink ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a> : <p className="text-foreground/90">{value}</p>
        ) : (
            <p className="text-muted-foreground/70 italic">Not provided</p>
        )}
    </div>
);

const SocialLink = ({ icon, href, label }: { icon: React.ReactNode, href?: string, label: string }) => (
    href ? (
        <Button asChild variant="outline">
            <a href={href} target="_blank" rel="noopener noreferrer">
                {icon} {label}
            </a>
        </Button>
    ) : (
        <Button variant="outline" disabled>
            {icon} {label} not provided
        </Button>
    )
);

const ProfileSkeleton = () => (
    <div className="container mx-auto px-4 py-12 md:px-6">
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2 text-center md:text-left">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-64" />
                        <Skeleton className="h-6 w-24 mt-2" />
                    </div>
                    <div className="md:ml-auto">
                        <Skeleton className="h-10 w-28" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardContent>
        </Card>
    </div>
);
