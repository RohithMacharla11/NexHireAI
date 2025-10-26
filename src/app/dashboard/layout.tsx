
'use client';

import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { LayoutDashboard, History, Trophy, Bot, Star, BookOpen, User, Shield } from "lucide-react";
import { SidebarButton } from "@/components/dashboard/SidebarButton";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const candidateNavItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Overview" },
  { href: "/dashboard/assessments", icon: <History />, label: "Assessments" },
  { href: "/dashboard/gamification", icon: <Trophy />, label: "Gamification" },
  { href: "/dashboard/job-recommender", icon: <Bot />, label: "AI Job Recommender" },
  { href: "/dashboard/skill-master", icon: <Star />, label: "AI Skill Master" },
  { href: "/dashboard/learning", icon: <BookOpen />, label: "AI Learning" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // This layout is now only for candidates. Admins have their own layout.
  // We can return null or a loading state if a non-candidate tries to access it.
  if (user?.role !== 'candidate') {
      return null;
  }
  
  return (
    <SidebarProvider>
      <div className="flex flex-row flex-grow overflow-hidden">
        <Sidebar onHover="expand">
            <div className="flex h-full flex-col p-2">
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-2">
                        {candidateNavItems.map((item) => (
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
                        href="/profile/me"
                        icon={<User />}
                        label="Profile"
                        isActive={pathname === '/profile/me'}
                        tooltip="Profile"
                    />
                </div>
            </div>
        </Sidebar>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
