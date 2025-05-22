"use client";

import React from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

export default function AiAppsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Coming Soon Image */}
        <div className="relative w-full aspect-[16/9] max-w-lg mx-auto">
          <div className="absolute inset-0 flex items-center justify-center bg-muted/10 rounded-lg">
            <ImageOff className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <Image
            src="/images/ai-apps-coming-soon.svg"
            alt="AI Apps Coming Soon"
            fill
            className="object-contain z-10"
            priority
          />
        </div>
        
        {/* Coming Soon Text */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-primary">Coming Soon</h1>
          <p className="text-base text-muted-foreground">
            We're working on something exciting! Our AI Apps marketplace will be launching soon, 
            bringing you powerful tools to enhance your productivity and creativity.
          </p>
          <p className="text-xs text-muted-foreground">
            Stay tuned for updates and be the first to explore our innovative AI applications.
          </p>
        </div>
      </div>
    </div>
  );
} 