/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_generate_flashcards_api_ainee_web_flashcards_generate_post } from '../models/Body_generate_flashcards_api_ainee_web_flashcards_generate_post';
import type { Body_upload_file_with_params_api_ainee_web_cornell_notes_generate_post } from '../models/Body_upload_file_with_params_api_ainee_web_cornell_notes_generate_post';
import type { CommonResponse_FlashcardGenerationResult_ } from '../models/CommonResponse_FlashcardGenerationResult_';
import type { CommonResponse_TeacherThankYouNoteResponse_ } from '../models/CommonResponse_TeacherThankYouNoteResponse_';
import type { CommonResponse_Union_CornellNotesResult__NoneType__ } from '../models/CommonResponse_Union_CornellNotesResult__NoneType__';
import type { CommonResponse_Union_ThankYouNoteResponse__NoneType__ } from '../models/CommonResponse_Union_ThankYouNoteResponse__NoneType__';
import type { CommonResponse_Union_YouTubeTranscriptionResponse__NoneType__ } from '../models/CommonResponse_Union_YouTubeTranscriptionResponse__NoneType__';
import type { TeacherThankYouNoteRequest } from '../models/TeacherThankYouNoteRequest';
import type { ThankYouNoteRequest } from '../models/ThankYouNoteRequest';
import type { YouTubeTranscriptionRequest } from '../models/YouTubeTranscriptionRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AineeWebService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get YouTube Video Transcription
     * Get transcription for a YouTube video by its URL
     * @param requestBody
     * @returns CommonResponse_Union_YouTubeTranscriptionResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public getYoutubeTranscriptionApiAineeWebYoutubeTranscriptionPost(
        requestBody: YouTubeTranscriptionRequest,
    ): CancelablePromise<CommonResponse_Union_YouTubeTranscriptionResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/ainee_web/youtube/transcription',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Thank You Note
     * Generate a personalized thank you note for an interview
     * @param requestBody
     * @returns CommonResponse_Union_ThankYouNoteResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public generateThankYouNoteApiAineeWebThankYouNotePost(
        requestBody: ThankYouNoteRequest,
    ): CancelablePromise<CommonResponse_Union_ThankYouNoteResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/ainee_web/thank-you-note',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Thank You Note for Teacher
     * Generate a personalized thank you note for a teacher with customizable tone and length
     * @param requestBody
     * @returns CommonResponse_TeacherThankYouNoteResponse_ Successful Response
     * @throws ApiError
     */
    public generateTeacherThankYouNoteApiAineeWebThankYouNoteToTeacherPost(
        requestBody: TeacherThankYouNoteRequest,
    ): CancelablePromise<CommonResponse_TeacherThankYouNoteResponse_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/ainee_web/thank-you-note-to-teacher',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Educational Flashcards
     * Generate a set of educational flashcards from provided content with customizable parameters
     * @param formData
     * @returns CommonResponse_FlashcardGenerationResult_ Successful Response
     * @throws ApiError
     */
    public generateFlashcardsApiAineeWebFlashcardsGeneratePost(
        formData: Body_generate_flashcards_api_ainee_web_flashcards_generate_post,
    ): CancelablePromise<CommonResponse_FlashcardGenerationResult_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/ainee_web/flashcards/generate',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Cornell Notes from Document
     * Upload a document to generate Cornell-style notes. Configure note density and page division settings. Accepted file types: PDF, PowerPoint, Word, Excel, Markdown, TXT, HTML. Maximum file size: 50MB
     * @param formData
     * @returns CommonResponse_Union_CornellNotesResult__NoneType__ Successful Response
     * @throws ApiError
     */
    public uploadFileWithParamsApiAineeWebCornellNotesGeneratePost(
        formData: Body_upload_file_with_params_api_ainee_web_cornell_notes_generate_post,
    ): CancelablePromise<CommonResponse_Union_CornellNotesResult__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/ainee_web/cornell-notes/generate',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
