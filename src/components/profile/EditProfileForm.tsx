
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { User } from '@/lib/types';
import { experienceLevels, locationOptions, skillsOptions } from './profile-options';

const animatedComponents = makeAnimated();

interface EditProfileFormProps {
  profileData: User;
  onSave: (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
}

export const EditProfileForm = ({ profileData, onSave, onCancel }: EditProfileFormProps) => {
  const { register, handleSubmit, control, formState: { isSubmitting, errors } } = useForm<User>({
    defaultValues: {
      ...profileData,
      candidateSpecific: {
          ...profileData.candidateSpecific,
          skills: profileData.candidateSpecific?.skills || [],
          locationPreferences: profileData.candidateSpecific?.locationPreferences || [],
      },
      recruiterSpecific: {
          ...profileData.recruiterSpecific,
          hiringFocus: profileData.recruiterSpecific?.hiringFocus || [],
      }
    },
  });
  
  const onSubmit = (data: User) => {
    const updatedData: Partial<User> = {
        name: data.name,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
        portfolioUrl: data.portfolioUrl,
        role: profileData.role,
        ...(profileData.role === 'candidate' && {
            candidateSpecific: {
              ...data.candidateSpecific,
            }
        }),
        ...(profileData.role === 'recruiter' && {
            recruiterSpecific: {
              ...data.recruiterSpecific
            }
        })
    };
    return onSave(updatedData);
  };

  const selectStyles = {
    control: (styles: any) => ({ ...styles, backgroundColor: 'var(--background)', border: '1px solid hsl(var(--border))' }),
    menu: (styles: any) => ({ ...styles, backgroundColor: 'hsl(var(--card))', zIndex: 50 }),
    option: (styles: any, { isFocused, isSelected }: any) => ({
      ...styles,
      backgroundColor: isSelected ? 'hsl(var(--primary))' : isFocused ? 'hsl(var(--accent))' : 'transparent',
      color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
    }),
    multiValue: (styles: any) => ({...styles, backgroundColor: 'hsl(var(--secondary))' }),
    multiValueLabel: (styles: any) => ({...styles, color: 'hsl(var(--secondary-foreground))' }),
    multiValueRemove: (styles: any) => ({...styles, ':hover': { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' } }),
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" {...register('name')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profileData.email} readOnly disabled />
        </div>
      </div>
      
      {profileData.role === 'candidate' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1">
                <Label htmlFor="candidateSpecific.collegeOrUniversity">College/University</Label>
                <Input id="candidateSpecific.collegeOrUniversity" {...register('candidateSpecific.collegeOrUniversity')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="candidateSpecific.currentCompanyOrInternship">Current Company</Label>
                <Input id="candidateSpecific.currentCompanyOrInternship" {...register('candidateSpecific.currentCompanyOrInternship')} />
              </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                    <Label htmlFor="candidateSpecific.experienceLevel">Experience Level</Label>
                    <Controller
                        name="candidateSpecific.experienceLevel"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                options={experienceLevels}
                                styles={selectStyles}
                                value={experienceLevels.find(c => c.value === field.value)}
                                onChange={(val: any) => field.onChange(val.value)}
                            />
                        )}
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="candidateSpecific.yearsOfExperience">Years of Experience</Label>
                    <Input id="candidateSpecific.yearsOfExperience" type="number" {...register('candidateSpecific.yearsOfExperience', { valueAsNumber: true })} />
                </div>
            </div>
           <div className="space-y-1">
              <Label htmlFor="candidateSpecific.skills">Skills</Label>
              <Controller
                  name="candidateSpecific.skills"
                  control={control}
                  render={({ field }) => (
                      <Select
                          {...field}
                          isMulti
                          options={skillsOptions}
                          components={animatedComponents}
                          styles={selectStyles}
                          value={skillsOptions.filter(c => field.value?.includes(c.value))}
                          onChange={(val: any) => field.onChange(val.map((c: any) => c.value))}
                      />
                  )}
              />
          </div>
          <div className="space-y-1">
              <Label htmlFor="candidateSpecific.bio">Bio</Label>
              <Textarea id="candidateSpecific.bio" {...register('candidateSpecific.bio')} />
          </div>
          <div className="space-y-1">
              <Label htmlFor="candidateSpecific.locationPreferences">Location Preferences</Label>
              <Controller
                  name="candidateSpecific.locationPreferences"
                  control={control}
                  render={({ field }) => (
                      <Select
                          {...field}
                          isMulti
                          options={locationOptions}
                          components={animatedComponents}
                          styles={selectStyles}
                           value={locationOptions.filter(c => field.value?.includes(c.value))}
                           onChange={(val: any) => field.onChange(val.map((c: any) => c.value))}
                      />
                  )}
              />
          </div>
        </>
      )}

      {profileData.role === 'recruiter' && (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label htmlFor="recruiterSpecific.companyName">Company Name</Label><Input id="recruiterSpecific.companyName" {...register('recruiterSpecific.companyName')} /></div>
                <div className="space-y-1"><Label htmlFor="recruiterSpecific.designation">Designation</Label><Input id="recruiterSpecific.designation" {...register('recruiterSpecific.designation')} /></div>
                <div className="space-y-1"><Label htmlFor="recruiterSpecific.mobileNumber">Mobile Number</Label><Input id="recruiterSpecific.mobileNumber" {...register('recruiterSpecific.mobileNumber')} /></div>
                <div className="space-y-1"><Label htmlFor="recruiterSpecific.companyWebsite">Company Website</Label><Input id="recruiterSpecific.companyWebsite" {...register('recruiterSpecific.companyWebsite')} /></div>
                <div className="space-y-1"><Label htmlFor="recruiterSpecific.yearsOfExperience">Years of Experience</Label><Input id="recruiterSpecific.yearsOfExperience" type="number" {...register('recruiterSpecific.yearsOfExperience', { valueAsNumber: true })} /></div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="recruiterSpecific.hiringFocus">Hiring Focus</Label>
                <Controller
                    name="recruiterSpecific.hiringFocus"
                    control={control}
                    render={({ field }) => (
                        <Select
                            {...field}
                            isMulti
                            options={skillsOptions}
                            components={animatedComponents}
                            styles={selectStyles}
                            value={skillsOptions.filter(c => field.value?.includes(c.value))}
                            onChange={(val: any) => field.onChange(val.map((c: any) => c.value))}
                        />
                    )}
                />
            </div>
             <div className="space-y-1">
                <Label htmlFor="recruiterSpecific.notes">Notes</Label>
                <Textarea id="recruiterSpecific.notes" {...register('recruiterSpecific.notes')} />
            </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1"><Label htmlFor="linkedinUrl">LinkedIn URL</Label><Input id="linkedinUrl" {...register('linkedinUrl')} /></div>
        <div className="space-y-1"><Label htmlFor="githubUrl">GitHub URL</Label><Input id="githubUrl" {...register('githubUrl')} /></div>
        <div className="space-y-1"><Label htmlFor="portfolioUrl">Portfolio URL</Label><Input id="portfolioUrl" {...register('portfolioUrl')} /></div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </form>
  );
};
