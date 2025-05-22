/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_stream_agent_chat_api_chat_stream_agent_chat_post } from '../models/Body_stream_agent_chat_api_chat_stream_agent_chat_post';
import type { Body_stream_rag_chat_api_chat_stream_rag_chat_post } from '../models/Body_stream_rag_chat_api_chat_stream_rag_chat_post';
import type { Body_welcome_follow_up_question_api_chat_welcome_follow_up_question_get } from '../models/Body_welcome_follow_up_question_api_chat_welcome_follow_up_question_get';
import type { ChatStartType } from '../models/ChatStartType';
import type { CommonResponse_KBProcessingStatusResponse_ } from '../models/CommonResponse_KBProcessingStatusResponse_';
import type { CommonResponse_WelcomeFollowUpQuestionResponse_ } from '../models/CommonResponse_WelcomeFollowUpQuestionResponse_';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Chat Available Status
     * Get welcome message
     * @param chatStartType
     * @param uid
     * @returns CommonResponse_KBProcessingStatusResponse_ Successful Response
     * @throws ApiError
     */
    public chatAvailableStatusApiChatChatAvailableStatusGet(
        chatStartType?: (ChatStartType | null),
        uid?: (string | null),
    ): CancelablePromise<CommonResponse_KBProcessingStatusResponse_> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/chat/chat_available_status',
            query: {
                'chat_start_type': chatStartType,
                'uid': uid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Welcome Follow Up Question
     * Get welcome message
     * @param requestBody
     * @returns CommonResponse_WelcomeFollowUpQuestionResponse_ Successful Response
     * @throws ApiError
     */
    public welcomeFollowUpQuestionApiChatWelcomeFollowUpQuestionGet(
        requestBody?: Body_welcome_follow_up_question_api_chat_welcome_follow_up_question_get,
    ): CancelablePromise<CommonResponse_WelcomeFollowUpQuestionResponse_> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/chat/welcome_follow_up_question',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stream Agent Chat
     * Chat with the assistant about documents in specified datasets
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public streamAgentChatApiChatStreamAgentChatPost(
        requestBody: Body_stream_agent_chat_api_chat_stream_agent_chat_post,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat/stream_agent_chat',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stream Rag Chat
     * Chat with the assistant about documents in specified datasets
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public streamRagChatApiChatStreamRagChatPost(
        requestBody: Body_stream_rag_chat_api_chat_stream_rag_chat_post,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat/stream_rag_chat',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
