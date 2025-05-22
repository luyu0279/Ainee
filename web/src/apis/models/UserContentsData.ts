/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentResponse } from './ContentResponse';
/**
 * 用户文章列表的返回数据结构
 */
export type UserContentsData = {
    contents: Array<ContentResponse>;
    /**
     * 下一页的游标
     */
    next_cursor?: (string | null);
};

