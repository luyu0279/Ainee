/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KnowledgeBaseVisibility } from './KnowledgeBaseVisibility';
export type UpdateKnowledgeBaseRequest = {
    /**
     * Knowledge base UID
     */
    kb_uid: string;
    /**
     * Knowledge base name
     */
    name?: (string | null);
    /**
     * Knowledge base description
     */
    description?: (string | null);
    /**
     * Knowledge base visibility
     */
    visibility?: (KnowledgeBaseVisibility | null);
};

