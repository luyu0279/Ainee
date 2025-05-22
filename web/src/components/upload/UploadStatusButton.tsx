"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InboxIcon } from 'lucide-react';
import { UploadList } from './UploadList';
import { UploadItem } from '@/types/upload';
import { cn } from '@/lib/utils';
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileStatus } from '@/types/upload';

interface UploadStatusButtonProps {
  uploads: UploadItem[];
  onCancelUpload: (uid: string) => void;
}

export function UploadStatusButton({
  uploads,
  onCancelUpload
}: UploadStatusButtonProps) {
  const [showUploadList, setShowUploadList] = useState(false);
  
  // 计算活跃上传数量
  const activeUploadCount = uploads.filter(
    upload => upload.status === FileStatus.UPLOADING || 
              upload.status === FileStatus.UPLOAD_FAILED
  ).length;

  return (
    <UploadList
      open={showUploadList}
      onOpenChange={setShowUploadList}
      uploads={uploads}
      onCancelUpload={onCancelUpload}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
        >
          <InboxIcon className="h-4 w-4" />
          {activeUploadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {activeUploadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
    </UploadList>
  );
} 