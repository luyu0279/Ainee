"use client";

import React from 'react';
import { ContentResponse } from "@/types/contentTypes";

function DocDetail({ content }: { content: ContentResponse }) {
  if (!content.file_url) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        No document URL provided.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[80vh]">
      <div className="bg-gray-100 p-4 mb-4 border-b">
        <h3 className="font-semibold">Document Viewer - DOCX</h3>
        <p className="text-sm text-gray-600 truncate">{content.file_url}</p>
      </div>
      
      <iframe 
        src={content.file_url}
        className="w-full h-full min-h-[70vh]"
        title={content.title || "Document"}
      />
    </div>
  );
}

export default DocDetail; 