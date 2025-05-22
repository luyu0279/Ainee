/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommonResponse_Union_bool__NoneType__ } from '../models/CommonResponse_Union_bool__NoneType__';
import type { CommonResponse_Union_dict__NoneType__ } from '../models/CommonResponse_Union_dict__NoneType__';
import type { CommonResponse_Union_KnowledgeBaseListResponse__NoneType__ } from '../models/CommonResponse_Union_KnowledgeBaseListResponse__NoneType__';
import type { CommonResponse_Union_KnowledgeBaseResponse__NoneType__ } from '../models/CommonResponse_Union_KnowledgeBaseResponse__NoneType__';
import type { CommonResponse_Union_List_AvailableContentResponse___NoneType__ } from '../models/CommonResponse_Union_List_AvailableContentResponse___NoneType__';
import type { CommonResponse_Union_List_ContentResponse___NoneType__ } from '../models/CommonResponse_Union_List_ContentResponse___NoneType__';
import type { ContentToKnowledgeBaseRequest } from '../models/ContentToKnowledgeBaseRequest';
import type { CreateKnowledgeBaseRequest } from '../models/CreateKnowledgeBaseRequest';
import type { KnowledgeBaseType } from '../models/KnowledgeBaseType';
import type { UpdateKnowledgeBaseRequest } from '../models/UpdateKnowledgeBaseRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class KnowledgeBaseService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Update knowledge base
     * @param requestBody
     * @returns CommonResponse_Union_KnowledgeBaseResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public updateKnowledgeBaseApiKbUpdatePost(
        requestBody: UpdateKnowledgeBaseRequest,
    ): CancelablePromise<CommonResponse_Union_KnowledgeBaseResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/kb/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create knowledge base
     * @param requestBody
     * @returns CommonResponse_Union_KnowledgeBaseResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public saveKnowledgeBaseApiKbCreatePost(
        requestBody: CreateKnowledgeBaseRequest,
    ): CancelablePromise<CommonResponse_Union_KnowledgeBaseResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/kb/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get current user's knowledge base list
     * @param type
     * @param offset
     * @param limit
     * @returns CommonResponse_Union_KnowledgeBaseListResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public getKnowledgeBaseListApiKbListOwnGet(
        type: KnowledgeBaseType,
        offset?: number,
        limit: number = 20,
    ): CancelablePromise<CommonResponse_Union_KnowledgeBaseListResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/kb/list/own',
            query: {
                'type': type,
                'offset': offset,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Explore knowledge base list
     * @param offset
     * @param limit
     * @returns CommonResponse_Union_KnowledgeBaseListResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public getOthersKnowledgeBaseListApiKbListExploreGet(
        offset?: number,
        limit: number = 20,
    ): CancelablePromise<CommonResponse_Union_KnowledgeBaseListResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/kb/list/explore',
            query: {
                'offset': offset,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get knowledge base details
     * @param kbUid
     * @returns CommonResponse_Union_KnowledgeBaseResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public getKnowledgeBaseDetailApiKbGetDetailGet(
        kbUid: string,
    ): CancelablePromise<CommonResponse_Union_KnowledgeBaseResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/kb/get_detail',
            query: {
                'kb_uid': kbUid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete knowledge base
     * @param kbUid
     * @returns CommonResponse_Union_bool__NoneType__ Successful Response
     * @throws ApiError
     */
    public deleteKnowledgeBaseApiKbDeletePost(
        kbUid: string,
    ): CancelablePromise<CommonResponse_Union_bool__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/kb/delete',
            query: {
                'kb_uid': kbUid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Batch add content to knowledge base
     * @param requestBody
     * @returns CommonResponse_Union_dict__NoneType__ Successful Response
     * @throws ApiError
     */
    public addContentsToKbApiKbAddContentsPost(
        requestBody: ContentToKnowledgeBaseRequest,
    ): CancelablePromise<CommonResponse_Union_dict__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/kb/add_contents',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Batch remove content from knowledge base
     * @param requestBody
     * @returns CommonResponse_Union_dict__NoneType__ Successful Response
     * @throws ApiError
     */
    public removeContentFromKbApiKbRemoveContentPost(
        requestBody: ContentToKnowledgeBaseRequest,
    ): CancelablePromise<CommonResponse_Union_dict__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/kb/remove_content',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get content list in knowledge base
     * @param kbUid
     * @param offset
     * @param limit
     * @returns CommonResponse_Union_List_ContentResponse___NoneType__ Successful Response
     * @throws ApiError
     */
    public getKbContentsApiKbGetContentsGet(
        kbUid: string,
        offset?: number,
        limit: number = 20,
    ): CancelablePromise<CommonResponse_Union_List_ContentResponse___NoneType__> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/kb/get_contents',
            query: {
                'kb_uid': kbUid,
                'offset': offset,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get available content list that can be added to knowledge base
     * @param kbUid
     * @returns CommonResponse_Union_List_AvailableContentResponse___NoneType__ Successful Response
     * @throws ApiError
     */
    public getAvailableContentsApiKbAvailableContentsKbUidGet(
        kbUid: string,
    ): CancelablePromise<CommonResponse_Union_List_AvailableContentResponse___NoneType__> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/kb/available_contents/{kb_uid}',
            path: {
                'kb_uid': kbUid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Subscribe to a knowledge base
     * @param kbUid
     * @returns CommonResponse_Union_bool__NoneType__ Successful Response
     * @throws ApiError
     */
    public subscribeKnowledgeBaseApiKbSubscribeKbUidPost(
        kbUid: string,
    ): CancelablePromise<CommonResponse_Union_bool__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/kb/subscribe/{kb_uid}',
            path: {
                'kb_uid': kbUid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unsubscribe from a knowledge base
     * @param kbUid
     * @returns CommonResponse_Union_bool__NoneType__ Successful Response
     * @throws ApiError
     */
    public unsubscribeKnowledgeBaseApiKbUnsubscribeKbUidPost(
        kbUid: string,
    ): CancelablePromise<CommonResponse_Union_bool__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/kb/unsubscribe/{kb_uid}',
            path: {
                'kb_uid': kbUid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
