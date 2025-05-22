/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationAction } from './AnnotationAction';
export type ManageAnnotationRequest = {
    /**
     * The UID of the content.
     */
    content_uid: string;
    /**
     * The UID of the annotation.
     */
    annotation_uid: string;
    /**
     * Action to perform: 'delete' or 'update'.
     */
    action: AnnotationAction;
    /**
     * The updated annotation content (required for 'update' action).
     */
    annotation_content?: (Record<string, any> | null);
    /**
     * The UID of the request.
     */
    uid: string;
};

