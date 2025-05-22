"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Copy, Check as CheckIcon } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import type { FileContent } from '@/types/fileTypes';
import { ChatStartType } from '@/types/chatTypes';

// Dynamically import components
const Mindmap = dynamic(() => import('@/components/Mindmap'), { ssr: false });
const ChatComponent = dynamic(() => import('@/components/chat/ChatComponent'), { ssr: false });

interface AIToolsProps {
  fileContent: FileContent | null;
  loading?: boolean;
  width?: string | number;
  height?: string | number;
}

export function AITools({ fileContent, loading = false, width = '100%', height = '100%' }: AIToolsProps) {
  const [currentTab, setCurrentTab] = useState<'summary' | 'outline' | 'chat'>('summary');
  const [copyState, setCopyState] = useState<{
    type: 'summary' | 'outline' | null;
    isCopied: boolean;
  }>({ type: null, isCopied: false });

  const handleCopy = async (content: string, type: 'summary' | 'outline') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyState({ type, isCopied: true });
      setTimeout(() => {
        setCopyState(prev => ({ ...prev, isCopied: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  // Reset copy state when tab changes
  useEffect(() => {
    setCopyState({ type: null, isCopied: false });
  }, [currentTab]);

  return (
    <div 
      className="flex flex-col overflow-hidden bg-white rounded-lg border"
      style={{ width, height }}
    >
      {/* AI Tools Tabs */}
      <div className="border-b bg-gray-50/50">
        <div className="px-4 pt-3">
          <div className="flex space-x-4">
            <button 
              onClick={() => setCurrentTab("summary")}
              className={`pb-2 pr-1 font-medium text-sm flex items-center gap-2 ${currentTab === "summary" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
            >
              <Image src="/icon/summary_icon.svg" width={16} height={16} alt="Summary" />
              <span>Summary</span>
            </button>
            <button 
              onClick={() => setCurrentTab("outline")}
              className={`pb-2 pr-1 font-medium text-sm flex items-center gap-2 ${currentTab === "outline" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
            >
              <Image src="/icon/outline_icon.svg" width={16} height={16} alt="Outline" />
              <span>Outline</span>
            </button>
            <button 
              onClick={() => setCurrentTab("chat")}
              className={`pb-2 pr-1 font-medium text-sm flex items-center gap-2 ${currentTab === "chat" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
            >
              <Image src="/icon/chat_icon.svg" width={16} height={16} alt="Chat" />
              <span>Chat</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* AI Content Area */}
      <div className="flex-1 p-1 overflow-auto">
        {currentTab === "summary" && (
          <div className="h-full py-2">
            <div className="h-full flex flex-col px-2 relative">
              {fileContent?.ai_summary && (
                <div className="absolute top-0 right-0">
                  <button
                    onClick={() => handleCopy(fileContent.ai_summary || '', 'summary')}
                    className="px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-0.5 text-xs text-gray-500"
                  >
                    {copyState.type === 'summary' && copyState.isCopied ? (
                      <>
                        <CheckIcon className="h-3 w-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Loading summary...</p>
                </div>
              ) : fileContent?.ai_summary ? (
                <div className="prose prose-sm max-w-none overflow-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({...props}) => <h1 className="text-xl font-bold my-3 font-sans text-[#213756]" {...props} />,
                      h2: ({...props}) => <h2 className="text-lg font-bold my-2 font-sans text-[#213756]" {...props} />,
                      h3: ({...props}) => <h3 className="text-md font-bold my-2 font-sans text-[#213756]" {...props} />,
                      p: ({...props}) => <p className="mb-3 font-sans text-[#737373] text-sm leading-relaxed" {...props} />,
                      ul: ({...props}) => <ul className="list-disc pl-5 mb-3 font-sans text-[#737373] text-sm" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal pl-5 mb-3 font-sans text-[#737373] text-sm" {...props} />,
                      li: ({...props}) => <li className="mb-1 font-sans text-[#737373]" {...props} />,
                      code: ({...props}) => <code className="bg-gray-100 px-1 rounded text-sm font-mono text-[#4D4DFF]" {...props} />,
                      pre: ({...props}) => <pre className="bg-gray-100 p-2 rounded-md my-2 text-sm font-mono overflow-x-auto" {...props} />,
                      blockquote: ({...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 font-sans text-[#737373]" {...props} />,
                      table: ({...props}) => <table className="border-collapse w-full my-3 font-sans text-sm" {...props} />,
                      th: ({...props}) => <th className="border border-gray-300 p-2 bg-gray-50 font-sans text-[#213756]" {...props} />,
                      td: ({...props}) => <td className="border border-gray-300 p-2 font-sans text-[#737373] text-sm" {...props} />,
                    }}
                  >
                    {fileContent.ai_summary}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Summary is being generated, please wait a moment...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {currentTab === "outline" && (
          <div className="h-full">
            <div className="h-full flex flex-col relative">
              {fileContent?.ai_structure && (
                <div className="absolute top-0 right-0 z-50 pt-2">
                  <button
                    onClick={() => handleCopy(JSON.stringify(fileContent.ai_structure, null, 2), 'outline')}
                    className="px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-0.5 text-xs text-gray-500"
                  >
                    {copyState.type === 'outline' && copyState.isCopied ? (
                      <>
                        <CheckIcon className="h-3 w-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Loading outline...</p>
                </div>
              ) : fileContent?.ai_structure ? (
                <div className="overflow-auto flex-1">
                  <div className="h-full w-full bg-gray-50 p-0 rounded relative">
                    <Mindmap chart={fileContent.ai_structure} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Outline is being generated, please wait a moment...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {currentTab === "chat" && (
          <div className="h-full">
            <div className="h-full flex flex-col overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Loading chat...</p>
                </div>
              ) : fileContent ? (
                <ChatComponent 
                  contentId={fileContent.uid || fileContent.id.toString()}
                  contentTitle={fileContent.title}
                  chatStartType={ChatStartType.ARTICLE}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No content available to chat with.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 