
"use client";

import Link from "next/link";
import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Home,
  Menu,
  FileText,
  Users,
  Briefcase,
  Settings,
  Search,
  LogOut,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Logo } from "../logo";
import { cn } from "@/lib/utils";
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

export function Header() {
  const pathname = usePathname();
  // const { user, logout } = useAuth(); // Auth disabled
  const user = mockUser; // Using mock user
  const router = useRouter();

  const handleLogout = () => {
    // logout(); // Auth disabled
    router.push('/');
  }
  
  const pathParts = pathname.split('/').filter(part => part);
  const breadcrumbItems = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    const isLast = index === pathParts.length - 1;
    return (
      <React.Fragment key={href}>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {isLast ? (
            <BreadcrumbPage className="capitalize">{part}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink href={href} className="capitalize">{part}</BreadcrumbLink>
          )}
        </BreadcrumbItem>
      </React.Fragment>
    );
  });
  
  if (!user) return null;
  const userNavItems = [
    ...navItems.all,
    ...(navItems[user.role] || []),
  ];

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card/60 backdrop-blur-lg px-4 md:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        {/* The sidebar will be the main nav on desktop */}
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link href="#" className="flex items-center gap-2 text-lg font-semibold">
              <Logo className="h-6 w-6" />
              <span>NexHireAI</span>
            </Link>
            {userNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                    pathname === item.href && "text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex-1 sm:flex-initial">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbItems}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
