// Media type enum
export enum ContentMediaType {
  video = 'video',
  pdf = 'pdf',
  audio = 'audio',
  word = 'word',
  audioInternal = 'audioInternal',
  audioMicrophone = 'audioMicrophone',
  image = 'image',
  ppt = 'ppt',
  text = 'text',
  excel = 'excel',
  link = 'link'
}

// Basic file item interface
export interface FileItem {
  id: string | number;
  title: string;
  media_type: ContentMediaType;
  created_at: string;
  last_accessed?: string;
  uid?: string;
}

// Shared file item interface
export interface SharedFileItem extends FileItem {
  timestamp?: number;
}

// File content interface
export interface FileContent extends FileItem {
  page_url?: string;
  content?: string;
  ai_tags?: string[];
  updated_at?: string;
  file_url?: string;
  video_embed_html?: string;
  media_subtitles?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  shownotes?: string;
  image_ocr?: string;
  ai_summary?: string;
  ai_structure?: string;
  belonged_kbs?: any[]; // Using any for now, can be replaced with proper type
  source?: string;
  owned?: boolean;
}

// Utility function to get file icon
export const getItemIcon = (mediaType?: ContentMediaType): string => {
  switch (mediaType) {
    case ContentMediaType.video:
      return '/icon/icon_file_video.png';
    case ContentMediaType.pdf:
      return '/icon/icon_pdf_add.png';
    case ContentMediaType.audio:
      return '/icon/icon_item_voice.png';
    case ContentMediaType.word:
      return '/icon/icon_item_word.png';
    case ContentMediaType.audioInternal:
      return '/icon/icon_recording_audio.png';
    case ContentMediaType.audioMicrophone:
      return '/icon/icon_recording_mic.png';
    case ContentMediaType.image:
      return '/icon/icon_item_image.png';
    case ContentMediaType.ppt:
      return '/icon/icon_item_ppt.png';
    case ContentMediaType.text:
      return '/icon/icon_item_txt.png';
    case ContentMediaType.excel:
      return '/icon/icon_item_xls.png';
    default:
      return '/icon/icon_link.png';
  }
}; 