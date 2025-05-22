import React, { useEffect, useState, useRef } from 'react';
import { KnowledgeBaseService } from '@/apis/services/KnowledgeBaseService';
import { CustomOpenApi } from '@/apis/CustomOpenApi';
import type { KnowledgeBaseResponse } from '@/apis/models/KnowledgeBaseResponse';
import type { CommonResponse_UserInfoResponse_ } from '@/apis/models/CommonResponse_UserInfoResponse_';
import { ChevronLeft, Share2, Edit, ExternalLink, Plus, LayoutList, Book, MessageSquare, FileText, Check, MoreVertical, Trash2, Eye, Bot, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import ApiLibs from '@/lib/ApiLibs';
import { useKnowledgeBaseManager } from '../hooks/useKnowledgeBaseManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import AddFileModal from './AddFileModal';
import Image from 'next/image';
import { Tooltip } from 'antd';
import { DeleteOutlined, ShareAltOutlined } from '@ant-design/icons';
import { KnowledgeBaseAITools } from './KnowledgeBaseAITools';
import EditKnowledgeBaseModal from './EditKnowledgeBaseModal';

const knowledgeBaseService = new KnowledgeBaseService(new CustomOpenApi().request);

interface KnowledgeBaseDetailProps {
  kbId: string;
  onBack: () => void;
  onSubscriptionChange?: (kbId: string, isSubscribed: boolean) => void;
  initialSubscribed?: boolean;
  onKnowledgeBaseUpdate?: (updatedKb: { uid: string; name: string; description?: string; visibility?: string }) => void;
}

// 文件类型定义 (与 files/page.tsx 保持一致)
interface FileItem {
  id: string;
  uid: string;
  title: string;
  media_type: string;
  created_at: string;
}

// 文件类型icon
const getItemIcon = (mediaType?: string) => {
  switch (mediaType) {
    case 'video': return '/icon/icon_file_video.png';
    case 'pdf': return '/icon/icon_pdf_add.png';
    case 'audio': return '/icon/icon_item_voice.png';
    case 'word': return '/icon/icon_item_word.png';
    case 'audioInternal': return '/icon/icon_recording_audio.png';
    case 'audioMicrophone': return '/icon/icon_recording_mic.png';
    case 'image': return '/icon/icon_item_image.png';
    case 'ppt': return '/icon/icon_item_ppt.png';
    case 'text': return '/icon/icon_item_txt.png';
    case 'excel': return '/icon/icon_item_xls.png';
    default: return '/icon/icon_link.png';
  }
};

// 简单的骨架屏组件
const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`animate-pulse rounded-md bg-muted ${className || ''}`}
    {...props}
  />
);

// MoveOutIcon 支持自定义大小
const MoveOutIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.8327 17.5C16.3383 17.0085 18.3327 15.7002 18.3327 15C18.3327 14.2997 16.3383 12.9915 15.8327 12.5M17.4993 15H11.666" stroke="#231815" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.99935 17.5C6.07097 17.5 4.10679 17.5 2.88641 16.2796C1.66602 15.0592 1.66602 13.095 1.66602 9.16667V6.62023C1.66602 5.1065 1.66602 4.34963 1.98295 3.78172C2.20887 3.37689 2.54291 3.04285 2.94773 2.81693C3.51565 2.5 4.27252 2.5 5.78624 2.5C6.75603 2.5 7.24093 2.5 7.6654 2.65917C8.63452 3.0226 9.03418 3.90298 9.47152 4.77761L9.99935 5.83333M6.66602 5.83333H13.9577C15.7133 5.83333 16.591 5.83333 17.2216 6.25466C17.4946 6.43706 17.7289 6.67143 17.9113 6.94441C18.3157 7.54952 18.332 8.38233 18.3327 10V10.8333" stroke="#231815" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// 提取订阅按钮组件
const SubscriptionButton = React.memo(({ 
  isSubscribed, 
  isCreator,
  isSubscribing,
  onSubscribe,
}: { 
  isSubscribed: boolean;
  isCreator: boolean;
  isSubscribing: boolean;
  onSubscribe: () => void;
}) => {
  if (isCreator) return null;

  return (
    <Tooltip 
      title={
        <div>
          <div>{isSubscribed ? 'Unsubscribe' : 'Subscribe'}</div>
        </div>
      }
      placement="bottom"
      mouseEnterDelay={0.5}
    >
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={onSubscribe}
        disabled={isSubscribing}
      >
        {isSubscribed ? (
          <Check className="w-4 h-4" />
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Subscribe</span>
          </>
        )}
      </Button>
    </Tooltip>
  );
});

SubscriptionButton.displayName = 'SubscriptionButton';

// 提取订阅信息组件
const SubscriptionInfo = React.memo(({ 
  subscriberCount,
  contentCount,
  updatedAt,
  userName,
  userPicture,
}: { 
  subscriberCount: number;
  contentCount: number;
  updatedAt?: string;
  userName?: string;
  userPicture?: string;
}) => {
  const formattedUpdatedTime = updatedAt 
    ? format(new Date(updatedAt), 'yyyy-MM-dd HH:mm') + ' Updated'
    : '';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <img 
          src={userPicture || '/images/default-avatar.png'} 
          alt={userName || 'User'} 
          className="w-5 h-5 rounded-full object-cover"
        />
        <span>{userName || 'Unknown'}</span>
        <span>Create</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>{subscriberCount || 0} Joined</span>
        <span>·</span>
        <span>{contentCount || 0} Files</span>
        {formattedUpdatedTime && (
          <>
            <span>·</span>
            <span>{formattedUpdatedTime}</span>
          </>
        )}
      </div>
    </div>
  );
});

SubscriptionInfo.displayName = 'SubscriptionInfo';

export default function KnowledgeBaseDetail({ 
  kbId, 
  onBack, 
  onSubscriptionChange,
  initialSubscribed,
  onKnowledgeBaseUpdate
}: KnowledgeBaseDetailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseResponse | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState('files');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [aiTab, setAiTab] = useState('chat');
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showUnsubTooltip, setShowUnsubTooltip] = useState(false);
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [showAllCheckbox, setShowAllCheckbox] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string }>({ name: 'Sharer' });

  // 使用知识库管理 hook
  const { handleSubscriptionChange } = useKnowledgeBaseManager();

  // 获取当前用户信息
  useEffect(() => {
    ApiLibs.user.getUserApiUserGetGet()
      .then((res: CommonResponse_UserInfoResponse_) => {
        if (res.data?.name) {
          setCurrentUser({ name: res.data.name });
        }
      })
      .catch(console.error);
  }, []);

  // 监听容器宽度变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 获取知识库详情
  const fetchKnowledgeBaseDetail = async () => {
    try {
      setIsLoading(true);
      const response = await ApiLibs.knowledgeBase.getKnowledgeBaseDetailApiKbGetDetailGet(kbId);
      if (response.data) {
        // 使用传入的订阅状态覆盖API返回的状态
        const data = response.data;
        setKnowledgeBase({
          ...data,
          subscribed: initialSubscribed !== undefined ? initialSubscribed : data.subscribed
        });
      }
    } catch (error) {
      console.error('Failed to fetch knowledge base details:', error);
      toast.error('Failed to load knowledge base details');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化加载知识库详情
  useEffect(() => {
    fetchKnowledgeBaseDetail();
  }, [kbId, initialSubscribed]);

  // 获取知识库文件列表
  const fetchKbFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await ApiLibs.knowledgeBase.getKbContentsApiKbGetContentsGet(kbId);
      const data: FileItem[] = Array.isArray(res?.data)
        ? res.data.map((item: any) => ({
            id: item.uid,
            uid: item.uid,
            title: item.title || 'Untitled',
            media_type: item.media_type || 'link',
            created_at: item.created_at || '',
          }))
        : [];
      setFiles(data);
    } catch (e) {
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  // 页面加载和添加文件后都刷新文件列表
  useEffect(() => {
    fetchKbFiles();
  }, [kbId]);

  // 处理订阅/取消订阅
  const handleSubscriptionToggle = async () => {
    if (!knowledgeBase) return;
    
    try {
      setIsSubscribing(true);
      const newSubscriptionState = !knowledgeBase.subscribed;
      
      const success = await handleSubscriptionChange(knowledgeBase, newSubscriptionState);
      
      if (success) {
        // 更新本地状态
        setKnowledgeBase(prev => {
          if (!prev) return null;
          return {
            ...prev,
            subscribed: newSubscriptionState,
            subscriber_count: (prev.subscriber_count || 0) + (newSubscriptionState ? 1 : -1)
          };
        });
        
        // 通知父组件订阅状态变化
        onSubscriptionChange?.(kbId, newSubscriptionState);
        
        // 触发订阅变更事件，通知 Sidebar 更新
        window.dispatchEvent(new Event('subscription-change'));
        
        toast.success(
          newSubscriptionState 
            ? 'Successfully subscribed to knowledge base'
            : 'Successfully unsubscribed from knowledge base'
        );
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      toast.error('Failed to update subscription status');
    } finally {
      setIsSubscribing(false);
    }
  };

  // 监听订阅状态变化
  useEffect(() => {
    if (initialSubscribed !== undefined && knowledgeBase) {
      setKnowledgeBase(prev => {
        if (!prev) return null;
        return {
          ...prev,
          subscribed: initialSubscribed
        };
      });
    }
  }, [initialSubscribed]);

  // 获取分享链接
  const getShareLink = () => {
    return knowledgeBase?.share_page_url || `${window.location.origin}/dashboard/knowledge-base?id=${kbId}`;
  };

  // 处理分享功能
  const handleGetShareLink = async () => {
    // 如果是私有知识库，显示提示并返回
    if (knowledgeBase?.visibility === 'private') {
      toast.error('Private access. Change settings to share.');
      return;
    }

    const shareLink = getShareLink();
    const shareTitle = `Share Knowledge Base: ${knowledgeBase?.name || 'Knowledge Base'}`;
    // const shareText = `「${currentUser.name}」 shared a knowledge base from Ainee: ${knowledgeBase?.name || ''}`;
    
    try {
      if (navigator.share) {
        // 使用系统原生分享功能
        await navigator.share({
          title: shareTitle,
          // text: shareText,
          url: shareLink
        });
      } else {
        // 回退到复制链接
        await navigator.clipboard.writeText(shareLink);
        toast.success('Share link copied to clipboard');
      }
    } catch (error) {
      console.error('Share error:', error);
      // 如果分享失败，回退到复制链接
      try {
        await navigator.clipboard.writeText(shareLink);
        toast.success('Share link copied to clipboard');
      } catch {
        toast.error('Failed to copy link');
      }
    }
  };

  // 处理预览功能
  const handlePreview = () => {
    try {
      const shareLink = getShareLink();
      window.open(shareLink, '_blank');
      toast.success('Opening preview in new tab');
    } catch (error) {
      toast.error('Failed to open preview');
    }
  };

  // 处理知识库删除
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this knowledge base?')) return;
    
    try {
      await ApiLibs.knowledgeBase.deleteKnowledgeBaseApiKbDeletePost(kbId);
      toast.success('Knowledge base deleted successfully');
      // 调用回调函数刷新侧边栏
      onSubscriptionChange?.(kbId, false);
      // 返回上一页
      onBack();
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
      toast.error('Failed to delete knowledge base');
    }
  };

  const handleSelect = (id: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map(f => f.id)));
    }
  };

  const handleMoveOut = async (ids: string[]) => {
    setIsBatchLoading(true);
    try {
      await ApiLibs.knowledgeBase.removeContentFromKbApiKbRemoveContentPost({
        kb_uid: kbId,
        content_uids: ids,
      });
      fetchKbFiles();
      setSelectedFileIds(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
      toast.success(
        ids.length > 1
          ? `The ${ids.length} selected files were successfully moved out.`
          : 'The selected file was successfully moved out.'
      );
    } catch {
      toast.error('Failed to move out files.');
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleBatchShare = async () => {
    setIsBatchLoading(true);
    try {
      const links: string[] = [];
      for (const id of selectedFileIds) {
        const res = await ApiLibs.content.shareContentApiContentShareUidPost(id);
        if (res?.data) links.push(res.data);
      }
      const kbName = knowledgeBase?.name || '';
      const msg = `「${currentUser.name}」 shared ${links.length} files with you from Ainee-[${kbName}] :\n` +
        links.map((l, i) => `(${i + 1}) ${l}`).join('\n');
      
      if (navigator.share) {
        // 简单分享文本，添加标题
        await navigator.share({
          // title: 'Share from Ainee',
          text: msg
        });
      } else {
        await navigator.clipboard.writeText(msg);
        toast.success('Share text copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share files.');
    } finally {
      setIsBatchLoading(false);
    }
  };

  // 修改订阅信息组件的渲染
  const renderSubscriptionInfo = () => {
    if (knowledgeBase?.visibility === 'private') {
      return (
        <div className="flex items-center gap-1.5">
          <Lock className="w-4 h-4" />
          <span>Private</span>
        </div>
      );
    }

    return (
      <SubscriptionInfo
        subscriberCount={knowledgeBase?.subscriber_count || 0}
        contentCount={knowledgeBase?.content_count || 0}
        updatedAt={knowledgeBase?.updated_at}
        userName={knowledgeBase?.user_name || undefined}
        userPicture={knowledgeBase?.user_picture || undefined}
      />
    );
  };

  // 处理复制文本
  const handleCopyText = async (text: string, type: 'title' | 'description') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type === 'title' ? 'Title' : 'Description'} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast.error('Failed to copy text');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-48px)] overflow-auto">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <button className="p-2 hover:bg-accent/50 rounded-lg transition-colors cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Skeleton className="h-7 w-48" />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {/* 左侧文件列表骨架屏 */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-8 w-32 bg-accent/10 rounded animate-pulse" />
                <div className="h-8 w-32 bg-accent/10 rounded animate-pulse" />
              </div>
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-12 bg-accent/10 rounded-lg animate-pulse mb-2" />
              ))}
            </div>
            
            {/* 右侧AI功能区骨架屏 */}
            <div>
              <div className="h-8 w-32 bg-accent/10 rounded animate-pulse mb-4" />
              <div className="h-[calc(100vh-200px)] bg-accent/10 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!knowledgeBase) {
    return (
      <div className="h-[calc(100vh-48px)] p-6">
        <div className="text-muted-foreground">Failed to load knowledge base details</div>
      </div>
    );
  }

  // 判断是否是创建者
  const isCreator = knowledgeBase.owned === true;
  const isSubscribed = knowledgeBase.subscribed === true;

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col" ref={containerRef}>
      {/* 主要内容区 - 包含顶部区域和左右分栏 */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-x-auto">
          <div className="min-w-[600px] h-full flex flex-col">
            {/* 顶部区域 - 合并导航和基础信息，固定高度不参与滚动 */}
            <div className="flex-shrink-0 border-b border-border">
              <div className="px-6 pt-4">
                {/* 第一行：标题和操作按钮 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                    <Tooltip 
                      title={
                        <div>
                          <div>{knowledgeBase.name}</div>
                          <div className="text-xs text-gray-300 mt-1">Click to copy</div>
                        </div>
                      }
                      placement="bottom"
                      mouseEnterDelay={0.5}
                    >
                      <h1 
                        className="text-xl font-semibold truncate cursor-pointer hover:opacity-80"
                        onClick={() => handleCopyText(knowledgeBase.name, 'title')}
                      >
                        {knowledgeBase.name}
                      </h1>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCreator ? (
                      <>
                        {/* 根据容器宽度显示按钮 */}
                        <div className={`flex items-center gap-2 ${containerWidth < 600 ? 'hidden' : ''}`}>
                          <Tooltip title="Edit knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => setIsEditModalOpen(true)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </Tooltip>
                          <Tooltip title="Share knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={handleGetShareLink}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </Button>
                          </Tooltip>
                          <Tooltip title="Preview knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={handlePreview}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Preview
                            </Button>
                          </Tooltip>
                        </div>
                        {/* 根据容器宽度显示图标按钮 */}
                        <div className={`flex items-center gap-2 ${containerWidth >= 600 ? 'hidden' : ''}`}>
                          <Tooltip title="Edit knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => setIsEditModalOpen(true)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip title="Share knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={handleGetShareLink}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip title="Preview knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={handlePreview}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Tooltip>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm" className="cursor-pointer">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="shadow-lg ring-1 ring-gray-300 shadow-elevation-menu"
                          >
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
                              <Edit className="w-4 h-4" />
                              <span>Edit Knowledge Base</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={handleDelete}
                              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete Knowledge Base</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    ) : (
                      <>
                        <Tooltip title="Share knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer mr-2"
                            onClick={handleGetShareLink}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip title="Preview knowledge base" placement="bottom" mouseEnterDelay={0.5}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer mr-2"
                            onClick={handlePreview}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                        <SubscriptionButton
                          isSubscribed={knowledgeBase?.subscribed || false}
                          isCreator={isCreator}
                          isSubscribing={isSubscribing}
                          onSubscribe={handleSubscriptionToggle}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* 第二行：描述和统计信息 */}
                <div className="flex flex-col gap-3 pb-4">
                  <div className="max-w-[600px]">
                    <Tooltip 
                      title={
                        <div>
                          <div>{knowledgeBase.description || 'No description available'}</div>
                          <div className="text-xs text-gray-300 mt-1">Click to copy</div>
                        </div>
                      }
                      placement="bottom"
                      mouseEnterDelay={0.5}
                    >
                      <p 
                        className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:opacity-80"
                        onClick={() => handleCopyText(knowledgeBase.description || 'No description available', 'description')}
                      >
                        {knowledgeBase.description || 'No description available'}
                      </p>
                    </Tooltip>
                  </div>
                  
                  {renderSubscriptionInfo()}
                </div>
              </div>
            </div>

            {/* 左右分栏内容区域，设置为flex-1并添加overflow-hidden */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full grid grid-cols-3 gap-6 px-6 py-4">
                {/* 左侧文件列表 */}
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex justify-between items-center py-2 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Files</h2>
                    {isCreator && (
                      <Button 
                        size="sm" 
                        className="sm:px-2 h-7 text-xs px-2 cursor-pointer"
                        onClick={() => setIsAddFileModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Add File</span>
                      </Button>
                    )}
                  </div>
                  
                  {/* 文件列表容器，设置flex-1和overflow-auto */}
                  <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-y-auto">
                      {filesLoading ? (
                        <div className="space-y-2">
                          {Array(4).fill(0).map((_, i) => (
                            <div key={i} className="h-8 bg-accent/10 rounded animate-pulse mb-2" />
                          ))}
                        </div>
                      ) : files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <FileText className="w-12 h-12 mb-4" />
                          <p className='text-sm items-center justify-center'>{isCreator ? 'No files in this knowledge base yet' : "The author is crafting new content. We'll notify you as soon as it's updated."}</p>
                          {isCreator && (
                            <Button
                              variant="outline"
                              className="mt-4 cursor-pointer text-xs h-7 px-2"
                              onClick={() => setIsAddFileModalOpen(true)}
                            >
                              Add Files to Knowledge Base
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="pb-12">
                          {files.map((file) => {
                            const isSelected = selectedFileIds.has(file.id);
                            return (
                              <div
                                key={file.id}
                                className="flex items-center p-1.5 rounded-md hover:bg-accent transition-colors text-xs group relative"
                                onMouseEnter={() => setShowAllCheckbox(true)}
                                onMouseLeave={() => setShowAllCheckbox(false)}
                              >
                                {isCreator && (
                                  <div 
                                    className={`flex items-center ${
                                      (showAllCheckbox && !selectedFileIds.size) || selectedFileIds.size > 0 
                                        ? 'w-6 opacity-100' 
                                        : 'w-0 opacity-0'
                                    } transition-all duration-150 flex-shrink-0`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleSelect(file.id);
                                      }}
                                      className="w-4 h-4"
                                    />
                                  </div>
                                )}
                                <div 
                                  className="flex items-center min-w-0 flex-1 cursor-pointer pr-7"
                                  onClick={() => {
                                    window.open(`/dashboard/inbox?fileId=${file.uid}`, '_blank');
                                  }}
                                >
                                  <Image
                                    src={getItemIcon(file.media_type)}
                                    alt={String(file.media_type)}
                                    width={16}
                                    height={16}
                                    className="mr-2 flex-shrink-0"
                                  />
                                  <span className="truncate">{file.title}</span>
                                </div>
                                {isCreator && (
                                  <Tooltip title="Move out">
                                    <button
                                      className="absolute right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveOut([file.id]);
                                      }}
                                    >
                                      <MoveOutIcon size={16} />
                                    </button>
                                  </Tooltip>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* 批量操作栏，固定在底部 */}
                    {isCreator && selectedFileIds.size > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-white border-t flex items-center shadow-md z-10 px-2 py-1" style={{boxShadow:'0 -2px 8px rgba(0,0,0,0.04)'}}>
                        <button className="text-xs underline px-2 py-1 cursor-pointer" onClick={handleSelectAll}>
                          {selectedFileIds.size === files.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <div className="ml-auto flex gap-2">
                          <Tooltip title="Move out">
                            <Button variant="outline" size="sm" className="cursor-pointer flex items-center justify-center" onClick={() => handleMoveOut(Array.from(selectedFileIds))} disabled={isBatchLoading}>
                              <MoveOutIcon size={20} />
                            </Button>
                          </Tooltip>
                          <Tooltip title="Share">
                            <Button variant="outline" size="sm" className="cursor-pointer flex items-center justify-center" onClick={handleBatchShare} disabled={isBatchLoading}>
                              <ShareAltOutlined style={{ fontSize: 18 }} />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧AI功能区，设置overflow-hidden */}
                <div className="col-span-2 h-full overflow-hidden">
                  <KnowledgeBaseAITools
                    knowledgeBase={knowledgeBase}
                    loading={isLoading}
                    height="100%"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AddFileModal
        open={isAddFileModalOpen}
        onClose={() => setIsAddFileModalOpen(false)}
        kbId={kbId}
        onComplete={() => {
          setIsAddFileModalOpen(false);
          fetchKbFiles();
        }}
      />
      <EditKnowledgeBaseModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        knowledgeBase={{
          uid: kbId,
          name: knowledgeBase?.name || '',
          description: knowledgeBase?.description || undefined,
          visibility: (knowledgeBase?.visibility?.toLowerCase() || 'default') as 'private' | 'default' | 'public',
          subscriber_count: knowledgeBase?.subscriber_count || 0,
        }}
        onComplete={(updatedKb) => {
          setIsEditModalOpen(false);
          fetchKnowledgeBaseDetail();
          // Pass the updated knowledge base info to parent
          onKnowledgeBaseUpdate?.(updatedKb);
        }}
      />
    </div>
  );
}
