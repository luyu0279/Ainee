"use client";

import { useSidebarStore } from "@/store/sidebarStore";
import { cn } from "@/lib/utils";

export function LoadingOverlay() {
  const { isPageLoading, isExpanded } = useSidebarStore();
  
  if (!isPageLoading) return null;
  
  return (
    <div 
      className={cn(
        "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-all duration-300",
        isExpanded ? "left-52" : "left-16 lg:left-20"
      )}
    >
      <div className="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );
} 