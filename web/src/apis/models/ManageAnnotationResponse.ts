/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationResponse } from './AnnotationResponse';
export type ManageAnnotationResponse = {
    /**
     * Whether the operation was successful.
     */
    success: boolean;
    /**
     * The updated annotation (only for update action).
     */
    annotation?: (AnnotationResponse | null);
};

