
'use client';

import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Home, User, Shield } from "lucide-react";
import { SidebarButton } from "@/components/dashboard/SidebarButton";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/landing/header";

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
  
  return (
    <>
      <Header />
      <SidebarProvider>
        <div className="flex flex-row flex-grow overflow-hidden">
          <Sidebar onHover="expand">
              <div className="flex h-full flex-col p-2">
                  <div className="flex-1 overflow-y-auto">
                      <div className="flex flex-col gap-2">
                          {adminNavItems.map((item) => (
                          <SidebarButton
                              key={item.href}
                              href={item.href}
                              icon={item.icon}
                              label={item.label}
                              isActive={pathname === item.href}
                              tooltip={item.label}
                          />
                          ))}
                      </div>
                  </div>
                  <div className="mt-auto">
                      <SidebarButton
                          href="/admin/profile"
                          icon={<User />}
                          label="Profile"
                          isActive={pathname === '/admin/profile'}
                          tooltip="Profile"
                      />
                  </div>
              </div>
          </Sidebar>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </SidebarProvider>
    </>
  );
}

    