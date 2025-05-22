/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatStartType } from './ChatStartType';
export type Body_stream_agent_chat_api_chat_stream_agent_chat_post = {
    question: string;
    msg_id: string;
    chat_start_type: ChatStartType;
    uid?: (string | null);
    quote_text?: (string | null);
    use_web_search?: (boolean | null);
};

