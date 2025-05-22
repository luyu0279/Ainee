/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommonResponse_AnnotationResponse_ } from '../models/CommonResponse_AnnotationResponse_';
import type { CommonResponse_AnnotationsResponse_ } from '../models/CommonResponse_AnnotationsResponse_';
import type { CommonResponse_ManageAnnotationResponse_ } from '../models/CommonResponse_ManageAnnotationResponse_';
import type { CreateAnnotationRequest } from '../models/CreateAnnotationRequest';
import type { ManageAnnotationRequest } from '../models/ManageAnnotationRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AnnotationService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Create Annotation
     * Create a new annotation for a given content.
     * @param requestBody
     * @returns CommonResponse_AnnotationResponse_ Successful Response
     * @throws ApiError
     */
    public createAnnotationApiAnnotationCreatePost(
        requestBody: CreateAnnotationRequest,
    ): CancelablePromise<CommonResponse_AnnotationResponse_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/annotation/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All Annotations for Content
     * Retrieve all annotations for a given content.
     * @param contentUid
     * @returns CommonResponse_AnnotationsResponse_ Successful Response
     * @throws ApiError
     */
    public getAnnotationsByContentApiAnnotationContentContentUidGet(
        contentUid: string,
    ): CancelablePromise<CommonResponse_AnnotationsResponse_> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/annotation/content/{content_uid}',
            path: {
                'content_uid': contentUid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Manage Annotation
     * Manage an annotation by content UID and annotation UID (delete or update).
     * @param requestBody
     * @returns CommonResponse_ManageAnnotationResponse_ Successful Response
     * @throws ApiError
     */
    public manageAnnotationApiAnnotationManagePost(
        requestBody: ManageAnnotationRequest,
    ): CancelablePromise<CommonResponse_ManageAnnotationResponse_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/annotation/manage',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
