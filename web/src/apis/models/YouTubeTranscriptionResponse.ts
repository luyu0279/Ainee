/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SubtitleSegment } from './SubtitleSegment';
export type YouTubeTranscriptionResponse = {
    /**
     * The transcription segments
     */
    transcription: Array<SubtitleSegment>;
    /**
     * The transcription segments
     */
    transcription_raw: Array<SubtitleSegment>;
    /**
     * Markdownmap
     */
    markdownmap: string;
};

