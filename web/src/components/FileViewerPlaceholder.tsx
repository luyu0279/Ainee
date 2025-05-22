"use client";

import React from 'react';

interface FileViewerProps {
  fileType: string;
  filePath: string;
  errorComponent: React.ReactNode;
  onError: () => void;
}

export default function FileViewerPlaceholder({ fileType, filePath, errorComponent, onError }: FileViewerProps) {
  // In a real implementation, this would use an actual document viewer
  // This is just a placeholder showing the document in an iframe
  
  return (
    <div className="w-full h-full min-h-[80vh]">
      <div className="bg-gray-100 p-4 mb-4 border-b">
        <h3 className="font-semibold">Document Viewer - {fileType.toUpperCase()}</h3>
        <p className="text-sm text-gray-600 truncate">{filePath}</p>
      </div>
      
      {filePath ? (
        <iframe 
          src={filePath}
          className="w-full h-full min-h-[70vh]"
          onError={onError}
        />
      ) : (
        errorComponent
      )}
    </div>
  );
} 