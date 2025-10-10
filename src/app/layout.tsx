
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { FirebaseClientProvider } from '@/firebase';
import { AuthLayout } from '@/components/layout/auth-layout';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'NexHireAI',
  description: 'AI-Powered Hiring Assessments',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          fontBody.variable,
          'font-body antialiased'
        )}
      >
        <FirebaseClientProvider>
          <AuthProvider>
            <AuthLayout>
              <div className="relative min-h-screen w-full">
                 <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.2),rgba(255,255,255,0))]"></div>
                {children}
              </div>
              <Toaster />
            </AuthLayout>
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
