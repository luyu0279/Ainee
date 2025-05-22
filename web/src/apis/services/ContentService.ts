/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_create_by_url_api_content_create_by_url_post } from '../models/Body_create_by_url_api_content_create_by_url_post';
import type { Body_create_upload_and_pends_api_content_create_upload_and_pend_post } from '../models/Body_create_upload_and_pends_api_content_create_upload_and_pend_post';
import type { Body_upload_and_pends_api_content_upload_and_pend_post } from '../models/Body_upload_and_pends_api_content_upload_and_pend_post';
import type { CommonResponse_bool_ } from '../models/CommonResponse_bool_';
import type { CommonResponse_ContentResponse_ } from '../models/CommonResponse_ContentResponse_';
import type { CommonResponse_dict_ } from '../models/CommonResponse_dict_';
import type { CommonResponse_str_ } from '../models/CommonResponse_str_';
import type { CommonResponse_Union_bool__NoneType__ } from '../models/CommonResponse_Union_bool__NoneType__';
import type { CommonResponse_Union_ContentResponse__NoneType__ } from '../models/CommonResponse_Union_ContentResponse__NoneType__';
import type { CommonResponse_Union_List_BatchCreatedItemReponse___NoneType__ } from '../models/CommonResponse_Union_List_BatchCreatedItemReponse___NoneType__';
import type { CommonResponse_Union_List_ContentResponse___NoneType__ } from '../models/CommonResponse_Union_List_ContentResponse___NoneType__';
import type { CommonResponse_Union_str__NoneType__ } from '../models/CommonResponse_Union_str__NoneType__';
import type { CommonResponse_UserContentsData_ } from '../models/CommonResponse_UserContentsData_';
import type { CopyContentsRequest } from '../models/CopyContentsRequest';
import type { CreateContentRequest } from '../models/CreateContentRequest';
import type { EditContentRequest } from '../models/EditContentRequest';
import type { MediaItem } from '../models/MediaItem';
import type { RetryContentRequest } from '../models/RetryContentRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ContentService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Create Content
     * Create new content from a given URL.
     * @param requestBody
     * @returns CommonResponse_ContentResponse_ Successful Response
     * @throws ApiError
     */
    public createContentApiContentCreatePost(
        requestBody: CreateContentRequest,
    ): CancelablePromise<CommonResponse_ContentResponse_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Check if user can create audio task
     * Check if the current user can create new audio tasks based on their limit
     * @returns CommonResponse_bool_ Successful Response
     * @throws ApiError
     */
    public canCreateAudioTaskApiContentCanCreateAudioTaskGet(): CancelablePromise<CommonResponse_bool_> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/content/can_create_audio_task',
        });
    }
    /**
     * Batch Create Content
     * Create new content from a list of URLs or files.
     * @param requestBody
     * @returns CommonResponse_Union_List_BatchCreatedItemReponse___NoneType__ Successful Response
     * @throws ApiError
     */
    public batchCreateApiContentBatchCreatePost(
        requestBody: Array<MediaItem>,
    ): CancelablePromise<CommonResponse_Union_List_BatchCreatedItemReponse___NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/batch_create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create, upload and make content pending
     * Create, upload and make content pending
     * @param formData
     * @returns CommonResponse_Union_ContentResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public createUploadAndPendsApiContentCreateUploadAndPendPost(
        formData: Body_create_upload_and_pends_api_content_create_upload_and_pend_post,
    ): CancelablePromise<CommonResponse_Union_ContentResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/create_upload_and_pend',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload and make content pending
     * Upload a file
     * @param formData
     * @returns CommonResponse_Union_ContentResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public uploadAndPendsApiContentUploadAndPendPost(
        formData: Body_upload_and_pends_api_content_upload_and_pend_post,
    ): CancelablePromise<CommonResponse_Union_ContentResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/upload_and_pend',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Content By URL
     * Create new content from a given URL or file.
     * @param formData
     * @returns CommonResponse_Union_ContentResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public createByUrlApiContentCreateByUrlPost(
        formData?: Body_create_by_url_api_content_create_by_url_post,
    ): CancelablePromise<CommonResponse_Union_ContentResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/create_by_url',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Contents by UIDs
     * Retrieve multiple contents by their unique identifiers (UIDs).
     * @param requestBody
     * @returns CommonResponse_Union_List_ContentResponse___NoneType__ Successful Response
     * @throws ApiError
     */
    public getContentsByUidsApiContentUidsPost(
        requestBody: Array<string>,
    ): CancelablePromise<CommonResponse_Union_List_ContentResponse___NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/uids',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Content by UID
     * Retrieve content by its unique identifier (UID).
     * @param uid
     * @returns CommonResponse_Union_ContentResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public getContentByUidApiContentUidUidGet(
        uid: string,
    ): CancelablePromise<CommonResponse_Union_ContentResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/content/uid/{uid}',
            path: {
                'uid': uid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Current User's Contents
     * Retrieve all contents of the current user using cursor-based pagination.
     * @param cursor
     * @param limit
     * @returns CommonResponse_UserContentsData_ Successful Response
     * @throws ApiError
     */
    public getUserContentsApiContentUserContentsGet(
        cursor?: (string | null),
        limit: number = 100,
    ): CancelablePromise<CommonResponse_UserContentsData_> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/content/user/contents',
            query: {
                'cursor': cursor,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Retry Content Processing
     * Retry processing of a content that belongs to the current user.
     * @param requestBody
     * @returns CommonResponse_ContentResponse_ Successful Response
     * @throws ApiError
     */
    public retryContentApiContentCreateRetryPost(
        requestBody: RetryContentRequest,
    ): CancelablePromise<CommonResponse_ContentResponse_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/create/retry',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Share Content
     * Increment share count for a content
     * @param uid
     * @returns CommonResponse_str_ Successful Response
     * @throws ApiError
     */
    public shareContentApiContentShareUidPost(
        uid: string,
    ): CancelablePromise<CommonResponse_str_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/share/{uid}',
            path: {
                'uid': uid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Soft Delete Content
     * Mark content as deleted by its UID (soft delete)
     * @param uid
     * @returns CommonResponse_ContentResponse_ Successful Response
     * @throws ApiError
     */
    public deleteContentApiContentDeleteUidPost(
        uid: string,
    ): CancelablePromise<CommonResponse_ContentResponse_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/delete/{uid}',
            path: {
                'uid': uid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Increment View Count
     * Increment view count for a content by its UID
     * @param uid
     * @returns CommonResponse_Union_str__NoneType__ Successful Response
     * @throws ApiError
     */
    public incrementViewCountApiContentViewUidPost(
        uid: string,
    ): CancelablePromise<CommonResponse_Union_str__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/view/{uid}',
            path: {
                'uid': uid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Copy Contents to Current User
     * Copy contents from the provided UIDs to the current user's account.
     * @param requestBody
     * @returns CommonResponse_dict_ Successful Response
     * @throws ApiError
     */
    public copyContentsApiContentCopyPost(
        requestBody: CopyContentsRequest,
    ): CancelablePromise<CommonResponse_dict_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/copy',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Edit Content Fields
     * Edit content fields like title, AI tags, and deletion status
     * @param requestBody
     * @returns CommonResponse_Union_ContentResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public editContentApiContentEditPost(
        requestBody: EditContentRequest,
    ): CancelablePromise<CommonResponse_Union_ContentResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/content/edit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Retry youtube transcript get
     * @param uid
     * @returns CommonResponse_Union_bool__NoneType__ Successful Response
     * @throws ApiError
     */
    public retryYoutubeTranscriptGetApiContentRetryYoutubeTranscriptGetGet(
        uid: string,
    ): CancelablePromise<CommonResponse_Union_bool__NoneType__> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/content/retry_youtube_transcript_get',
            query: {
                'uid': uid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
