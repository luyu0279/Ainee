"use client";

import React, { createContext, useContext, useState } from 'react';
import { FileStatus, UploadItem } from '@/types/upload';

interface FileUploadContextType {
  uploads: UploadItem[];
  addUpload: (item: Omit<UploadItem, 'status' | 'progress'>) => void;
  updateUploadStatus: (uid: string, status: FileStatus, error?: string) => void;
  updateUploadProgress: (uid: string, progress: number) => void;
  cancelUpload: (uid: string) => void;
  setOnUploadSuccess: (callback: () => void) => void;
}

const FileUploadContext = createContext<FileUploadContextType | undefined>(undefined);

export function FileUploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [onUploadSuccess, setOnUploadSuccess] = useState<(() => void) | null>(null);

  const addUpload = (item: Omit<UploadItem, 'status' | 'progress'>) => {
    setUploads(prev => [...prev, {
      ...item,
      status: FileStatus.UPLOADING,
      progress: 0
    }]);
  };

  const updateUploadStatus = (uid: string, status: FileStatus, error?: string) => {
    setUploads(prev => {
      // If status is UPLOAD_SUCCEED, remove the item from the list and trigger callback
      if (status === FileStatus.UPLOAD_SUCCEED) {
        // Call the success callback if it exists
        onUploadSuccess?.();
        return prev.filter(upload => upload.uid !== uid);
      }
      // Otherwise update the status
      return prev.map(upload => 
        upload.uid === uid ? { ...upload, status, error } : upload
      );
    });
  };

  const updateUploadProgress = (uid: string, progress: number) => {
    setUploads(prev => prev.map(upload => {
      if (upload.uid === uid) {
        // Cap progress at 99% unless status is UPLOAD_SUCCEED
        const cappedProgress = progress >= 100 && upload.status !== FileStatus.UPLOAD_SUCCEED ? 99 : progress;
        return { ...upload, progress: cappedProgress };
      }
      return upload;
    }));
  };

  const cancelUpload = (uid: string) => {
    setUploads(prev => prev.filter(upload => upload.uid !== uid));
  };

  return (
    <FileUploadContext.Provider value={{
      uploads,
      addUpload,
      updateUploadStatus,
      updateUploadProgress,
      cancelUpload,
      setOnUploadSuccess: (callback: () => void) => setOnUploadSuccess(() => callback)
    }}>
      {children}
    </FileUploadContext.Provider>
  );
}

export function useFileUpload() {
  const context = useContext(FileUploadContext);
  if (context === undefined) {
    throw new Error('useFileUpload must be used within a FileUploadProvider');
  }
  return context;
} 