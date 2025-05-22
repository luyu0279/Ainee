--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2 (Debian 17.2-1.pgdg120+1)
-- Dumped by pg_dump version 17.2 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: chat_start_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chat_start_type AS ENUM (
    'INBOX',
    'MY_KNOWLEDGE_BASES',
    'SINGLE_KNOWLEDGE_BASE',
    'ARTICLE'
);


ALTER TYPE public.chat_start_type OWNER TO postgres;

--
-- Name: content_media_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.content_media_type AS ENUM (
    'article',
    'video',
    'file',
    'pdf',
    'text_file',
    'audio',
    'word',
    'excel',
    'text',
    'ppt',
    'recording_audio',
    'audio_internal',
    'audio_microphone',
    'spotify_audio',
    'twitter',
    'image'
);


ALTER TYPE public.content_media_type OWNER TO postgres;

--
-- Name: knowledge_base_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.knowledge_base_visibility AS ENUM (
    'public',
    'private',
    'restricted',
    'default'
);


ALTER TYPE public.knowledge_base_visibility OWNER TO postgres;

--
-- Name: processing_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.processing_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'waiting_init'
);


ALTER TYPE public.processing_status OWNER TO postgres;

--
-- Name: processingstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.processingstatus AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'waiting_init',
    'WAITING_INIT'
);


ALTER TYPE public.processingstatus OWNER TO postgres;

--
-- Name: rag_processing_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rag_processing_status AS ENUM (
    'waiting_init',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE public.rag_processing_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: annotation_relations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.annotation_relations (
    annotation_id integer NOT NULL,
    parent_id integer,
    root_id integer,
    depth integer NOT NULL,
    path integer[] NOT NULL,
    CONSTRAINT annotation_relations_depth_check CHECK ((depth >= 1))
);


ALTER TABLE public.annotation_relations OWNER TO postgres;

--
-- Name: annotations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.annotations (
    id integer NOT NULL,
    uid character varying(50) NOT NULL,
    target_content_id integer,
    target_annotation_id integer,
    user_id integer NOT NULL,
    content jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    CONSTRAINT annotations_content_check CHECK (((content @? '$'::jsonpath) AND (content @? '$."type"'::jsonpath) AND (content @? '$."body"'::jsonpath) AND (content @? '$."target"'::jsonpath)))
);


ALTER TABLE public.annotations OWNER TO postgres;

--
-- Name: annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.annotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.annotations_id_seq OWNER TO postgres;

--
-- Name: annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.annotations_id_seq OWNED BY public.annotations.id;


--
-- Name: chat_assistants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_assistants (
    id integer NOT NULL,
    kb_id integer,
    content_id integer,
    name character varying(255) NOT NULL,
    user_id integer NOT NULL,
    chat_start_type public.chat_start_type DEFAULT 'INBOX'::public.chat_start_type NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false
);


ALTER TABLE public.chat_assistants OWNER TO postgres;

--
-- Name: TABLE chat_assistants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.chat_assistants IS '聊天助手表，定义不同类型的聊天助手';


--
-- Name: COLUMN chat_assistants.chat_start_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_assistants.chat_start_type IS '聊天助手类型：inbox（收件箱）, my_knowledge_bases（我的知识库）, single_knowledge_base（单个知识库）, article（文章）';


--
-- Name: chat_assistants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_assistants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_assistants_id_seq OWNER TO postgres;

--
-- Name: chat_assistants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_assistants_id_seq OWNED BY public.chat_assistants.id;


--
-- Name: content_knowledge_base_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_knowledge_base_mappings (
    id integer NOT NULL,
    content_id integer NOT NULL,
    knowledge_base_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by integer
);


ALTER TABLE public.content_knowledge_base_mappings OWNER TO postgres;

--
-- Name: TABLE content_knowledge_base_mappings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.content_knowledge_base_mappings IS '内容与知识库的关联表';


--
-- Name: COLUMN content_knowledge_base_mappings.is_deleted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.content_knowledge_base_mappings.is_deleted IS '是否已删除';


--
-- Name: COLUMN content_knowledge_base_mappings.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.content_knowledge_base_mappings.deleted_at IS '删除时间';


--
-- Name: COLUMN content_knowledge_base_mappings.deleted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.content_knowledge_base_mappings.deleted_by IS '删除操作执行人ID';


--
-- Name: content_knowledge_base_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.content_knowledge_base_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.content_knowledge_base_mappings_id_seq OWNER TO postgres;

--
-- Name: content_knowledge_base_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.content_knowledge_base_mappings_id_seq OWNED BY public.content_knowledge_base_mappings.id;


--
-- Name: contents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contents (
    id integer NOT NULL,
    uid character varying(50) NOT NULL,
    user_id integer NOT NULL,
    title character varying(255),
    content_hash character varying(64),
    site_name character varying(100),
    author character varying(100),
    lang character varying(10),
    published_time timestamp without time zone,
    source character varying(2048),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    content text,
    cover character varying(2048),
    images jsonb,
    processing_status public.processingstatus DEFAULT 'PENDING'::public.processingstatus NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    share_count integer DEFAULT 0 NOT NULL,
    ai_summary text,
    ai_recommend_reason text,
    ai_mermaid text,
    text_content text,
    ai_tags json,
    media_type public.content_media_type DEFAULT 'article'::public.content_media_type NOT NULL,
    video_duration integer,
    video_subtitles jsonb,
    video_embed_url text,
    video_description text,
    file_name_in_storage character varying(255),
    file_type character varying(1024),
    ai_structure text,
    audio_subtitles jsonb,
    media_seconds_duration integer,
    media_subtitles jsonb,
    batch_id character varying(50),
    dataset_id character varying(50),
    dataset_doc_id character varying(50),
    rag_status public.rag_processing_status DEFAULT 'waiting_init'::public.rag_processing_status,
    image_ocr text,
    raw_description text
);


ALTER TABLE public.contents OWNER TO postgres;

--
-- Name: COLUMN contents.media_seconds_duration; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contents.media_seconds_duration IS '媒体文件的总时长（秒），适用于音频和视频';


--
-- Name: COLUMN contents.media_subtitles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contents.media_subtitles IS '媒体文件的字幕信息，适用于音频和视频';


--
-- Name: COLUMN contents.batch_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contents.batch_id IS '用于标识批量任务的唯一ID';


--
-- Name: COLUMN contents.rag_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contents.rag_status IS '内容 RAG 处理状态';


--
-- Name: COLUMN contents.image_ocr; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contents.image_ocr IS '图片OCR提取的文本内容';


--
-- Name: COLUMN contents.raw_description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contents.raw_description IS '来自 spotify 获取 youtube 页面的原始描述信息';


--
-- Name: contents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contents_id_seq OWNER TO postgres;

--
-- Name: contents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contents_id_seq OWNED BY public.contents.id;


--
-- Name: knowledge_base_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_base_access (
    id integer NOT NULL,
    knowledge_base_id integer NOT NULL,
    user_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    revoked_at timestamp without time zone,
    revoked_by integer
);


ALTER TABLE public.knowledge_base_access OWNER TO postgres;

--
-- Name: TABLE knowledge_base_access; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.knowledge_base_access IS '知识库访问权限表，仅用于 RESTRICTED 可见性';


--
-- Name: COLUMN knowledge_base_access.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.knowledge_base_access.is_active IS '权限是否有效';


--
-- Name: COLUMN knowledge_base_access.revoked_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.knowledge_base_access.revoked_at IS '权限被收回的时间';


--
-- Name: COLUMN knowledge_base_access.revoked_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.knowledge_base_access.revoked_by IS '权限被谁收回';


--
-- Name: knowledge_base_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knowledge_base_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_base_access_id_seq OWNER TO postgres;

--
-- Name: knowledge_base_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knowledge_base_access_id_seq OWNED BY public.knowledge_base_access.id;


--
-- Name: knowledge_base_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_base_subscriptions (
    id integer NOT NULL,
    knowledge_base_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by integer
);


ALTER TABLE public.knowledge_base_subscriptions OWNER TO postgres;

--
-- Name: TABLE knowledge_base_subscriptions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.knowledge_base_subscriptions IS '知识库订阅表，用于记录用户订阅的知识库';


--
-- Name: COLUMN knowledge_base_subscriptions.is_deleted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.knowledge_base_subscriptions.is_deleted IS '是否已取消订阅';


--
-- Name: COLUMN knowledge_base_subscriptions.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.knowledge_base_subscriptions.deleted_at IS '取消订阅的时间';


--
-- Name: COLUMN knowledge_base_subscriptions.deleted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.knowledge_base_subscriptions.deleted_by IS '取消订阅的用户ID';


--
-- Name: knowledge_base_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knowledge_base_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_base_subscriptions_id_seq OWNER TO postgres;

--
-- Name: knowledge_base_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knowledge_base_subscriptions_id_seq OWNED BY public.knowledge_base_subscriptions.id;


--
-- Name: knowledge_bases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_bases (
    id integer NOT NULL,
    uid character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    user_id integer NOT NULL,
    visibility public.knowledge_base_visibility DEFAULT 'private'::public.knowledge_base_visibility NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false
);


ALTER TABLE public.knowledge_bases OWNER TO postgres;

--
-- Name: TABLE knowledge_bases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.knowledge_bases IS '知识库表';


--
-- Name: COLUMN knowledge_bases.visibility; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.knowledge_bases.visibility IS '知识库可见性：public(公开), private(仅创建者), restricted(部分可见)';


--
-- Name: knowledge_bases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knowledge_bases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_bases_id_seq OWNER TO postgres;

--
-- Name: knowledge_bases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knowledge_bases_id_seq OWNED BY public.knowledge_bases.id;


--
-- Name: mentions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentions (
    id integer NOT NULL,
    annotation_id integer NOT NULL,
    user_id integer NOT NULL,
    start_pos integer NOT NULL,
    end_pos integer NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    CONSTRAINT mentions_check CHECK ((end_pos > start_pos)),
    CONSTRAINT mentions_start_pos_check CHECK ((start_pos >= 0))
);


ALTER TABLE public.mentions OWNER TO postgres;

--
-- Name: mentions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentions_id_seq OWNER TO postgres;

--
-- Name: mentions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentions_id_seq OWNED BY public.mentions.id;


--
-- Name: session_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_records (
    id integer NOT NULL,
    user_id integer NOT NULL,
    chat_start_type public.chat_start_type DEFAULT 'INBOX'::public.chat_start_type NOT NULL,
    content_id integer,
    kb_id integer,
    session_id character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    agent_id character varying(50),
    use_web_search boolean DEFAULT false
);


ALTER TABLE public.session_records OWNER TO postgres;

--
-- Name: TABLE session_records; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.session_records IS '会话记录表，用于记录用户的会话信息';


--
-- Name: COLUMN session_records.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.user_id IS '用户ID';


--
-- Name: COLUMN session_records.chat_start_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.chat_start_type IS '聊天开始类型：inbox（收件箱）, my_knowledge_bases（我的知识库）, single_knowledge_base（单个知识库）, article（文章）';


--
-- Name: COLUMN session_records.content_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.content_id IS '关联的内容ID，可为空';


--
-- Name: COLUMN session_records.kb_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.kb_id IS '关联的知识库ID，可为空';


--
-- Name: COLUMN session_records.session_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.session_id IS '会话唯一标识符';


--
-- Name: COLUMN session_records.is_deleted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.is_deleted IS '是否已删除';


--
-- Name: COLUMN session_records.agent_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.agent_id IS '关联的智能助手ID，可为空';


--
-- Name: COLUMN session_records.use_web_search; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.session_records.use_web_search IS '是否使用 Web 搜索，布尔值';


--
-- Name: session_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.session_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_records_id_seq OWNER TO postgres;

--
-- Name: session_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.session_records_id_seq OWNED BY public.session_records.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    uid character varying(50) NOT NULL,
    name character varying(255),
    provider character varying(50) NOT NULL,
    provider_user_id character varying(255) NOT NULL,
    email character varying(255),
    phone_number character varying(50),
    picture character varying(255),
    email_verified boolean,
    firebase_aud character varying(255),
    deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_chat_enabled boolean DEFAULT true NOT NULL,
    self_set_country character varying(255),
    self_set_region character varying(255),
    fcm_registration_token character varying(255),
    platform character varying(50),
    app_version character varying(50),
    last_active timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.fcm_registration_token; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.fcm_registration_token IS 'FCM 注册令牌，用于推送通知';


--
-- Name: COLUMN users.platform; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.platform IS '用户平台，如 iOS, Android, Web 等';


--
-- Name: COLUMN users.app_version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.app_version IS 'App 版本号';


--
-- Name: COLUMN users.last_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.last_active IS '用户最后活跃时间';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: annotations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annotations ALTER COLUMN id SET DEFAULT nextval('public.annotations_id_seq'::regclass);


--
-- Name: chat_assistants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_assistants ALTER COLUMN id SET DEFAULT nextval('public.chat_assistants_id_seq'::regclass);


--
-- Name: content_knowledge_base_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_knowledge_base_mappings ALTER COLUMN id SET DEFAULT nextval('public.content_knowledge_base_mappings_id_seq'::regclass);


--
-- Name: contents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contents ALTER COLUMN id SET DEFAULT nextval('public.contents_id_seq'::regclass);


--
-- Name: knowledge_base_access id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_access ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_access_id_seq'::regclass);


--
-- Name: knowledge_base_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_subscriptions_id_seq'::regclass);


--
-- Name: knowledge_bases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_bases ALTER COLUMN id SET DEFAULT nextval('public.knowledge_bases_id_seq'::regclass);


--
-- Name: mentions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentions ALTER COLUMN id SET DEFAULT nextval('public.mentions_id_seq'::regclass);


--
-- Name: session_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_records ALTER COLUMN id SET DEFAULT nextval('public.session_records_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: annotation_relations annotation_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annotation_relations
    ADD CONSTRAINT annotation_relations_pkey PRIMARY KEY (annotation_id);


--
-- Name: annotations annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annotations
    ADD CONSTRAINT annotations_pkey PRIMARY KEY (id);


--
-- Name: annotations annotations_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annotations
    ADD CONSTRAINT annotations_uid_key UNIQUE (uid);


--
-- Name: chat_assistants chat_assistants_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_assistants
    ADD CONSTRAINT chat_assistants_name_key UNIQUE (name);


--
-- Name: chat_assistants chat_assistants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_assistants
    ADD CONSTRAINT chat_assistants_pkey PRIMARY KEY (id);


--
-- Name: content_knowledge_base_mappings content_knowledge_base_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_knowledge_base_mappings
    ADD CONSTRAINT content_knowledge_base_mappings_pkey PRIMARY KEY (id);


--
-- Name: contents contents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_pkey PRIMARY KEY (id);


--
-- Name: contents contents_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_uid_key UNIQUE (uid);


--
-- Name: knowledge_base_access knowledge_base_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_access
    ADD CONSTRAINT knowledge_base_access_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_subscriptions knowledge_base_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_subscriptions
    ADD CONSTRAINT knowledge_base_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: knowledge_bases knowledge_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_bases
    ADD CONSTRAINT knowledge_bases_pkey PRIMARY KEY (id);


--
-- Name: knowledge_bases knowledge_bases_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_bases
    ADD CONSTRAINT knowledge_bases_uid_key UNIQUE (uid);


--
-- Name: mentions mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_pkey PRIMARY KEY (id);


--
-- Name: session_records session_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_records
    ADD CONSTRAINT session_records_pkey PRIMARY KEY (id);


--
-- Name: session_records session_records_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_records
    ADD CONSTRAINT session_records_session_id_key UNIQUE (session_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_annotations_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_annotations_user ON public.annotations USING btree (user_id);


--
-- Name: idx_annotations_w3c_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_annotations_w3c_data ON public.annotations USING gin (content jsonb_path_ops);


--
-- Name: idx_content_kb_mapping_content; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_kb_mapping_content ON public.content_knowledge_base_mappings USING btree (content_id);


--
-- Name: idx_content_kb_mapping_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_kb_mapping_created_by ON public.content_knowledge_base_mappings USING btree (created_by);


--
-- Name: idx_content_kb_mapping_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_kb_mapping_is_deleted ON public.content_knowledge_base_mappings USING btree (is_deleted);


--
-- Name: idx_content_kb_mapping_kb; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_kb_mapping_kb ON public.content_knowledge_base_mappings USING btree (knowledge_base_id);


--
-- Name: idx_contents_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contents_batch_id ON public.contents USING btree (batch_id);


--
-- Name: idx_contents_batch_id_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contents_batch_id_status ON public.contents USING btree (batch_id, processing_status);


--
-- Name: idx_contents_dataset_combined; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contents_dataset_combined ON public.contents USING btree (dataset_id, dataset_doc_id);


--
-- Name: idx_contents_dataset_doc_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contents_dataset_doc_id ON public.contents USING btree (dataset_doc_id);


--
-- Name: idx_contents_dataset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contents_dataset_id ON public.contents USING btree (dataset_id);


--
-- Name: idx_contents_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contents_user ON public.contents USING btree (user_id);


--
-- Name: idx_kb_subscription_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_subscription_is_deleted ON public.knowledge_base_subscriptions USING btree (is_deleted);


--
-- Name: idx_kb_subscription_kb_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_subscription_kb_id ON public.knowledge_base_subscriptions USING btree (knowledge_base_id);


--
-- Name: idx_kb_subscription_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_subscription_user_id ON public.knowledge_base_subscriptions USING btree (user_id);


--
-- Name: idx_knowledge_base_access_kb_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_base_access_kb_id ON public.knowledge_base_access USING btree (knowledge_base_id);


--
-- Name: idx_knowledge_base_access_kb_id_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_base_access_kb_id_user ON public.knowledge_base_access USING btree (knowledge_base_id, user_id, is_active);


--
-- Name: idx_knowledge_base_access_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_base_access_user_id ON public.knowledge_base_access USING btree (user_id);


--
-- Name: idx_knowledge_bases_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_bases_is_deleted ON public.knowledge_bases USING btree (is_deleted);


--
-- Name: idx_knowledge_bases_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_bases_user_id ON public.knowledge_bases USING btree (user_id);


--
-- Name: idx_knowledge_bases_visibility; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_bases_visibility ON public.knowledge_bases USING btree (visibility);


--
-- Name: idx_relations_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_relations_path ON public.annotation_relations USING gin (path);


--
-- Name: idx_unique_content_kb_mapping; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_content_kb_mapping ON public.content_knowledge_base_mappings USING btree (content_id, knowledge_base_id) WHERE ((content_id IS NOT NULL) AND (knowledge_base_id IS NOT NULL));


--
-- Name: idx_unique_kb_subscription; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_kb_subscription ON public.knowledge_base_subscriptions USING btree (knowledge_base_id, user_id) WHERE ((knowledge_base_id IS NOT NULL) AND (user_id IS NOT NULL));


--
-- Name: idx_users_uid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_uid ON public.users USING btree (uid);


--
-- Name: ix_chat_assistants_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_chat_assistants_is_deleted ON public.chat_assistants USING btree (is_deleted);


--
-- Name: ix_chat_assistants_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_chat_assistants_name ON public.chat_assistants USING btree (name);


--
-- Name: ix_chat_assistants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_chat_assistants_user_id ON public.chat_assistants USING btree (user_id);


--
-- Name: ix_chat_assistants_user_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_chat_assistants_user_id_created_at ON public.chat_assistants USING btree (user_id, created_at);


--
-- Name: ix_session_records_agent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_session_records_agent_id ON public.session_records USING btree (agent_id);


--
-- Name: ix_session_records_chat_start_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_session_records_chat_start_type ON public.session_records USING btree (chat_start_type);


--
-- Name: ix_session_records_content_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_session_records_content_id ON public.session_records USING btree (content_id);


--
-- Name: ix_session_records_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_session_records_created_at ON public.session_records USING btree (created_at);


--
-- Name: ix_session_records_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_session_records_is_deleted ON public.session_records USING btree (is_deleted);


--
-- Name: ix_session_records_kb_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_session_records_kb_id ON public.session_records USING btree (kb_id);


--
-- Name: ix_session_records_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_session_records_user_id ON public.session_records USING btree (user_id);


--
-- Name: ix_users_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_created_at ON public.users USING btree (created_at);


--
-- Name: ix_users_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_deleted ON public.users USING btree (deleted);


--
-- Name: ix_users_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_provider ON public.users USING btree (provider);


--
-- Name: ix_users_provider_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_provider_user_id ON public.users USING btree (provider_user_id);


--
-- Name: ix_users_self_set_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_self_set_country ON public.users USING btree (self_set_country);


--
-- Name: ix_users_self_set_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_self_set_region ON public.users USING btree (self_set_region);


--
-- Name: ix_users_uid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_uid ON public.users USING btree (uid);


--
-- Name: uq_session_records_inbox_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_session_records_inbox_user_id ON public.session_records USING btree (user_id) WHERE ((chat_start_type = 'INBOX'::public.chat_start_type) AND (is_deleted = false));


--
-- Name: uq_session_records_my_kb_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_session_records_my_kb_user_id ON public.session_records USING btree (user_id) WHERE ((chat_start_type = 'MY_KNOWLEDGE_BASES'::public.chat_start_type) AND (is_deleted = false));


--
-- PostgreSQL database dump complete
--

