## feature/session_records_agent_id
ALTER TABLE session_records ADD COLUMN use_web_search BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN session_records.use_web_search IS '是否使用 Web 搜索，布尔值';


-- 添加 agent_id 字段
ALTER TABLE session_records ADD COLUMN agent_id VARCHAR(50);

-- 创建索引以优化查询性能
CREATE INDEX ix_session_records_agent_id ON session_records(agent_id);

-- 添加字段注释
COMMENT ON COLUMN session_records.agent_id IS '关联的智能助手ID，可为空';


## feature/session_records

-- 创建 session_records 表
CREATE TABLE session_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    chat_start_type chat_start_type NOT NULL DEFAULT 'INBOX',
    content_id INTEGER,
    kb_id INTEGER,
    session_id VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 创建索引以优化查询性能
CREATE INDEX ix_session_records_user_id ON session_records(user_id);
CREATE INDEX ix_session_records_chat_start_type ON session_records(chat_start_type);
CREATE INDEX ix_session_records_content_id ON session_records(content_id);
CREATE INDEX ix_session_records_kb_id ON session_records(kb_id);
CREATE INDEX ix_session_records_is_deleted ON session_records(is_deleted);
CREATE INDEX ix_session_records_created_at ON session_records(created_at);

-- 添加表注释
COMMENT ON TABLE session_records IS '会话记录表，用于记录用户的会话信息';

-- 添加字段注释
COMMENT ON COLUMN session_records.user_id IS '用户ID';
COMMENT ON COLUMN session_records.chat_start_type IS '聊天开始类型：inbox（收件箱）, my_knowledge_bases（我的知识库）, single_knowledge_base（单个知识库）, article（文章）';
COMMENT ON COLUMN session_records.content_id IS '关联的内容ID，可为空';
COMMENT ON COLUMN session_records.kb_id IS '关联的知识库ID，可为空';
COMMENT ON COLUMN session_records.session_id IS '会话唯一标识符';
COMMENT ON COLUMN session_records.is_deleted IS '是否已删除';

-- 为 INBOX 类型的会话与用户 ID 创建唯一索引
CREATE UNIQUE INDEX uq_session_records_inbox_user_id 
ON session_records(user_id) 
WHERE chat_start_type = 'inbox' AND is_deleted = FALSE;

-- 为 MY_KNOWLEDGE_BASES 类型的会话与用户 ID 创建唯一索引
CREATE UNIQUE INDEX uq_session_records_my_kb_user_id 
ON session_records(user_id) 
WHERE chat_start_type = 'my_knowledge_bases' AND is_deleted = FALSE;

## feature/image_type
-- 添加 image 媒体类型
ALTER TYPE content_media_type ADD VALUE 'image';

-- 添加图片相关字段
ALTER TABLE contents ADD COLUMN image_ocr TEXT;
COMMENT ON COLUMN contents.image_ocr IS '图片OCR提取的文本内容';

-- 添加图片相关字段
ALTER TABLE contents ADD COLUMN raw_description TEXT;
COMMENT ON COLUMN contents.raw_description IS '来自 spotify 获取 youtube 页面的原始描述信息';

-- 迁移 video_description
update contents set raw_description = video_description where video_description is not null;

-- 删除 video_description 字段
ALTER TABLE contents DROP COLUMN video_description;

## feature/0.6

-- 添加 dataset 相关字段
ALTER TABLE contents ADD COLUMN dataset_id VARCHAR(50);
ALTER TABLE contents ADD COLUMN dataset_doc_id VARCHAR(50);

-- 添加字段注释
COMMENT ON COLUMN contents.dataset_id IS '用于标识数据集的唯一ID';
COMMENT ON COLUMN contents.dataset_doc_id IS '用于标识在数据集中唯一 DOC ID';

-- 创建索引以优化查询性能
CREATE INDEX idx_contents_dataset_id ON contents(dataset_id);
CREATE INDEX idx_contents_dataset_doc_id ON contents(dataset_doc_id);
CREATE INDEX idx_contents_dataset_combined ON contents(dataset_id, dataset_doc_id);



-- 1. 创建聊天助手类型枚举
CREATE TYPE chat_start_type AS ENUM ('INBOX', 'MY_KNOWLEDGE_BASES', 'SINGLE_KNOWLEDGE_BASE', 'ARTICLE');

-- 2. 创建聊天助手表
CREATE TABLE chat_assistants (
    id SERIAL PRIMARY KEY,
    kb_id INTEGER,
    content_id INTEGER,
    name VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    chat_start_type chat_start_type NOT NULL DEFAULT 'INBOX',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);


-- 4. 为聊天助手表创建索引
CREATE INDEX ix_chat_assistants_user_id ON chat_assistants(user_id);
CREATE INDEX ix_chat_assistants_user_id_created_at ON chat_assistants(user_id, created_at);
CREATE INDEX ix_chat_assistants_is_deleted ON chat_assistants(is_deleted);
CREATE INDEX ix_chat_assistants_name ON chat_assistants(name);

-- 6. 添加表注释
COMMENT ON TABLE chat_assistants IS '聊天助手表，定义不同类型的聊天助手';

-- 7. 添加字段注释
COMMENT ON COLUMN chat_assistants.chat_start_type IS '聊天助手类型：inbox（收件箱）, my_knowledge_bases（我的知识库）, single_knowledge_base（单个知识库）, article（文章）';


## feature/rag_status

-- 创建 RAG 处理状态枚举类型
CREATE TYPE rag_processing_status AS ENUM ('waiting_init', 'processing', 'completed', 'failed');

-- 向 contents 表添加 rag_status 字段
ALTER TABLE contents ADD COLUMN rag_status rag_processing_status DEFAULT 'waiting_init';

-- 添加字段注释
COMMENT ON COLUMN contents.rag_status IS '内容 RAG 处理状态';


## feature/spotify
-- 添加 spotify_audio 媒体类型
ALTER TYPE content_media_type ADD VALUE 'spotify_audio';
ALTER TYPE content_media_type ADD VALUE 'twitter';


## feature/0.5
-- 1. 创建知识库可见性枚举类型
CREATE TYPE knowledge_base_visibility AS ENUM ('public', 'private', 'restricted');

-- 添加 default 枚举值
ALTER TYPE knowledge_base_visibility ADD VALUE 'default';

-- 2. 创建知识库表
CREATE TABLE knowledge_bases (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    visibility knowledge_base_visibility NOT NULL DEFAULT 'private',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 3. 创建知识库访问权限表
CREATE TABLE knowledge_base_access (
    id SERIAL PRIMARY KEY,
    knowledge_base_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    revoked_at TIMESTAMP,
    revoked_by INTEGER
);

-- 4. 创建内容知识库映射表
CREATE TABLE content_knowledge_base_mappings (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL,
    knowledge_base_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INTEGER
);

-- 5. 创建必要的索引
CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id);
CREATE INDEX idx_knowledge_bases_visibility ON knowledge_bases(visibility);
CREATE INDEX idx_knowledge_bases_is_deleted ON knowledge_bases(is_deleted);

CREATE INDEX idx_knowledge_base_access_kb_id ON knowledge_base_access(knowledge_base_id);
CREATE INDEX idx_knowledge_base_access_user_id ON knowledge_base_access(user_id);
CREATE INDEX idx_knowledge_base_access_kb_id_user ON knowledge_base_access(knowledge_base_id, user_id, is_active);

CREATE INDEX idx_content_kb_mapping_content ON content_knowledge_base_mappings(content_id);
CREATE INDEX idx_content_kb_mapping_kb ON content_knowledge_base_mappings(knowledge_base_id);
CREATE INDEX idx_content_kb_mapping_created_by ON content_knowledge_base_mappings(created_by);
CREATE INDEX idx_content_kb_mapping_is_deleted ON content_knowledge_base_mappings(is_deleted);

-- 6. 添加唯一约束，防止重复映射
CREATE UNIQUE INDEX idx_unique_content_kb_mapping 
ON content_knowledge_base_mappings(content_id, knowledge_base_id) 
WHERE content_id IS NOT NULL AND knowledge_base_id IS NOT NULL;

-- 7. 添加表注释
COMMENT ON TABLE knowledge_bases IS '知识库表';
COMMENT ON TABLE knowledge_base_access IS '知识库访问权限表，仅用于 RESTRICTED 可见性';
COMMENT ON TABLE content_knowledge_base_mappings IS '内容与知识库的关联表';

-- 8. 添加字段注释
COMMENT ON COLUMN knowledge_bases.visibility IS '知识库可见性：public(公开), private(仅创建者), restricted(部分可见)';
COMMENT ON COLUMN knowledge_base_access.is_active IS '权限是否有效';
COMMENT ON COLUMN knowledge_base_access.revoked_at IS '权限被收回的时间';
COMMENT ON COLUMN knowledge_base_access.revoked_by IS '权限被谁收回';
COMMENT ON COLUMN content_knowledge_base_mappings.is_deleted IS '是否已删除';
COMMENT ON COLUMN content_knowledge_base_mappings.deleted_at IS '删除时间';
COMMENT ON COLUMN content_knowledge_base_mappings.deleted_by IS '删除操作执行人ID';

-- 9. 创建知识库订阅表
CREATE TABLE knowledge_base_subscriptions (
    id SERIAL PRIMARY KEY,
    knowledge_base_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INTEGER
);

-- 10. 创建知识库订阅相关索引
CREATE INDEX idx_kb_subscription_kb_id ON knowledge_base_subscriptions(knowledge_base_id);
CREATE INDEX idx_kb_subscription_user_id ON knowledge_base_subscriptions(user_id);
CREATE INDEX idx_kb_subscription_is_deleted ON knowledge_base_subscriptions(is_deleted);

-- 11. 添加唯一约束，确保一个用户只能订阅同一个知识库一次
CREATE UNIQUE INDEX idx_unique_kb_subscription 
ON knowledge_base_subscriptions(knowledge_base_id, user_id) 
WHERE knowledge_base_id IS NOT NULL AND user_id IS NOT NULL;

-- 12. 添加表注释和字段注释
COMMENT ON TABLE knowledge_base_subscriptions IS '知识库订阅表，用于记录用户订阅的知识库';
COMMENT ON COLUMN knowledge_base_subscriptions.is_deleted IS '是否已取消订阅';
COMMENT ON COLUMN knowledge_base_subscriptions.deleted_at IS '取消订阅的时间';
COMMENT ON COLUMN knowledge_base_subscriptions.deleted_by IS '取消订阅的用户ID';


## feature/0.4
ALTER TYPE content_media_type ADD VALUE 'audio_internal';
ALTER TYPE content_media_type ADD VALUE 'audio_microphone';

-- 添加 batch_id 字段
ALTER TABLE contents ADD COLUMN batch_id VARCHAR(50);
COMMENT ON COLUMN contents.batch_id IS '用于标识批量任务的唯一ID';

-- 为 batch_id 创建索引
CREATE INDEX idx_contents_batch_id ON contents(batch_id);

-- 为 batch_id 和 processing_status 创建复合索引（用于快速查询未完成的任务）
CREATE INDEX idx_contents_batch_id_status ON contents(batch_id, processing_status);

-- 在 users 表中添加 fcm_registration_token 字段
ALTER TABLE users ADD COLUMN fcm_registration_token VARCHAR(255);
COMMENT ON COLUMN users.fcm_registration_token IS 'FCM 注册令牌，用于推送通知';


## feature/0.3
ALTER TYPE content_media_type ADD VALUE 'audio';
ALTER TYPE content_media_type ADD VALUE 'word';
ALTER TYPE content_media_type ADD VALUE 'excel';
ALTER TYPE content_media_type ADD VALUE 'text';
ALTER TYPE content_media_type ADD VALUE 'ppt';

-- 添加媒体文件时长字段
ALTER TABLE contents ADD COLUMN media_seconds_duration INTEGER;
COMMENT ON COLUMN contents.media_seconds_duration IS '媒体文件的总时长（秒），适用于音频和视频';


-- 迁移 subtitles 字段
ALTER TABLE contents ADD COLUMN media_subtitles JSONB;
COMMENT ON COLUMN contents.media_subtitles IS '媒体文件的字幕信息，适用于音频和视频';

-- 迁移数据
UPDATE contents SET media_subtitles = video_subtitles WHERE media_type = 'video';


## feature/0.2
-- 1. 添加文件相关字段
ALTER TABLE contents ADD COLUMN file_name VARCHAR(255);
ALTER TABLE contents ADD COLUMN file_name_in_storage VARCHAR(255);

-- 2. 更新 ContentMediaType 枚举类型
ALTER TYPE content_media_type ADD VALUE 'text_file';

-- 3. 更新 ProcessingStatus 枚举类型
ALTER TYPE processingstatus ADD VALUE 'WAITING_INIT';

-- 4. 添加 ai_structure 字段
ALTER TABLE contents ADD COLUMN ai_structure TEXT;

ALTER TABLE contents ADD COLUMN file_type VARCHAR(50);


## feature/0.1
-- 1. 创建枚举类型
CREATE TYPE content_media_type AS ENUM ('article', 'video');

-- 2. 添加新列，允许为空
ALTER TABLE contents ADD COLUMN media_type content_media_type;
ALTER TABLE contents ADD COLUMN video_duration INTEGER;
ALTER TABLE contents ADD COLUMN video_embed_url TEXT;

-- 3. 更新现有数据，设置默认值
UPDATE contents SET media_type = 'article';

-- 4. 将列设置为非空
ALTER TABLE contents ALTER COLUMN media_type SET NOT NULL;

-- 5. 设置默认值
ALTER TABLE contents ALTER COLUMN media_type SET DEFAULT 'article';

## feature/chat_assistants_update

-- 删除 uid 字段及其约束
ALTER TABLE chat_assistants DROP COLUMN uid;

-- 删除不再需要的索引
DROP INDEX IF EXISTS ix_chat_assistants_uid;
DROP INDEX IF EXISTS ix_chat_assistants_user_id_is_deleted;

-- 添加 kb_id 和 content_id 字段
ALTER TABLE chat_assistants ADD COLUMN kb_id INTEGER;
ALTER TABLE chat_assistants ADD COLUMN content_id INTEGER;

-- 添加字段注释
COMMENT ON COLUMN chat_assistants.kb_id IS '关联的知识库ID';
COMMENT ON COLUMN chat_assistants.content_id IS '关联的内容ID';
