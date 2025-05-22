/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentMediaType } from './ContentMediaType';
import type { KnowledgeBaseInfo } from './KnowledgeBaseInfo';
import type { ProcessingStatus } from './ProcessingStatus';
import type { SubtitleSegment } from './SubtitleSegment';
export type ContentResponse = {
    uid: string;
    /**
     * The title of the content.
     */
    title?: (string | null);
    /**
     * The name of the source site.
     */
    site_name?: (string | null);
    /**
     * The author of the content.
     */
    author?: (string | null);
    /**
     * The language of the content.
     */
    lang?: (string | null);
    /**
     * The time the content was published.
     */
    published_time?: (string | null);
    /**
     * The cover image URL.
     */
    cover?: (string | null);
    /**
     * The image URLs.
     */
    images?: (Array<string> | null);
    /**
     * The original URL of the content.
     */
    source?: (string | null);
    processing_status: ProcessingStatus;
    /**
     * The time the content was created.
     */
    created_at?: (string | null);
    /**
     * The description of the content.
     */
    description?: (string | null);
    /**
     * The content.
     */
    content?: (string | null);
    /**
     * The page URL of the content.
     */
    page_url?: (string | null);
    /**
     * The number of views
     */
    view_count?: number;
    /**
     * The number of shares
     */
    share_count?: number;
    /**
     * The AI generated mermaid diagram
     */
    ai_mermaid?: (string | null);
    /**
     * The AI generated structure
     */
    ai_structure?: (string | null);
    /**
     * The AI generated recommendation reason
     */
    ai_recommend_reason?: (string | null);
    /**
     * The AI generated summary
     */
    ai_summary?: (string | null);
    /**
     * Plain text version of the content
     */
    text_content?: (string | null);
    /**
     * AI generated tags
     */
    ai_tags?: (Array<string> | null);
    /**
     * The media type of the content
     */
    media_type?: ContentMediaType;
    /**
     * The media subtitles as structured segments
     */
    media_subtitles?: (Array<SubtitleSegment> | null);
    /**
     * The video embed URL
     */
    video_embed_html?: (string | null);
    /**
     * The file url
     */
    file_url?: (string | null);
    /**
     * The OCR result from the image
     */
    image_ocr?: (string | null);
    /**
     * The show notes for the content
     */
    shownotes?: (string | null);
    /**
     * 内容所属的知识库列表，可为空
     */
    belonged_kbs?: (Array<KnowledgeBaseInfo> | null);
    /**
     * 是否拥有该内容的权限
     */
    owned?: boolean;
};

