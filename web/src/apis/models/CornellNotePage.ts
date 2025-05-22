/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CornellNote } from './CornellNote';
/**
 * Page structure containing Cornell notes
 */
export type CornellNotePage = {
    /**
     * Page number
     */
    page?: (number | null);
    /**
     * Cornell notes for this page
     */
    cornell_notes?: (CornellNote | null);
};

