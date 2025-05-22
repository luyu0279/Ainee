/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentMediaType } from './ContentMediaType';
export type MediaItem = {
    media_type: ContentMediaType;
    file_name: string;
    /**
     * The ID of the knowledge base this content should be assigned to
     */
    kb_uid?: (string | null);
};

