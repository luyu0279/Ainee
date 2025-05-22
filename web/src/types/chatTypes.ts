import { ChatStartType as ApiChatStartType } from '@/apis/models/ChatStartType';

export { ApiChatStartType as ChatStartType };

export interface ContentRaw {
  source_type: 'internal' | 'external';
  source: string | null;
  uid: string;
  title: string;
  media_type: string;
  page_url: string | null;
}

export interface Reference {
  id: string;
  content: string;
  document_id: string;
  document_name: string;
  dataset_id: string;
  image_id: string;
  positions: any[];
  url: string | null;
  content_raw: ContentRaw;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  references?: Reference[];
  followup_questions?: string[];
  timestamp: number;
  status?: 'processing' | 'completed' | 'error';
  error_message?: string | null;
}

export interface ChatAvailableStatusResponse {
  status: string;
  message?: string;
}

export interface ChatComponentProps {
  contentId: string;
  contentTitle: string;
  chatStartType: ApiChatStartType;
}

export interface RagChatRequest {
  question: string;
  msg_id: string;
  chat_start_type: ApiChatStartType;
  uid: string;
  quote_text?: string;
}

export interface MessageResponse {
  msg_id: string;
  content: string;
  reference: Reference[];
  status: 'processing' | 'completed' | 'error';
  error_message: string | null;
  followup_question?: string[];
} 