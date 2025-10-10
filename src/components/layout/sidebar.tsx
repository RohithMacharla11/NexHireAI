
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, Users, FileText, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import type { AppUser } from "@/lib/types";

const navItems = {
  all: [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
  ],
  candidate: [
    { href: "/assessments", icon: FileText, label: "Assessments" },
    { href: "/roadmap", icon: Briefcase, label: "Roadmap" },
  ],
  recruiter: [
    { href: "/candidates", icon: Users, label: "Candidates" },
    { href: "/roles", icon: Briefcase, label: "Roles" },
  ],
  admin: [
    { href: "/admin/questions", icon: Settings, label: "Questions" },
    { href: "/admin/users", icon: Users, label: "Users" },
  ],
};

const mockUser: AppUser = {
  id: 'mock-user',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  avatarUrl: 'https://i.pravatar.cc/150?u=admin-user',
  xp: 1000
};

export function Sidebar() {
  const pathname = usePathname();
  // const { user, logout } = useAuth(); // Auth disabled
  const user = mockUser; // Using mock user
  const router = useRouter();

  const handleLogout = () => {
    // logout(); // Auth disabled
    router.push('/');
  }

  if (!user) return null;

  const userNavItems = [
    ...navItems.all,
    ...(navItems[user.role] || []),
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card/60 backdrop-blur-xl border-r border-border/30">
      <div className="p-4 flex items-center gap-2 border-b border-border/30">
        <Logo className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold">NexHireAI</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {userNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
              pathname === item.href && "text-primary bg-primary/10"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-auto p-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
