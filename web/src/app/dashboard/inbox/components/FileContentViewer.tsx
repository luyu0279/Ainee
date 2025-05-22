"use client";

import React from 'react';
import dynamic from "next/dynamic";
import { Loader2, AlertCircle, Clock, Wifi, RefreshCcw, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ContentMediaType as LocalContentMediaType, type FileContent } from "@/types/fileTypes";
import type { ContentResponse } from "@/types/contentTypes";
import type { ContentResponse as ApiContentResponse } from "@/apis/models/ContentResponse";
import type { ProcessingStatus } from "@/apis/models/ProcessingStatus";
import type { SubtitleSegment } from "@/apis/models/SubtitleSegment";
import { ContentMediaType } from "@/apis/models/ContentMediaType";
import FileDetailHeader from "@/components/FileDetailHeader";

// Dynamically import detail components
const ContentDetail = dynamic(() => import("@/components/details").then(mod => mod.ContentDetail), { ssr: false });
const VideoDetail = dynamic(() => import("@/components/details").then(mod => mod.VideoDetail), { ssr: false });
const PdfDetail = dynamic(() => import("@/components/details").then(mod => mod.PdfDetail), { ssr: false });
const AudioDetail = dynamic(() => import("@/components/details").then(mod => mod.AudioDetail), { ssr: false });
const DocDetail = dynamic(() => import("@/components/details").then(mod => mod.DocDetail), { ssr: false });
const ImageDetail = dynamic(() => import("@/components/details").then(mod => mod.ImageDetail), { ssr: false });

interface FileContentViewerProps {
  fileContent: FileContent | null;
  loading: boolean;
  error: string | null;
  onEditSuccess?: () => void;
  showDetailHeader?: boolean;
}

// Helper function to get file icon based on media type
const getItemIcon = (mediaType?: LocalContentMediaType) => {
  switch (mediaType) {
    case LocalContentMediaType.video:
      return '/icon/icon_file_video.png';
    case LocalContentMediaType.pdf:
      return '/icon/icon_pdf_add.png';
    case LocalContentMediaType.audio:
      return '/icon/icon_item_voice.png';
    case LocalContentMediaType.word:
      return '/icon/icon_item_word.png';
    case LocalContentMediaType.audioInternal:
      return '/icon/icon_recording_audio.png';
    case LocalContentMediaType.audioMicrophone:
      return '/icon/icon_recording_mic.png';
    case LocalContentMediaType.image:
      return '/icon/icon_item_image.png';
    case LocalContentMediaType.ppt:
      return '/icon/icon_item_ppt.png';
    case LocalContentMediaType.text:
      return '/icon/icon_item_txt.png';
    case LocalContentMediaType.excel:
      return '/icon/icon_item_xls.png';
    default:
      return '/icon/icon_link.png';
  }
};

// Helper function to convert FileContent to ContentResponse
const adaptToContentResponse = (content: FileContent): ContentResponse => {
  return {
    uid: content.uid,
    title: content.title,
    content: content.content,
    media_type: content.media_type,
    page_url: content.page_url,
    file_url: content.file_url,
    source: content.source,
    media_subtitles: content.media_subtitles,
    ai_tags: content.ai_tags,
    created_at: content.created_at,
    updated_at: content.updated_at,
    video_embed_html: content.video_embed_html,
    shownotes: content.shownotes,
    image_ocr: content.image_ocr,
    ai_summary: content.ai_summary,
    ai_structure: content.ai_structure,
    owned:  content.owned,
  };
};

// Helper function to convert local media type to API media type
const convertMediaType = (localType: LocalContentMediaType): ContentMediaType => {
  switch (localType) {
    case LocalContentMediaType.video:
      return ContentMediaType.VIDEO;
    case LocalContentMediaType.pdf:
      return ContentMediaType.PDF;
    case LocalContentMediaType.audio:
      return ContentMediaType.AUDIO;
    case LocalContentMediaType.word:
      return ContentMediaType.WORD;
    case LocalContentMediaType.audioInternal:
      return ContentMediaType.AUDIO_INTERNAL;
    case LocalContentMediaType.audioMicrophone:
      return ContentMediaType.AUDIO_MICROPHONE;
    case LocalContentMediaType.image:
      return ContentMediaType.IMAGE;
    case LocalContentMediaType.ppt:
      return ContentMediaType.PPT;
    case LocalContentMediaType.text:
      return ContentMediaType.TEXT;
    case LocalContentMediaType.excel:
      return ContentMediaType.EXCEL;
    case LocalContentMediaType.link:
      return ContentMediaType.ARTICLE;
    default:
      return ContentMediaType.TEXT;
  }
};

// Helper function to convert FileContent to API ContentResponse
const adaptToApiContentResponse = (content: FileContent): ApiContentResponse => {
  // Convert subtitles to match the API format
  const apiSubtitles: SubtitleSegment[] | null = content.media_subtitles?.map(segment => ({
    text: segment.text,
    start: segment.start,
    duration: segment.end - segment.start
  })) || null;

  return {
    uid: content.uid || '',
    title: content.title || '',
    content: content.content || null,
    media_type: convertMediaType(content.media_type),
    page_url: content.page_url || null,
    file_url: content.file_url || null,
    source: content.source || null,
   
    ai_tags: content.ai_tags || null,
    created_at: content.created_at || null,
    video_embed_html: content.video_embed_html || null,
    shownotes: content.shownotes || null,
    image_ocr: content.image_ocr || null,
    ai_summary: content.ai_summary || null,
    ai_structure: content.ai_structure || null,
    processing_status: 'completed' as ProcessingStatus,
    owned: content.owned || false,
    belonged_kbs: content.belonged_kbs || null
  };
};

// 骨架屏组件
const ContentSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* 标题骨架屏 */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    
    {/* 内容骨架屏 */}
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  </div>
);

// 错误状态组件
interface ErrorStateProps {
  error: string;
  type?: 'timeout' | 'network' | 'general';
  onRetry?: () => void;
}

const ErrorState = ({ error, type = 'general', onRetry }: ErrorStateProps) => {
  const icons = {
    timeout: Clock,
    network: Wifi,
    general: AlertCircle
  };
  
  const Icon = icons[type];
  
  return (
    <Alert variant="destructive" className="m-6">
      <Icon className="h-5 w-5" />
      <AlertTitle>
        {type === 'timeout' ? 'Request Timeout' :
         type === 'network' ? 'Network Error' :
         'Error'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4"
            onClick={onRetry}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default function FileContentViewer({ 
  fileContent, 
  loading, 
  error, 
  onEditSuccess,
  showDetailHeader = true 
}: FileContentViewerProps) {
 
  // 处理重试逻辑
  const handleRetry = () => {
    // 这里需要从父组件传入重试函数
    console.log('Retry loading content');
  };

  if (loading) {
    return <ContentSkeleton />;
  }

  if (error) {
    // 根据错误信息判断错误类型
    const errorType = error.toLowerCase().includes('timeout') ? 'timeout' :
                     error.toLowerCase().includes('network') ? 'network' :
                     'general';
                     
    return (
      <ErrorState 
        error={error}
        type={errorType}
        onRetry={handleRetry}
      />
    );
  }

  if (!fileContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4" />
        <p>No file content to display</p>
      </div>
    );
  }

  // 使用 useMemo 缓存转换后的内容，避免不必要的重新计算
  const contentResponse = React.useMemo(() => adaptToContentResponse(fileContent), [fileContent]);
  const apiContentResponse = React.useMemo(() => adaptToApiContentResponse(fileContent), [fileContent]);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      {showDetailHeader && (
        <div className="pt-4 px-2">
          <FileDetailHeader
            fileContent={fileContent}
            onEditSuccess={onEditSuccess}
            getItemIcon={getItemIcon}
          />
        </div>
      )}
      
      <div className="p-2">
        {(() => {
          const contentType = fileContent.media_type?.toLowerCase();
          console.log('[FileContentViewer] contentType:', contentResponse);
          
          switch (contentType) {
            case LocalContentMediaType.video.toLowerCase():
              return <VideoDetail content={contentResponse} />;
            case LocalContentMediaType.pdf.toLowerCase():
              return <PdfDetail content={apiContentResponse} />;
            case LocalContentMediaType.audio.toLowerCase():
            case LocalContentMediaType.audioInternal.toLowerCase():
            case LocalContentMediaType.audioMicrophone.toLowerCase():
              return <AudioDetail content={contentResponse} />;
            case LocalContentMediaType.word.toLowerCase():
              return <DocDetail content={contentResponse} />;
            case LocalContentMediaType.image.toLowerCase():
              return <ImageDetail content={contentResponse} />;
            case LocalContentMediaType.text.toLowerCase():
            case LocalContentMediaType.link.toLowerCase():
            default:
              return <ContentDetail content={contentResponse} />;
          }
        })()}
      </div>
    </div>
  );
} 