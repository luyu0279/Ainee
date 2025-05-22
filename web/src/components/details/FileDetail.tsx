import React, { useEffect, useState } from 'react';
import ContentDetail from './ContentDetail';
import VideoDetail from './VideoDetail';
import PdfDetail from './PdfDetail';
import AudioDetail from './AudioDetail';
import DocDetail from './DocDetail';
import ImageDetail from './ImageDetail';
import { ContentMediaType } from '@/types/contentTypes';
import ApiLibs from '@/lib/ApiLibs';
import { toast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';
import { ResponseCode } from '@/apis/models/ResponseCode';

interface FileDetailProps {
  file: {
    id: string;
    uid: string;
    title: string;
    media_type: string;
    created_at: string;
  };
}

export function FileDetail({ file }: FileDetailProps) {
  const [loading, setLoading] = useState(true);
  const [fileContent, setFileContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (!file.uid) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await ApiLibs.content.getContentByUidApiContentUidUidGet(file.uid);
        
        if (response.code === ResponseCode.SUCCESS && response.data) {
          setFileContent({
            ...response.data,
            processing_status: response.data.processing_status || 'completed',
          });
        } else {
          throw new Error(response.message || 'Failed to fetch file content');
        }
      } catch (err) {
        console.error('Error fetching file content:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch file content');
        toast.error('Failed to load file content');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFileContent();
  }, [file.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !fileContent) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error || 'Failed to load content'}
      </div>
    );
  }

  const contentType = file.media_type?.toLowerCase();
  
  switch (contentType) {
    case ContentMediaType.VIDEO.toLowerCase():
      return <VideoDetail content={fileContent} />;
    case ContentMediaType.PDF.toLowerCase():
      return <PdfDetail content={fileContent} />;
    case ContentMediaType.AUDIO.toLowerCase():
    case ContentMediaType.AUDIO_INTERNAL.toLowerCase():
    case ContentMediaType.AUDIO_MICROPHONE.toLowerCase():
      return <AudioDetail content={fileContent} />;
    case ContentMediaType.WORD.toLowerCase():
      return <DocDetail content={fileContent} />;
    case ContentMediaType.IMAGE.toLowerCase():
      return <ImageDetail content={fileContent} />;
    default:
      return <ContentDetail content={fileContent} />;
  }
} 