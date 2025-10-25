
'use client';

import { Sidebar, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, History, Trophy, Bot, Star, BookOpen, User } from "lucide-react";
import { SidebarButton } from "@/components/dashboard/SidebarButton";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
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
  
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar>
            <div className="flex h-full flex-col p-2">
                <div className="h-14 flex items-center justify-end">
                    <SidebarTrigger />
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-2">
                        {navItems.map((item) => (
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
                        href="/profile"
                        icon={<User />}
                        label="Profile"
                        isActive={pathname === '/profile'}
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
