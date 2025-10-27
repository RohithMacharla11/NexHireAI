
'use client';

import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Shield, User } from "lucide-react";
import { SidebarButton } from "@/components/dashboard/SidebarButton";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/landing/header"; // We include Header here for the admin layout specifically.

const adminNavItems = [
  { href: "/admin", icon: <Shield />, label: "Dashboard" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin' && user?.role !== 'recruiter') {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || (user?.role !== 'admin' && user?.role !== 'recruiter')) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // This layout now includes the Header, but the navigation inside the header
  // will be configured to only show admin-relevant links.
  return (
    <>
      <Header />
      <div className="flex flex-row flex-grow pt-4">
        {/* You can re-add a sidebar here if needed in the future */}
        <main className="flex-1 overflow-y-auto px-8">{children}</main>
      </div>
    </>
  );
}
