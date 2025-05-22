'use client';

import React, { useEffect } from 'react';
import { redirect, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './components/sidebar';
import { Loader2 } from 'lucide-react';
import { LoadingOverlay } from "@/components/loading-overlay";
import { useSidebarStore } from "@/store/sidebarStore";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userInfo, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setPageLoading } = useSidebarStore();

  useEffect(() => {
    // Wait until authentication check is complete
    if (!loading && !userInfo) {
      // If no user is logged in, redirect to login page
      router.push('/login');
    }
  }, [userInfo, loading, router]);

  useEffect(() => {
    // Route change completed
    setPageLoading(false);
  }, [pathname, setPageLoading]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!userInfo) {
    return null;
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <LoadingOverlay />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
} 