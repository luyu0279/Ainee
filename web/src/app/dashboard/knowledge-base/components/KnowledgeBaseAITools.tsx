"use client";

import React from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ChatStartType } from '@/types/chatTypes';
import type { KnowledgeBase } from '@/types/knowledgeBaseTypes';

// Dynamically import ChatComponent
const ChatComponent = dynamic(() => import('@/components/chat/ChatComponent'), { ssr: false });

interface KnowledgeBaseAIToolsProps {
  knowledgeBase: KnowledgeBase | null;
  loading?: boolean;
  width?: string | number;
  height?: string | number;
}

export function KnowledgeBaseAITools({ 
  knowledgeBase, 
  loading = false, 
  width = '100%', 
  height = '100%' 
}: KnowledgeBaseAIToolsProps) {
  return (
    <div 
      className="flex flex-col overflow-hidden bg-white rounded-lg border"
      style={{ width, height }}
    >
      {/* AI Tools Tabs */}
      <div className="border-b bg-gray-50/50">
        <div className="px-4 pt-3">
          <div className="flex space-x-4">
            <div className="pb-2 pr-1 font-medium text-sm flex items-center gap-2 border-b-2 border-primary text-foreground">
              <Image src="/icon/chat_icon.svg" width={16} height={16} alt="Chat" />
              <span>Chat</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Content Area */}
      <div className="flex-1 p-1 overflow-auto">
        <div className="h-full">
          <div className="h-full flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Loading chat...</p>
              </div>
            ) : knowledgeBase?.uid ? (
              <ChatComponent 
                contentId={knowledgeBase.uid.toString()}
                contentTitle={knowledgeBase.name}
                chatStartType={ChatStartType.SINGLE_KNOWLEDGE_BASE}
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
      </div>
    </div>
  );
} 