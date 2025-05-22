"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import {
  FileText, BookOpen, LayoutGrid, 
  ChevronLeft, ChevronRight, 
  LogOut, DownloadCloud, LucideIcon,
  Download, Home
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from "sonner";
import { useSidebarStore, type SidebarTab } from '@/store/sidebarStore';

type NavItem = {
  href: string;
  label: string;
  id: 'files' | 'inbox' | 'knowledge-base' | 'ai-apps';
} & (
  | { icon: LucideIcon; iconPath?: never }
  | { icon?: never; iconPath: string }
);

const navItems: NavItem[] = [
  // { href: "/dashboard/files", icon: FileText, label: "Files", id: 'files' },
  { href: "/dashboard/inbox", iconPath: "/icon/inbox.svg", label: "Inbox", id: 'inbox' },
  { href: "/dashboard/knowledge-base", iconPath: "/icon/knowledgebase.svg", label: "Knowledge Base", id: 'knowledge-base' },
  { href: "/dashboard/ai-apps", icon: LayoutGrid, label: "AI Apps", id: 'ai-apps' }
];

export default function Sidebar() {
  const { userInfo, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, activeTab, setExpanded, setActiveTab, setPageLoading } = useSidebarStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userData, setUserData] = useState({
    displayName: 'Loading...',
    userAvatar: "/images/default-avatar.png"
  });
  
  // Update active tab based on current path
  useEffect(() => {
    const path = pathname?.split('/')[2] || '';
    if (path === '') {
      // 当路径是 /dashboard 时，不选中任何标签
      setActiveTab(null as unknown as SidebarTab);
    } else if (navItems.some(item => item.id === path)) {
      setActiveTab(path as 'files' | 'inbox' | 'knowledge-base' | 'ai-apps');
    }
  }, [pathname, setActiveTab]);

  useEffect(() => {
    if (userInfo) {
      const avatarUrl = userInfo.picture || (userInfo as any).avatar_url || "/images/default-avatar.png";
      const displayName = userInfo.name || userInfo.email || 'User Menu';
      
      setUserData({
        displayName,
        userAvatar: avatarUrl
      });
    }
  }, [userInfo]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      localStorage.removeItem('ainee_token');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <aside 
      className={cn(
        "h-full flex flex-col border-r bg-card",
        isExpanded ? "w-52" : "w-16 lg:w-20",
        "transition-all duration-300 ease-in-out"
      )}
    >
      <div className={cn("flex h-14 items-center px-4", isExpanded ? "justify-start" : "justify-center")}>
        {isExpanded ? (
          <Link href="/dashboard">
            <Image src="/images/head.png" alt="Ainee Dashboard" width={100} height={28} />
          </Link>
        ) : (
          <Link href="/dashboard">
            <Image src="/images/icon.png" alt="Ainee Icon" width={24} height={24} />
          </Link>
        )}
        <Button variant="ghost" size="icon" className="lg:hidden ml-auto" onClick={() => setExpanded(!isExpanded)}>
          {isExpanded ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <li key={item.label} title={!isExpanded ? item.label : undefined}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                    isExpanded ? "justify-start" : "justify-center",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                  onClick={() => {
                    setActiveTab(item.id);
                    setPageLoading(true);
                  }}
                >
                  {item.iconPath ? (
                    <Image src={item.iconPath} alt={item.label} width={20} height={20} />
                  ) : Icon ? (
                    <Icon className="h-5 w-5" />
                  ) : null}
                  {isExpanded && <span className="whitespace-nowrap text-sm">{item.label}</span>}
                  {!isExpanded && <span className="sr-only">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={cn("mt-auto", isExpanded ? "p-3" : "p-2")}>
        {isExpanded ? (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2 justify-start text-left p-1 rounded-md hover:bg-accent min-w-[144px] cursor-pointer">
                  <Image 
                    src={userData.userAvatar}
                    alt={`${userData.displayName}'s Avatar`} 
                    width={28} 
                    height={28} 
                    className="rounded-full" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/default-avatar.png";
                    }}
                  />
                  <span className="text-xs font-medium text-foreground truncate">
                    {userData.displayName}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 mt-1 bottom-full mb-2 border-0 ring-0 bg-popover shadow-elevation-menu" 
                align="start"
              > 
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground max-w-[200px] truncate" title={userInfo?.email || ''}>
                      {userInfo?.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="https://chromewebstore.google.com/detail/ainee-capture-knowledge-a/ibldmmdnopmghejifiikmpnpmajkgjlh?authuser=0&hl=en" target="_blank" className="flex items-center">
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    <span>Install Extension</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="https://apps.apple.com/us/app/ainee/id6738338767?pt=ainee_com&ct=202411&mt=website" target="_blank" className="flex items-center">
                    <Download className="mr-2 h-4 w-4" />
                    <span>Install App</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="https://ainee.com" className="flex items-center">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Back to Ainee.com</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center" disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                  {isLoggingOut && (
                    <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setExpanded(!isExpanded)} 
              title="Collapse sidebar" 
              className="h-9 w-9 flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center space-y-2">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="rounded-full h-9 w-9 min-w-[36px] flex items-center justify-center hover:bg-accent cursor-pointer">
                  <Image 
                    src={userData.userAvatar} 
                    alt={`${userData.displayName}'s Avatar`} 
                    width={28} 
                    height={28} 
                    className="rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/default-avatar.png";
                    }}
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 min-w-[200px] fixed bottom-16 left-2 z-[100] origin-bottom-left mb-2 border-1 shadow-lg ring-1 ring-gray-300 bg-popover shadow-elevation-menu"
                align="start" 
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground max-w-[200px] truncate" title={userInfo?.email || ''}>
                      {userInfo?.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="https://chromewebstore.google.com/detail/ainee-capture-knowledge-a/ibldmmdnopmghejifiikmpnpmajkgjlh?authuser=0&hl=en" target="_blank" className="flex items-center">
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    <span>Install Extension</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="https://apps.apple.com/us/app/ainee/id6738338767?pt=ainee_com&ct=202411&mt=website" target="_blank" className="flex items-center">
                    <Download className="mr-2 h-4 w-4" />
                    <span>Install App</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="https://ainee.com" className="flex items-center">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Back to Ainee.com</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center" disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                  {isLoggingOut && (
                    <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-lg h-9 w-9"
              onClick={() => setExpanded(!isExpanded)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
} 