
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Save, PlusCircle, Trash2, X } from 'lucide-react';
import type { Role } from '@/lib/types';

const roleSchema = z.object({
  name: z.string().min(3, 'Role name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  subSkills: z.array(z.string().min(1, 'Skill cannot be empty')).min(1, 'At least one sub-skill is required'),
});

type RoleFormData = z.infer<typeof roleSchema>;

export default function NewRolePage() {
  const { firestore } = initializeFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      subSkills: [''],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subSkills",
  });

  const onSave = async (data: RoleFormData) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'roles'), data);
      toast({ title: "Role Created!", description: `${data.name} has been added.` });
      router.push('/admin/roles');
    } catch (error) {
      console.error("Error creating role:", error);
      toast({ title: "Save Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Roles
      </Button>
      <h1 className="text-4xl font-bold mb-2">Create New Role</h1>
      <p className="text-muted-foreground mb-8">Define a new professional role and its required skills.</p>
      
      <form onSubmit={handleSubmit(onSave)}>
        <Card className="max-w-2xl mx-auto bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
            <CardDescription>Fill in the information for the new role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Cloud Security Engineer" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} placeholder="A brief summary of what this role entails." />
              {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Sub-skills</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input {...register(`subSkills.${index}`)} placeholder={`Skill ${index + 1}`} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {errors.subSkills && <p className="text-red-500 text-sm">{errors.subSkills.message || errors.subSkills.root?.message}</p>}

              <Button type="button" variant="outline" size="sm" onClick={() => append('')} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Skill
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Role'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
