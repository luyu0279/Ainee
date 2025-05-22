/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentStats } from './ContentStats';
export type UserInfoResponse = {
    /**
     * 用户UID
     */
    uid: string;
    /**
     * 用户邮箱
     */
    email?: (string | null);
    /**
     * 用户姓名
     */
    name?: (string | null);
    /**
     * 用户头像
     */
    picture?: (string | null);
    /**
     * 登录提供商
     */
    provider?: (string | null);
    content_stats?: ContentStats;
};

