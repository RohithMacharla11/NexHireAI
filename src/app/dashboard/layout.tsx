'use client';

import { Sidebar, SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from "@/components/ui/sidebar";
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
  const { toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-lg sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <div className="md:hidden">
         <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
       </div>
        {/* Can add breadcrumbs or other header content here */}
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
        <Sidebar collapsible="icon">
            <div className="flex h-full flex-col">
                <div className="flex h-14 items-center justify-between p-2 group-data-[collapsible=icon]:justify-center">
                    <div className="flex-1 group-data-[collapsible=icon]:hidden">
                       {/* Placeholder for header content */}
                    </div>
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
        <div className="flex flex-col w-full">
            <DashboardHeader />
            <SidebarInset>
                {children}
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
