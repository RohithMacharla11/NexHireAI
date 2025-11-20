
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll } from 'framer-motion';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '../ui/skeleton';
import { User, LayoutDashboard, NotebookPen, Shield, ChevronDown, BookCopy } from 'lucide-react';
import { Navigation } from './navigation';
import { usePathname } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AssessmentTemplate } from '@/lib/types';
import { useAssessmentStore } from '@/hooks/use-assessment-store';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user, isLoading, logout } = useAuth();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isAdminSection = pathname.startsWith('/admin');
  const [assessmentTemplates, setAssessmentTemplates] = useState<AssessmentTemplate[]>([]);
  const { firestore } = initializeFirebase();
  const assessmentStore = useAssessmentStore();
  const router = useRouter();


  useEffect(() => {
    return scrollY.on('change', (latest) => {
      setScrolled(latest > 20);
    });
  }, [scrollY]);

  useEffect(() => {
    if (!firestore || user?.role !== 'candidate') return;
    
    const q = query(collection(firestore, 'assessments'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentTemplate));
      setAssessmentTemplates(templates);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const handleStartAssessment = (template: AssessmentTemplate) => {
     if(!template.questionIds || template.questionIds.length === 0){
        // This should ideally be handled by a proper AI-generation flow if questions are missing
        console.error("Template has no questions");
        return;
    }

    // This is a simplified version. A real app would fetch the full question objects
    // For now, we mock the questions based on what the template provides.
    const questions = template.questionIds.map((id, i) => ({
        id: id,
        questionText: `Question ${i + 1} for ${template.name}`,
        type: 'mcq' as const,
        difficulty: 'Medium' as const,
        skill: template.skills[0] || 'general',
        timeLimit: 120,
        tags: [template.role]
    }));

    assessmentStore.setAssessment({
        id: template.id,
        roleId: template.role,
        roleName: template.name,
        questions: questions,
        totalTimeLimit: template.duration * 60,
        isTemplate: true,
        templateId: template.id,
    });
    router.push(`/assessment/${template.id}`);
  }

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled ? 'bg-background/80 backdrop-blur-lg shadow-md' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href={isAdminSection ? '/admin' : '/'} className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-bold">NexHireAI</span>
        </Link>
        
        {/* Only show public navigation if not in the admin section */}
        {!isAdminSection && <Navigation />}

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {user.role === 'candidate' ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <NotebookPen className="mr-2 h-4 w-4" />
                        <span>Assessments</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem asChild>
                            <Link href="/skill-assessment">
                                <BookCopy className="mr-2 h-4 w-4" />Practice by Role
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Official Assessments</DropdownMenuLabel>
                          {assessmentTemplates.length > 0 ? (
                            assessmentTemplates.map(template => (
                              <DropdownMenuItem key={template.id} onSelect={() => handleStartAssessment(template)}>
                                {template.name}
                              </DropdownMenuItem>
                            ))
                          ) : (
                             <DropdownMenuItem disabled>No official assessments</DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuItem asChild>
                      <Link href="/profile/me"><User className="mr-2 h-4 w-4" />Profile</Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin"><Shield className="mr-2 h-4 w-4" />Admin Dashboard</Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                        <Link href="/admin/profile"><User className="mr-2 h-4 w-4" />Profile</Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
