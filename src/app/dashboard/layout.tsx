
'use client';

import { Sidebar, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, History, Trophy, Bot, Star, BookOpen, User } from "lucide-react";
import { SidebarButton } from "@/components/dashboard/SidebarButton";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Overview" },
  { href: "/dashboard/assessments", icon: <History />, label: "Assessments" },
  { href: "/dashboard/gamification", icon: <Trophy />, label: "Gamification" },
  { href: "/dashboard/job-recommender", icon: <Bot />, label: "AI Job Recommender" },
  { href: "/dashboard/skill-master", icon: <Star />, label: "AI Skill Master" },
  { href: "/dashboard/learning", icon: <BookOpen />, label: "AI Learning" },
];

function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-lg sm:px-6">
       <div className="md:hidden">
        <SidebarTrigger asChild>
          <Button variant="ghost" size="icon">
              <PanelLeft />
              <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </SidebarTrigger>
       </div>
       <div className="flex-1">
          {/* Placeholder for Breadcrumbs or Page Title */}
       </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  return (
    <SidebarProvider>
        <div className="flex flex-col h-screen w-full">
            <DashboardHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar collapsible="icon" className="border-r">
                    <div className="flex h-full flex-col">
                         <div className="hidden h-14 items-center justify-end p-2 md:flex">
                           <SidebarTrigger />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <div className="flex flex-col gap-2 p-2">
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
                        <div className="p-2 mt-auto">
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
                 <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    </SidebarProvider>
  );
}
