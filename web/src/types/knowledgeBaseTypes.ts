import { KnowledgeBaseVisibility } from "@/apis/models/KnowledgeBaseVisibility";

export interface KnowledgeBase {
  uid: string;
  name: string;
  description?: string | null;
  visibility?: KnowledgeBaseVisibility;
  owned?: boolean;
  subscribed?: boolean;
}

export interface KnowledgeBaseInfo {
  uid: string;
  name: string;
} 