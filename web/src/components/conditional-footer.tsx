'use client';

import { Footer } from "@/components/footer";
import { usePathname } from "next/navigation";

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // 不在dashboard页面显示页脚
  if (pathname.startsWith('/dashboard')) {
    return null;
  }

  return <Footer />;
} 