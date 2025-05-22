/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KnowledgeBaseVisibility } from './KnowledgeBaseVisibility';
export type KnowledgeBaseResponse = {
    uid: string;
    name: string;
    description: (string | null);
    visibility: KnowledgeBaseVisibility;
    created_at: string;
    updated_at: string;
    user_uid?: (string | null);
    user_name?: (string | null);
    user_picture?: (string | null);
    subscriber_count?: number;
    content_count?: number;
    owned: boolean;
    subscribed: boolean;
    /**
     * Knowledge base share page URL
     */
    share_page_url?: (string | null);
};

