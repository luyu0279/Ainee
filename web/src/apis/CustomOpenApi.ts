/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { AxiosHttpRequest } from './core/AxiosHttpRequest';
import { AineeWebService } from './services/AineeWebService';
import { AnnotationService } from './services/AnnotationService';
import { ChatService } from './services/ChatService';
import { ContentService } from './services/ContentService';
import { KnowledgeBaseService } from './services/KnowledgeBaseService';
import { UserService } from './services/UserService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class CustomOpenApi {
    public readonly aineeWeb: AineeWebService;
    public readonly annotation: AnnotationService;
    public readonly chat: ChatService;
    public readonly content: ContentService;
    public readonly knowledgeBase: KnowledgeBaseService;
    public readonly user: UserService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = AxiosHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? 'http://10.255.10.182:8000',
            VERSION: config?.VERSION ?? '0.1.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.aineeWeb = new AineeWebService(this.request);
        this.annotation = new AnnotationService(this.request);
        this.chat = new ChatService(this.request);
        this.content = new ContentService(this.request);
        this.knowledgeBase = new KnowledgeBaseService(this.request);
        this.user = new UserService(this.request);
    }
}

