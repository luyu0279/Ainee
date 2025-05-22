import { KnowledgeBaseVisibility } from '@/apis/models/KnowledgeBaseVisibility';

export interface KnowledgeBaseFormData {
  name: string;
  description: string;
  visibility: KnowledgeBaseVisibility;
}

export interface KnowledgeBaseAccessOption {
  value: KnowledgeBaseVisibility;
  label: string;
  description: string;
  disabled?: boolean;
}

export const ACCESS_OPTIONS: KnowledgeBaseAccessOption[] = [
  {
    value: KnowledgeBaseVisibility.DEFAULT,
    label: 'Default',
    description: 'Shareable via link, not discoverable on the Explore page'
  },
  {
    value: KnowledgeBaseVisibility.PRIVATE,
    label: 'Private',
    description: 'Knowledge base is visible only to you'
  },
  {
    value: KnowledgeBaseVisibility.PUBLIC,
    label: 'Public to Explore',
    description: 'Discoverable and searchable on the Explore page'
  }
]; 