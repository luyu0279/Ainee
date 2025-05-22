/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateAnnotationRequest = {
    /**
     * The ID of the content to annotate.
     */
    content_uid: string;
    /**
     * The UID of the annotation.
     */
    uid: string;
    /**
     * The W3C-compliant annotation content.
     */
    annotation_content: Record<string, any>;
};

