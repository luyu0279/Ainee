import { useState, useCallback } from 'react';
import type { KnowledgeBaseResponse } from '@/apis/models/KnowledgeBaseResponse';

interface KnowledgeBaseCache {
  details: Map<string, KnowledgeBaseResponse>;
  lists: {
    created: KnowledgeBaseResponse[];
    subscribed: KnowledgeBaseResponse[];
    recommended: KnowledgeBaseResponse[];
  };
  timestamp: {
    details: Map<string, number>;
    lists: {
      created: number;
      subscribed: number;
      recommended: number;
    };
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useKnowledgeBaseCache() {
  const [cache, setCache] = useState<KnowledgeBaseCache>({
    details: new Map(),
    lists: {
      created: [],
      subscribed: [],
      recommended: []
    },
    timestamp: {
      details: new Map(),
      lists: {
        created: 0,
        subscribed: 0,
        recommended: 0
      }
    }
  });

  const isCacheValid = useCallback((type: 'created' | 'subscribed' | 'recommended' | string) => {
    const now = Date.now();
    if (type === 'created' || type === 'subscribed' || type === 'recommended') {
      return now - cache.timestamp.lists[type] < CACHE_DURATION;
    }
    return cache.timestamp.details.has(type) && 
           (now - (cache.timestamp.details.get(type) || 0) < CACHE_DURATION);
  }, [cache.timestamp]);

  const updateDetailCache = useCallback((kbId: string, data: KnowledgeBaseResponse) => {
    setCache(prev => ({
      ...prev,
      details: new Map(prev.details).set(kbId, data),
      timestamp: {
        ...prev.timestamp,
        details: new Map(prev.timestamp.details).set(kbId, Date.now())
      }
    }));
  }, []);

  const updateListCache = useCallback((type: 'created' | 'subscribed' | 'recommended', data: KnowledgeBaseResponse[]) => {
    setCache(prev => ({
      ...prev,
      lists: {
        ...prev.lists,
        [type]: data
      },
      timestamp: {
        ...prev.timestamp,
        lists: {
          ...prev.timestamp.lists,
          [type]: Date.now()
        }
      }
    }));
  }, []);

  const invalidateCache = useCallback((type?: 'created' | 'subscribed' | 'recommended' | string) => {
    if (!type) {
      // Invalidate all cache
      setCache(prev => ({
        ...prev,
        timestamp: {
          details: new Map(),
          lists: {
            created: 0,
            subscribed: 0,
            recommended: 0
          }
        }
      }));
      return;
    }

    if (type === 'created' || type === 'subscribed' || type === 'recommended') {
      setCache(prev => ({
        ...prev,
        timestamp: {
          ...prev.timestamp,
          lists: {
            ...prev.timestamp.lists,
            [type]: 0
          }
        }
      }));
    } else {
      setCache(prev => ({
        ...prev,
        timestamp: {
          ...prev.timestamp,
          details: new Map(prev.timestamp.details).set(type, 0)
        }
      }));
    }
  }, []);

  return {
    cache,
    isCacheValid,
    updateDetailCache,
    updateListCache,
    invalidateCache
  };
} 