/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentMediaType } from './ContentMediaType';
export type Body_create_upload_and_pends_api_content_create_upload_and_pend_post = {
    /**
     * The source of the content.
     */
    source_url?: (string | null);
    /**
     * The media type of the content.
     */
    media_type: ContentMediaType;
    /**
     * The file content to be created.
     */
    file: Blob;
    /**
     * The language of the audio file.
     */
    audio_language?: (string | null);
};

