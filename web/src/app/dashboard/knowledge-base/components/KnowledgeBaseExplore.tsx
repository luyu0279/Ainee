"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import KnowledgeBaseSidebar from './KnowledgeBaseSidebar';
import KnowledgeBaseDetail from './KnowledgeBaseDetail';
import KnowledgeBaseCardSkeleton from './KnowledgeBaseCardSkeleton';
import { KnowledgeBaseService } from '@/apis/services/KnowledgeBaseService';
import { CustomOpenApi } from '@/apis/CustomOpenApi';
import type { KnowledgeBaseResponse } from '@/apis/models/KnowledgeBaseResponse';
import ApiLibs from '@/lib/ApiLibs';
import { toast } from 'react-hot-toast';

interface KnowledgeBaseExploreProps {
  onExploreClick: () => void;
  currentView: 'explore' | 'detail';
  selectedId?: string;
  onKnowledgeBaseSelect: (id: string) => void;
  onSubscriptionChange: (kbId: string, isSubscribed: boolean) => void;
}

const knowledgeBaseService = new KnowledgeBaseService(new CustomOpenApi().request);

function KnowledgeBaseCard({ kb, onSelect }: { kb: KnowledgeBaseResponse; onSelect: (id: string) => void }) {
  return (
    <div 
      className="bg-background border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(kb.uid)}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold mb-1.5 truncate pr-2">{kb.name}</h3>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2 truncate pr-4">{kb.description || ''}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 min-w-0">
            <img 
              src={kb.user_picture || '/images/default-avatar.png'} 
              alt={kb.user_name || 'User'} 
              className="w-4 h-4 rounded-full object-cover flex-shrink-0"
            />
            <span className="font-medium text-foreground">{kb.user_name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{kb.subscriber_count || 0} joined</span>
            <span>·</span>
            <span>{kb.content_count || 0} Files</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KnowledgeBaseDetailProps {
  kbId: string;
  onBack: () => void;
  onSubscriptionChange: (kbId: string, isSubscribed: boolean) => void;
}

export default function KnowledgeBaseExplore({ 
  onExploreClick, 
  currentView, 
  selectedId, 
  onKnowledgeBaseSelect,
  onSubscriptionChange 
}: KnowledgeBaseExploreProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [allKnowledgeBases, setAllKnowledgeBases] = useState<KnowledgeBaseResponse[]>([]);
  const [currentKnowledgeBase, setCurrentKnowledgeBase] = useState<KnowledgeBaseResponse | null>(null);

  // 获取知识库详情
  const fetchKnowledgeBaseDetail = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await ApiLibs.knowledgeBase.getKnowledgeBaseDetailApiKbGetDetailGet(id);
      if (response.data) {
        setCurrentKnowledgeBase(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge base details:', error);
      toast.error('Failed to load knowledge base details');
    } finally {
      setIsLoading(false);
    }
  };

  // 当选中的知识库ID变化时，获取详情
  useEffect(() => {
    if (currentView === 'detail' && selectedId) {
      fetchKnowledgeBaseDetail(selectedId);
    }
  }, [currentView, selectedId]);

  // 处理订阅/取消订阅
  const handleSubscriptionToggle = async () => {
    if (!currentKnowledgeBase) return;
    
    try {
      const newSubscriptionState = !currentKnowledgeBase.subscribed;
      
      if (currentKnowledgeBase.subscribed) {
        await ApiLibs.knowledgeBase.unsubscribeKnowledgeBaseApiKbUnsubscribeKbUidPost(currentKnowledgeBase.uid);
      } else {
        await ApiLibs.knowledgeBase.subscribeKnowledgeBaseApiKbSubscribeKbUidPost(currentKnowledgeBase.uid);
      }

      // 更新本地状态
      setCurrentKnowledgeBase(prev => 
        prev ? { ...prev, subscribed: newSubscriptionState } : null
      );
      
      // 通知父组件订阅状态变化
      onSubscriptionChange(currentKnowledgeBase.uid, newSubscriptionState);
      
      toast.success(
        newSubscriptionState 
          ? 'Successfully subscribed to knowledge base'
          : 'Successfully unsubscribed from knowledge base'
      );
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      toast.error('Failed to update subscription status');
    }
  };

  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      try {
        setIsLoading(true);
        // 获取所有知识库
        const response = await ApiLibs.knowledgeBase.getOthersKnowledgeBaseListApiKbListExploreGet(
          0,  // offset
          100 // limit - 设置一个较大的值以获取更多数据
        );

        if (response.data?.knowledge_bases) {
          // 按照订阅数量排序
          const sortedKbs = [...response.data.knowledge_bases].sort(
            (a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0)
          );
          setAllKnowledgeBases(sortedKbs);
        }
      } catch (error) {
        console.error('Failed to fetch knowledge bases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKnowledgeBases();
  }, []);

  // 获取推荐的知识库（订阅数最多的前3个）
  const recommendedKbs = allKnowledgeBases.slice(0, 3);
  // 获取其他知识库
  const moreKbs = allKnowledgeBases.slice(3);

  // 生成骨架屏数组
  const recommendSkeletons = Array(3).fill(null);
  const moreSkeletons = Array(6).fill(null);

  return (
    <div className="flex-1 overflow-hidden">
      {currentView === 'detail' && currentKnowledgeBase ? (
        <KnowledgeBaseDetail
          kbId={currentKnowledgeBase.uid}
          onBack={onExploreClick}
          onSubscriptionChange={(kbId: string, isSubscribed: boolean) => {
            // 更新本地状态
            if (currentKnowledgeBase && currentKnowledgeBase.uid === kbId) {
              setCurrentKnowledgeBase({
                ...currentKnowledgeBase,
                subscribed: isSubscribed
              });
            }
            // 通知父组件
            onSubscriptionChange(kbId, isSubscribed);
          }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto py-4">
          {/* <div className="h-[64px] flex items-center px-6">
            <h1 className="text-lg font-semibold">Explore</h1>
          </div> */}

          <div className="px-6">
            {/* Recommend 区域 - 显示订阅数最多的3个 */}
            <div className="mb-6">
              <h2 className="text-base font-medium mb-3">Most Popular</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  recommendSkeletons.map((_, index) => (
                    <KnowledgeBaseCardSkeleton key={`recommend-skeleton-${index}`} />
                  ))
                ) : (
                  recommendedKbs.map((kb) => (
                    <KnowledgeBaseCard 
                      key={kb.uid} 
                      kb={kb} 
                      onSelect={onKnowledgeBaseSelect}
                    />
                  ))
                )}
              </div>
            </div>

            {/* More 区域 */}
            <div>
              <h2 className="text-base font-medium mb-3">More</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  moreSkeletons.map((_, index) => (
                    <KnowledgeBaseCardSkeleton key={`more-skeleton-${index}`} />
                  ))
                ) : (
                  moreKbs.map((kb) => (
                    <KnowledgeBaseCard 
                      key={kb.uid} 
                      kb={kb} 
                      onSelect={onKnowledgeBaseSelect}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
