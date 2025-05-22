import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import ApiLibs from '@/lib/ApiLibs';
import { useKnowledgeBaseCache } from './useKnowledgeBaseCache';
import type { KnowledgeBaseResponse } from '@/apis/models/KnowledgeBaseResponse';
import { KnowledgeBaseType } from '@/apis/models/KnowledgeBaseType';

export function useKnowledgeBaseManager() {
  const { 
    cache, 
    isCacheValid, 
    updateDetailCache, 
    updateListCache,
    invalidateCache 
  } = useKnowledgeBaseCache();
  
  const [isLoading, setIsLoading] = useState<{
    details: Map<string, boolean>;
    lists: {
      created: boolean;
      subscribed: boolean;
      recommended: boolean;
    };
  }>({
    details: new Map(),
    lists: {
      created: false,
      subscribed: false,
      recommended: false
    }
  });

  // 获取知识库详情
  const getKnowledgeBaseDetail = useCallback(async (kbId: string) => {
    // 如果缓存有效，直接返回缓存数据
    if (isCacheValid(kbId)) {
      return cache.details.get(kbId);
    }

    // 避免重复请求
    if (isLoading.details.get(kbId)) {
      return null;
    }

    try {
      setIsLoading(prev => ({
        ...prev,
        details: new Map(prev.details).set(kbId, true)
      }));

      const response = await ApiLibs.knowledgeBase.getKnowledgeBaseDetailApiKbGetDetailGet(kbId);
      if (response?.data) {
        updateDetailCache(kbId, response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to fetch knowledge base detail:', error);
      toast.error('Failed to load knowledge base details');
    } finally {
      setIsLoading(prev => ({
        ...prev,
        details: new Map(prev.details).set(kbId, false)
      }));
    }
  }, [isCacheValid, cache.details, isLoading.details, updateDetailCache]);

  // 获取知识库列表
  const getKnowledgeBases = useCallback(async (type: 'created' | 'subscribed' | 'recommended') => {
    // 如果缓存有效，直接返回缓存数据
    if (isCacheValid(type)) {
      return cache.lists[type];
    }

    // 避免重复请求
    if (isLoading.lists[type]) {
      return null;
    }

    try {
      setIsLoading(prev => ({
        ...prev,
        lists: {
          ...prev.lists,
          [type]: true
        }
      }));

      let response;
      if (type === 'recommended') {
        response = await ApiLibs.knowledgeBase.getOthersKnowledgeBaseListApiKbListExploreGet();
      } else {
        response = await ApiLibs.knowledgeBase.getKnowledgeBaseListApiKbListOwnGet(
          type === 'created' ? KnowledgeBaseType.OWNED : KnowledgeBaseType.SUBSCRIBED
        );
      }

      if (response?.data?.knowledge_bases) {
        updateListCache(type, response.data.knowledge_bases);
        return response.data.knowledge_bases;
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} knowledge bases:`, error);
      toast.error(`Failed to load ${type} knowledge bases`);
    } finally {
      setIsLoading(prev => ({
        ...prev,
        lists: {
          ...prev.lists,
          [type]: false
        }
      }));
    }
  }, [isCacheValid, cache.lists, isLoading.lists, updateListCache]);

  // 订阅/取消订阅处理
  const handleSubscriptionChange = useCallback(async (kb: KnowledgeBaseResponse, newState: boolean) => {
    try {
      // 先执行 API 调用
      if (newState) {
        await ApiLibs.knowledgeBase.subscribeKnowledgeBaseApiKbSubscribeKbUidPost(kb.uid);
      } else {
        await ApiLibs.knowledgeBase.unsubscribeKnowledgeBaseApiKbUnsubscribeKbUidPost(kb.uid);
      }

      // 立即使缓存失效
      invalidateCache('subscribed');
      invalidateCache('recommended');
      
      // 强制重新获取列表
      await Promise.all([
        getKnowledgeBases('subscribed'),
        getKnowledgeBases('recommended')
      ]);

      // 更新详情缓存
      const updatedKb = { ...kb, subscribed: newState };
      updateDetailCache(kb.uid, updatedKb);

      return true;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      toast.error('Failed to update subscription');
      return false;
    }
  }, [invalidateCache, getKnowledgeBases, updateDetailCache]);

  // 刷新所有数据
  const refreshAll = useCallback(async () => {
    invalidateCache();
    await Promise.all([
      getKnowledgeBases('created'),
      getKnowledgeBases('subscribed'),
      getKnowledgeBases('recommended')
    ]);
  }, [invalidateCache, getKnowledgeBases]);

  return {
    knowledgeBases: cache.lists,
    knowledgeBaseDetails: cache.details,
    isLoading,
    getKnowledgeBaseDetail,
    getKnowledgeBases,
    handleSubscriptionChange,
    refreshAll
  };
} 