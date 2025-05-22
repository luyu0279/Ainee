"use client";

import React, { useState, useEffect, RefObject, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Lock, Globe, Loader2, Search, Check, RefreshCw, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { KnowledgeBaseResponse } from '@/apis/models/KnowledgeBaseResponse';
import { KnowledgeBaseType } from '@/apis/models/KnowledgeBaseType';
import { toast } from 'react-hot-toast';
import ApiLibs from '@/lib/ApiLibs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { KnowledgeBaseVisibility } from '@/apis/models/KnowledgeBaseVisibility';
import KnowledgeBaseDialog from './KnowledgeBaseDialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { useKnowledgeBaseManager } from '../hooks/useKnowledgeBaseManager';

interface KnowledgeBaseSidebarProps {
  selectedId?: string;
  onSelect: (id: string) => void;
  onExploreClick: () => void;
  onSubscriptionChange?: (kbId: string, isSubscribed: boolean) => void;
  onKnowledgeBaseUpdate?: (updatedKb: { uid: string; name: string; description?: string; visibility?: string }) => void;
  isCreateDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

// 骨架屏组件
function SidebarItemSkeleton() {
  return (
    <div className="p-1.5 rounded-lg animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-3/4 bg-accent/10 rounded" />
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-accent/10" />
          <div className="h-3 w-20 bg-accent/10 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeBaseSidebar({ 
  selectedId: propSelectedId, 
  onSelect, 
  onExploreClick,
  onSubscriptionChange,
  onKnowledgeBaseUpdate,
  isCreateDialogOpen,
  onCreateDialogOpenChange
}: KnowledgeBaseSidebarProps) {
  const searchParams = useSearchParams();
  const selectedId = propSelectedId || searchParams.get('id');
  
  // 使用知识库管理 hook
  const {
    knowledgeBases,
    isLoading,
    getKnowledgeBases,
    handleSubscriptionChange,
    refreshAll
  } = useKnowledgeBaseManager();
  
  const isLoadingAny = isLoading.lists.created || isLoading.lists.subscribed || isLoading.lists.recommended;

  // 状态定义
  const [activeTab, setActiveTab] = useState<'mine' | 'subscribed'>('mine');
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [filteredKbs, setFilteredKbs] = useState<KnowledgeBaseResponse[]>([]);
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      // 按顺序加载，确保数据一致性
      await getKnowledgeBases('created');
      await getKnowledgeBases('subscribed');
      // 只有在订阅列表加载完成后再加载推荐列表
      await getKnowledgeBases('recommended');
    };
    
    initializeData();
  }, [getKnowledgeBases]);

  // 搜索处理函数
  const handleSearch = useCallback((term: string) => {
    const kbs = activeTab === 'mine' ? knowledgeBases.created : knowledgeBases.subscribed;
    if (!term.trim()) {
      setFilteredKbs(kbs || []);
      return;
    }
    const filtered = (kbs || []).filter(kb => 
      kb.name.toLowerCase().includes(term.toLowerCase()) ||
      kb.description?.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredKbs(filtered);
  }, [activeTab, knowledgeBases.created, knowledgeBases.subscribed]);

  // 监听 knowledgeBases 变化
  useEffect(() => {
    if (activeTab === 'subscribed') {
      if (debouncedSearchText) {
        handleSearch(debouncedSearchText);
      } else {
        setFilteredKbs(knowledgeBases.subscribed || []);
      }
    } else {
      setFilteredKbs(knowledgeBases.created || []);
    }
  }, [activeTab, knowledgeBases.subscribed, knowledgeBases.created, debouncedSearchText, handleSearch]);

  // 监听订阅状态变化
  useEffect(() => {
    const handleSubscriptionUpdate = async () => {
      // 按顺序更新列表
      await getKnowledgeBases('subscribed');
      await getKnowledgeBases('recommended');
      
      // 更新显示的列表
      if (activeTab === 'subscribed') {
        const updatedSubscribedList = knowledgeBases.subscribed || [];
        setFilteredKbs(debouncedSearchText ? 
          updatedSubscribedList.filter(kb => 
            kb.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
            kb.description?.toLowerCase().includes(debouncedSearchText.toLowerCase())
          ) : 
          updatedSubscribedList
        );
      }
    };

    window.addEventListener('subscription-change', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscription-change', handleSubscriptionUpdate);
    };
  }, [getKnowledgeBases, activeTab, debouncedSearchText, knowledgeBases.subscribed]);

  // 修改 handleSubscriptionToggle 函数
  const handleSubscriptionToggle = async (kb: KnowledgeBaseResponse, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!kb) return;
    
    const success = await handleSubscriptionChange(kb, !kb.subscribed);
    if (success) {
      onSubscriptionChange?.(kb.uid, !kb.subscribed);
      
      // 按顺序更新列表
      await getKnowledgeBases('subscribed');
      await getKnowledgeBases('recommended');
      
      // 立即更新当前显示的列表
      if (activeTab === 'subscribed') {
        const updatedSubscribedList = knowledgeBases.subscribed || [];
        setFilteredKbs(debouncedSearchText ? 
          updatedSubscribedList.filter(kb => 
            kb.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
            kb.description?.toLowerCase().includes(debouncedSearchText.toLowerCase())
          ) : 
          updatedSubscribedList
        );
      }
    }
  };

  // 处理创建成功
  const handleCreateSuccess = async (newKbId: string) => {
    try {
      await refreshAll();
      onSelect(newKbId);
    } catch (error) {
      console.error('Error refreshing knowledge bases:', error);
      onSelect(newKbId);
    }
  };

  // 渲染知识库条目
  const renderKnowledgeBaseItem = (kb: KnowledgeBaseResponse, type: 'mine' | 'subscribed' | 'recommended', index: number) => {
    const isCreator = kb.owned;
    const showCreatorInfo = type !== 'mine';
    const itemKey = `${type}-${index}-${kb.uid}`;

    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const sidebarWidth = 240; // 侧边栏宽度
      setHoverPosition({ 
        top: rect.top + window.scrollY,
        left: sidebarWidth + 1 // 确保悬浮卡片在侧边栏右侧
      });
      setHoveredItemKey(itemKey);
    };

    return (
      <div 
        key={itemKey}
        className="relative" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHoveredItemKey(null)}
      >
        <Link href={`/dashboard/knowledge-base?id=${kb.uid}`}>
          <div
            className={`flex items-start p-1.5 rounded-lg hover:bg-accent/50 cursor-pointer ${
              selectedId === kb.uid ? 'bg-accent' : ''
            }`}
            onClick={() => onSelect(kb.uid)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate py-1">{kb.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 pb-1 min-w-0">
                {showCreatorInfo ? (
                  // 用户不是这个知识库的创作者的时候的显示信息
                  <div className="flex items-center gap-1 min-w-0">
                    {kb.user_picture ? (
                      <img 
                        src={kb.user_picture}
                        alt={kb.user_name || 'User'} 
                        className="w-3 h-3 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                        <span className="text-[8px] text-primary font-medium">
                          {(kb.user_name || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium truncate">{kb.user_name || 'Unknown'}</span>
                    <span className="flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{kb.subscriber_count || 0} joined</span>
                    <span className="flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{kb.content_count || 0} files</span>
                  </div>
                ) : (
                  // 用户自己为创作者的时候的显示信息
                  <div className="flex items-center gap-1 min-w-0">
                    {['public', 'default'].includes(kb.visibility) ? (
                      <>
                        <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="flex-shrink-0">Public</span>
                        <span className="flex-shrink-0">·</span>
                        <span className="flex-shrink-0">{kb.subscriber_count || 0} joined</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="flex-shrink-0">Private</span>
                      </>
                    )}
                    <span className="flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{kb.content_count || 0} files</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* 悬浮卡片 */}
        {hoveredItemKey === itemKey && (
          <div 
            className="fixed z-50 w-[300px]"
            style={{ 
              top: `${hoverPosition.top}px`,
              left: `${hoverPosition.left}px`,
            }}
          >
            <div className="bg-background border rounded-lg shadow-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-semibold truncate pr-2">{kb.name}</h3>
                {!isCreator && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={(e) => handleSubscriptionToggle(kb, e)}
                  >
                    {kb.subscribed ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        <span>Subscribe</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{kb.description || 'No description'}</p>
              <div className="flex flex-1 items-center gap-2 text-xs">
                {kb.user_picture ? (
                  <img 
                    src={kb.user_picture}
                    alt={kb.user_name || 'User'} 
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[8px] text-primary font-medium">
                      {(kb.user_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="font-medium truncate">{kb.user_name || 'Unknown'}</span>
                <span className="text-muted-foreground">{kb.subscriber_count || 0} joined</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{kb.content_count || 0} files</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 修改刷新处理函数
  const handleRefresh = async () => {
    // 按顺序刷新列表
    await getKnowledgeBases('created');
    await getKnowledgeBases('subscribed');
    await getKnowledgeBases('recommended');
    toast.success('Knowledge bases refreshed');
  };

  // 渲染知识库列表
  const renderKnowledgeBaseList = () => {
    if (searchText) {
      return filteredKbs.map((kb, index) => renderKnowledgeBaseItem(kb, activeTab, index));
    }

    if (activeTab === 'subscribed') {
      const subscribedList = knowledgeBases.subscribed || [];
      const subscribedItems = subscribedList.map((kb, index) => 
        renderKnowledgeBaseItem(kb, 'subscribed', index)
      );

      // 只在订阅数小于5时显示推荐列表，并确保推荐列表不包含已订阅的项目
      if (subscribedList.length < 5 && knowledgeBases.recommended) {
        const subscribedIds = new Set(subscribedList.map(kb => kb.uid));
        const recommendedItems = knowledgeBases.recommended
          .filter(kb => !subscribedIds.has(kb.uid))
          .slice(0, 5 - subscribedList.length) // 只显示需要补充的数量
          .map((kb, index) => renderKnowledgeBaseItem(kb, 'recommended', index));

        if (recommendedItems.length > 0) {
          return (
            <>
              {subscribedItems}
              <div className="mt-3 pt-3 pb-1 border-t">
                <div className="flex items-center justify-between text-[13px] font-medium pl-1.5">
                  {subscribedList.length === 0 ? 'Popular knowledge bases' : 'Recommended for you'}
                  <Button
                    variant="ghost"
                    className="text-xs hover:text-foreground cursor-pointer h-7 w-7"
                    onClick={onExploreClick}
                  >
                    <Compass className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {recommendedItems}
            </>
          );
        }
      }
      return subscribedItems;
    }

    return filteredKbs.map((kb, index) => renderKnowledgeBaseItem(kb, 'mine', index));
  };

  return (
    <div className="w-[260px] h-[calc(100vh-3rem)] flex flex-col bg-background border-r">
      {/* 搜索和创建区域 */}
      <div className="p-4 space-y-4">
      <div className="flex gap-2 justify-between">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search knowledge bases..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-8 pr-4 h-8 text-xs"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
          </div>
          <Button
              variant="outline"
              className="flex items-center justify-center gap-2 bg-white text-xs h-8"
              onClick={onExploreClick}
            >
              <Compass className="w-3 h-3" />
              {/* Explore */}
            </Button>
          </div>
         {/* 创建按钮 */}
        <div className="flex">
          <Dialog open={isCreateDialogOpen} onOpenChange={onCreateDialogOpenChange}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="flex items-center justify-center gap-2 bg-white text-xs h-8 w-full"
                data-testid="create-kb-button"
              >
                <span className="text-sm">+</span>
                New Knowledge Base
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Knowledge Base</DialogTitle>
              </DialogHeader>
              <KnowledgeBaseDialog
                mode="create"
                open={isCreateDialogOpen}
                onOpenChange={onCreateDialogOpenChange}
                onSuccess={(newKb) => {
                  handleCreateSuccess(newKb.uid);
                  onCreateDialogOpenChange?.(false);
                  onKnowledgeBaseUpdate?.(newKb);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tab切换区域 */}
      <div className="border-b">
        <div className="flex items-center justify-between px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('mine')}
              className={`py-2 w-12 text-center text-[13px] font-medium border-b-2 -mb-px ${
                activeTab === 'mine'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => setActiveTab('subscribed')}
              className={`py-2 w-20 text-center text-[13px] font-medium border-b-2 -mb-px ${
                activeTab === 'subscribed'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              }`}
            >
              Subscribed
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={isLoadingAny}
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingAny ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 知识库列表区域 */}
      <div className="flex-1 overflow-auto">
        {isLoadingAny ? (
          <div className="space-y-1 py-2 px-4">
            {Array(5).fill(0).map((_, index) => (
              <SidebarItemSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-1 py-2 px-4">
            {renderKnowledgeBaseList()}
          </div>
        )}
      </div>
    </div>
  );
}
