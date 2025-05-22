"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileStatus, UploadItem } from '@/types/upload';
import { XIcon, ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface UploadListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploads: UploadItem[];
  onCancelUpload: (uid: string) => void;
  children: React.ReactNode;
}

export function UploadList({
  open,
  onOpenChange,
  uploads,
  onCancelUpload,
  children
}: UploadListProps) {
  // 过滤出正在上传和失败的项目
  const activeUploads = (uploads || []).filter(
    upload => upload?.status === FileStatus.UPLOADING ||
              upload?.status === FileStatus.UPLOAD_FAILED
  );

  return (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {children}
      <DropdownMenuContent
        align="start"
        className="w-80 border-0 ring-0 bg-popover shadow-elevation-menu z-50 mt-1"
      >
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <span className="text-sm font-medium">Upload Progress</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[300px] overflow-y-auto py-1">
          {activeUploads.map((upload) => (
            <div
              key={upload.uid}
              className="group relative bg-muted/30 rounded-lg mx-1 p-3 space-y-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-xs truncate">
                    {upload.fileName || 'Untitled'}
                  </span>
                  {upload.sourceUrl && (
                    <a
                      href={upload.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                  onClick={() => onCancelUpload(upload.uid)}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>

              <Progress
                value={upload.progress || 0}
                className={cn(
                  "h-1.5 transition-colors",
                  upload.status === FileStatus.UPLOAD_FAILED ? "bg-red-200" : ""
                )}
              />

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                  {upload.status === FileStatus.UPLOADING && 'Uploading...'}
                  {upload.status === FileStatus.UPLOAD_FAILED && (
                    <span className="text-red-500">{upload.error || 'Upload failed'}</span>
                  )}
                </span>
                <span>{Math.round(upload.progress || 0)}%</span>
              </div>
            </div>
          ))}

          {activeUploads.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No active uploads
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
