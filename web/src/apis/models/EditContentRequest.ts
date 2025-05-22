/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EditContentRequest = {
    /**
     * The UID of the content to edit
     */
    uid: string;
    /**
     * New title for the content
     */
    title?: (string | null);
    /**
     * New AI tags for the content
     */
    tags?: (Array<string> | null);
    /**
     * List of knowledge base IDs to add the content to
     */
    add_to_kb_ids?: (Array<string> | null);
};

