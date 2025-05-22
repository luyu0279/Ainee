'use client';

import { MainNav } from "@/components/nav-bar";
import { usePathname } from "next/navigation";

export function ConditionalNav() {
  const pathname = usePathname();
  
  // 不在dashboard页面显示导航栏
  if (pathname.startsWith('/dashboard')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-[60] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between px-6 md:px-8 lg:px-12">
        <MainNav />
      </div>
    </header>
  );
} 