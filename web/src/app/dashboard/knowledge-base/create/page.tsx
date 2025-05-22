"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CreateKnowledgeBasePage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到主页面并添加create参数
    router.replace('/dashboard/knowledge-base?create=true');
  }, [router]);

  // 返回一个加载状态的UI
  return (
    <div className="flex h-screen justify-center items-center">
      <div className="animate-pulse">Loading...</div>
    </div>
  );
} 