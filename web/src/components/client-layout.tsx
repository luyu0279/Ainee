"use client";

import { usePathname } from "next/navigation";
import { MainNav } from "@/components/nav-bar";
import { Footer } from "@/components/footer";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardPage = pathname?.includes("/dashboard");

  if (isDashboardPage) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-[60] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between px-6 md:px-8 lg:px-12">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
} 