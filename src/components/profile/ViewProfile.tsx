
import { User, Briefcase, Award, GraduationCap, Link as LinkIcon, GitBranch, Linkedin, Phone, Building, Target, Calendar, FileText, Globe, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import type { User as UserType } from '@/lib/types';

export const ViewProfile = ({ profileData, onResumeUpload }: { profileData: UserType, onResumeUpload: (file: File) => void }) => {
  return profileData.role === 'candidate' 
    ? <ViewCandidateProfile profileData={profileData} onResumeUpload={onResumeUpload} /> 
    : <ViewRecruiterProfile profileData={profileData} />;
};

const ViewCandidateProfile = ({ profileData, onResumeUpload }: { profileData: UserType, onResumeUpload: (file: File) => void }) => {
    const candidateData = profileData.candidateSpecific;
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard icon={<GraduationCap />} label="College" value={candidateData?.collegeOrUniversity} />
                <InfoCard icon={<Building />} label="Company" value={candidateData?.currentCompanyOrInternship} />
                <InfoCard icon={<Award />} label="Experience" value={candidateData?.experienceLevel} />
            </div>

            <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2"><GitBranch className="h-4 w-4" /> Skills</h3>
                {candidateData?.skills && candidateData.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {candidateData.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                    </div>
                ) : <p className="text-foreground/60 italic">Add your skills in edit mode.</p>}
            </div>
            
             <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2"><MapPin className="h-4 w-4" /> Location Preferences</h3>
                {candidateData?.locationPreferences && candidateData.locationPreferences.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {candidateData.locationPreferences.map(loc => <Badge key={loc} variant="outline">{loc}</Badge>)}
                    </div>
                ) : <p className="text-foreground/60 italic">No location preferences set.</p>}
            </div>

            <InfoSection label="Bio" value={candidateData?.bio} />
            
            <div className="flex flex-wrap gap-4 items-center">
                <SocialLink icon={<Linkedin />} href={profileData.linkedinUrl} label="LinkedIn" />
                <SocialLink icon={<GitBranch />} href={profileData.githubUrl} label="GitHub" />
                <SocialLink icon={<Globe />} href={profileData.portfolioUrl} label="Portfolio" />
            </div>

            <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Resume</h3>
                {profileData.resumeUrl ? (
                    <div className="flex items-center gap-4">
                        <p className="text-sm text-green-500">Resume uploaded.</p>
                        <FileUpload onFileSelect={onResumeUpload} accept=".pdf,.doc,.docx" id="resume-reupload">
                            <Button variant="outline" size="sm">Re-upload</Button>
                        </FileUpload>
                    </div>
                ) : (
                    <FileUpload onFileSelect={onResumeUpload} accept=".pdf,.doc,.docx" id="resume-upload">
                        <div className="flex items-center justify-center w-full">
                            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX</p>
                                </div>
                            </div>
                        </div>
                    </FileUpload>
                )}
            </div>
        </div>
    );
}

const ViewRecruiterProfile = ({ profileData }: { profileData: UserType }) => {
    const recruiterData = profileData.recruiterSpecific;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <InfoSection icon={<Building />} label="Company Name" value={recruiterData?.companyName} />
            <InfoSection icon={<Briefcase />} label="Designation" value={recruiterData?.designation} />
            <InfoSection icon={<Phone />} label="Mobile" value={recruiterData?.mobileNumber} />
            <InfoSection icon={<LinkIcon />} label="Company Website" value={recruiterData?.companyWebsite} isLink />
            <InfoSection icon={<Calendar />} label="Years of Experience" value={recruiterData?.yearsOfExperience?.toString()} />
            <div className="md:col-span-2">
                 <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2"><Target className="h-4 w-4" /> Hiring Focus</h3>
                {recruiterData?.hiringFocus && recruiterData.hiringFocus.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {recruiterData.hiringFocus.map(focus => <Badge key={focus} variant="secondary">{focus}</Badge>)}
                    </div>
                ) : <p className="text-foreground/60 italic">Not specified.</p>}
            </div>
            <div className="md:col-span-2">
                <SocialLink icon={<Linkedin />} href={profileData.linkedinUrl} label="LinkedIn" />
            </div>
        </div>
    );
};


const InfoSection = ({ icon, label, value, isLink = false }: { icon?: React.ReactNode, label: string, value?: string, isLink?: boolean }) => (
    <div>
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
            {icon && <div className="h-4 w-4">{icon}</div>}
            {label}
        </h3>
        {value ? (
            isLink ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{value}</a> : <p className="text-foreground/90 whitespace-pre-wrap">{value}</p>
        ) : (
            <p className="text-muted-foreground/70 italic">Not provided</p>
        )}
    </div>
);

const InfoCard = ({ icon, label, value }: { icon?: React.ReactNode, label: string, value?: string }) => (
    <Card className="bg-background/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
            <div className="text-lg font-bold text-foreground">
                {value || <span className="text-sm italic text-muted-foreground">Not provided</span>}
            </div>
        </CardContent>
    </Card>
);

const SocialLink = ({ icon, href, label }: { icon: React.ReactNode, href?: string, label: string }) => (
    href ? (
        <Button asChild variant="outline" size="sm">
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                {icon} {label}
            </a>
        </Button>
    ) : null
);
