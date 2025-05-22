"use client";

import React, { useState } from 'react';
import { ContentResponse } from "@/types/contentTypes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LoadError from "@/components/LoadError";

interface Tab {
  id: string;
  label: string;
}

const tabsData: Tab[] = [
  { id: 'ocrResult', label: 'OCR Result' },
  { id: 'aiDescription', label: 'AI Description' }
];

function ImageDetail({ content }: { content: ContentResponse }) {
  const [activeTab, setActiveTab] = useState<string>(tabsData[0].id);

  const handleTabClick = (tabId: string) => {
    console.log("Tab clicked:", tabId); // Debug log
    setActiveTab(tabId);
  };

  if (!content.file_url) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        No image URL provided.
      </div>
    );
  }

  // Debug logs
  console.log("Current activeTab:", activeTab);
  console.log("OCR content available:",content.image_ocr);

  return (
    <div className='px-4 pb-8 bg-white'>
      {/* <div className="font-bold text-2xl mb-[12px]">{content.title}</div> */}
      <div className="aspect-auto max-h-[70vh] overflow-hidden mb-[24px] flex justify-center">
        <img 
          src={content.file_url} 
          alt={content.title || "Image"} 
          className='max-w-full h-auto object-contain'
          onError={(e) => {
            // Set a fallback image or error state
            e.currentTarget.src = '/images/image-error.png';
          }}
        />
      </div>
      
      {content ? (
        <div>
          <div className='flex mb-3 border-b border-gray-200'>
            {tabsData.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-[12px] py-[6px] mr-2 rounded-t-[8px] text-[15px] ${
                  activeTab === tab.id 
                    ? 'bg-[#F6F5FA] font-semibold border-b-2 border-blue-500' 
                    : 'text-[#A7A3A1] hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className='text-[16px] leading-7 text-[#4F4644] mt-4'>
            {activeTab === 'aiDescription' && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content.content || 'No description available'}
              </ReactMarkdown>
            )}
            
            {activeTab === 'ocrResult' && (
              <div className="whitespace-pre-wrap">
                {content.image_ocr || 'No text found in this image'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <LoadError />
      )}
    </div>
  );
}

export default ImageDetail; 