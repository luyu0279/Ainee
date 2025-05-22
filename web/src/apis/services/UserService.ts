/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_avatar_api_user_upload_avatar_post } from '../models/Body_upload_avatar_api_user_upload_avatar_post';
import type { CommonResponse_bool_ } from '../models/CommonResponse_bool_';
import type { CommonResponse_str_ } from '../models/CommonResponse_str_';
import type { CommonResponse_Union_LoginResponse__NoneType__ } from '../models/CommonResponse_Union_LoginResponse__NoneType__';
import type { CommonResponse_UserInfoResponse_ } from '../models/CommonResponse_UserInfoResponse_';
import type { LoginRequest } from '../models/LoginRequest';
import type { UpdateFCMTokenRequest } from '../models/UpdateFCMTokenRequest';
import type { UserUpdateRequest } from '../models/UserUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * User login
     * [SUCCESS], [FAILED]
     * @param requestBody
     * @returns CommonResponse_Union_LoginResponse__NoneType__ Successful Response
     * @throws ApiError
     */
    public loginApiUserLoginPost(
        requestBody: LoginRequest,
    ): CancelablePromise<CommonResponse_Union_LoginResponse__NoneType__> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/user/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * User logout
     * Logout the current user and optionally clear FCM registration token
     * @returns CommonResponse_bool_ Successful Response
     * @throws ApiError
     */
    public logoutApiUserLogoutPost(): CancelablePromise<CommonResponse_bool_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/user/logout',
        });
    }
    /**
     * User info
     * [SUCCESS], [FAILED]
     * @returns CommonResponse_UserInfoResponse_ Successful Response
     * @throws ApiError
     */
    public getUserApiUserGetGet(): CancelablePromise<CommonResponse_UserInfoResponse_> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/user/get',
        });
    }
    /**
     * Just for test
     * [SUCCESS], [FAILED]
     * @returns CommonResponse_str_ Successful Response
     * @throws ApiError
     */
    public getXxxApiUserGetXxxGet(): CancelablePromise<CommonResponse_str_> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/user/get_xxx',
        });
    }
    /**
     * Update user profile
     * Update username and/or avatar (at least one field required)
     * @param requestBody
     * @returns CommonResponse_UserInfoResponse_ Successful Response
     * @throws ApiError
     */
    public updateUserProfileApiUserUpdatePost(
        requestBody: UserUpdateRequest,
    ): CancelablePromise<CommonResponse_UserInfoResponse_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/user/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload user avatar
     * Upload a new avatar image for the user
     * @param formData
     * @returns CommonResponse_str_ Successful Response
     * @throws ApiError
     */
    public uploadAvatarApiUserUploadAvatarPost(
        formData: Body_upload_avatar_api_user_upload_avatar_post,
    ): CancelablePromise<CommonResponse_str_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/user/upload_avatar',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update FCM registration token
     * Update the user's FCM registration token for push notifications
     * @param requestBody
     * @returns CommonResponse_bool_ Successful Response
     * @throws ApiError
     */
    public updateFcmTokenApiUserUpdateFcmTokenPost(
        requestBody: UpdateFCMTokenRequest,
    ): CancelablePromise<CommonResponse_bool_> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/user/update_fcm_token',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
