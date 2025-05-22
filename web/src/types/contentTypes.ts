export enum ContentMediaType {
  ARTICLE = 'text',
  VIDEO = 'video',
  PDF = 'pdf',
  AUDIO = 'audio',
  AUDIO_MICROPHONE = 'audioMicrophone',
  AUDIO_INTERNAL = 'audioInternal',
  SPOTIFY_AUDIO = 'spotifyAudio',
  WORD = 'word',
  IMAGE = 'image',
  PPT = 'ppt',
  EXCEL = 'excel',
  LINK = 'link'
}

export interface ContentResponse {
  uid?: string;
  id?: string | number;
  title?: string;
  media_type?: ContentMediaType | string;
  author?: string;
  published_time?: string;
  source?: string;
  content?: string;
  video_embed_html?: string;
  file_url?: string;
  page_url?: string;
  media_subtitles?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  shownotes?: string;
  image_ocr?: string;
  ai_structure?: string;
  ai_summary?: string;
  ai_tags?: string[];
  created_at?: string;
  updated_at?: string;
  owned?: boolean;
} 