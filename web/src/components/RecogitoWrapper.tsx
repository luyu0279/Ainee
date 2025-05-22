"use client";

import React from 'react';

interface RecogitoWrapperProps {
  content: string;
  url: string;
  contentUid: string;
  initialAnnotations: Record<string, any>[];
}

export default function RecogitoWrapper({ content, url, contentUid, initialAnnotations }: RecogitoWrapperProps) {
  return (
    <div className="px-[20px] py-4">
      <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
} 