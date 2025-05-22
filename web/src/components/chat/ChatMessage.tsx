'use client';

import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, Reference } from '@/types/chatTypes';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 添加加载状态组件
const LoadingMessage = () => (
  <div className="flex items-center gap-2 p-3 bg-white border rounded-lg shadow-sm max-w-fit">
    <span className="text-gray-700 font-medium text-[13px]">Ainee is ruminating</span>
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-gray-500"></span>
  </div>
);

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest: boolean;
  onQuestionClick?: (question: string) => void;
}

// 解析聊天消息中的引用标记: #{index}$$
const parseContent = (content: string): { text: string; references: { index: number; position: number }[] } => {
  const regex = /(#{2}(\d+)\${2})/g;
  const references: { index: number; position: number }[] = [];
  let match;
  
  // 查找所有引用标记
  while ((match = regex.exec(content)) !== null) {
    references.push({
      index: parseInt(match[2], 10),
      position: match.index
    });
  }
  
  // 删除引用标记
  const text = content.replace(regex, '');
  
  return { text, references };
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLatest, onQuestionClick }) => {
  const [showReferences, setShowReferences] = useState(false);
  
  // 如果是用户消息，简单显示
  if (message.type === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="text-white p-3 rounded-lg max-w-[80%] text-[13px]" style={{ backgroundColor: '#69DA00' }}>
          {message.content}
        </div>
      </div>
    );
  }
  
  // 处理AI消息中的引用
  const { text, references } = parseContent(message.content);
  
  // 处理错误状态
  if (message.status === 'error') {
    return (
      <div className="flex mb-3">
        <div className="border border-red-500 bg-red-50 p-3 rounded-lg max-w-[80%]">
          <div className="flex items-center text-red-500 mb-1 text-[13px]">
            <span className="mr-1">⚠️</span>
            <span>Error</span>
          </div>
          <p className="text-[13px]">{message.error_message || 'Content is not ready for chat'}</p>
        </div>
      </div>
    );
  }
  
  // 处理加载状态
  if (message.status === 'processing' && !message.content) {
    return (
      <div className="flex mb-3">
        <LoadingMessage />
      </div>
    );
  }
  
  return (
    <div className="flex mb-4">
      <div className="bg-white border p-3 rounded-lg shadow-sm max-w-[95%]">
        {/* 消息内容 */}
        <div className="prose prose-sm max-w-none mb-2 text-[13px]">
          {text}
          
          {/* 显示引用标记 */}
          {references.length > 0 && (
            <span className="inline-flex flex-wrap gap-1 ml-1">
              {references.map((ref) => (
                <span 
                  key={ref.index} 
                  className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-[11px] font-medium"
                  title={`Reference ${ref.index}`}
                >
                  {ref.index}
                </span>
              ))}
            </span>
          )}
        </div>
        
        {/* 引用展示区域 */}
        {message.references && message.references.length > 0 && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-[11px]"
              onClick={() => setShowReferences(!showReferences)}
            >
              {showReferences ? 'Hide references' : 'Show references'}
            </Button>
            
            {showReferences && (
              <div className="mt-2 space-y-2">
                {message.references.map((reference, index) => (
                  <ReferenceItem key={reference.id} reference={reference} index={index + 1} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 后续问题建议 - 仅在最新消息显示 */}
        {isLatest && message.followup_questions && message.followup_questions.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[13px] font-medium text-gray-500">Suggested questions:</p>
            <div className="flex flex-col space-y-2 w-full">
              {message.followup_questions.map((question, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="sm" 
                  className="text-[11px] whitespace-normal text-left justify-start h-auto py-2 px-3 w-full break-words"
                  onClick={() => onQuestionClick && onQuestionClick(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ReferenceItemProps {
  reference: Reference;
  index: number;
}

const ReferenceItem: React.FC<ReferenceItemProps> = ({ reference, index }) => {
  const [expanded, setExpanded] = useState(false);
  const isExternalSource = reference.content_raw?.source_type === 'external';
  
  return (
    <div className="border rounded-md p-2 text-[13px] bg-gray-50">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-start flex-1 mr-2">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-[11px] font-medium mr-2 flex-shrink-0 mt-0.5">
            {index}
          </span>
          <span className="font-medium break-words line-clamp-2" title={reference.document_name}>
            {reference.document_name || 'Reference'}
          </span>
        </div>
        
        {reference.content_raw?.page_url && (
          <Link
            href={reference.content_raw.page_url}
            target="_blank"
            className="text-blue-500 hover:text-blue-700 ml-2 flex items-center flex-shrink-0"
          >
            {isExternalSource ? (
              <ExternalLink size={14} />
            ) : (
              <Image
                src="/icon/icon_item_txt.png"
                alt="Internal source"
                width={14}
                height={14}
              />
            )}
          </Link>
        )}
      </div>
      
      <div className="mt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] p-0 underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
        
        {expanded && (
          <div className="mt-1 p-2 bg-white rounded border text-[13px]">
            <div className="whitespace-pre-wrap break-words">{reference.content}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 