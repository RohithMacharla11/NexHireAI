
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';


export default function AdminHomePage() {
  
  return (
    <div className="relative min-h-full w-full p-4 md:p-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
      
      <h1 className="text-4xl font-bold mb-8 flex items-center gap-3"><Shield /> Recruiter Dashboard</h1>

       <Card>
          <CardHeader>
              <CardTitle>Welcome, Recruiter!</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-muted-foreground">This is your dedicated dashboard for managing candidates and assessments.</p>
              <p className="text-muted-foreground mt-2">Use the navigation in the header to access your profile. More features coming soon!</p>
          </CardContent>
      </Card>
    </div>
  );
}
