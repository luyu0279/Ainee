"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import KnowledgeBaseExplore from './components/KnowledgeBaseExplore';
import { toast } from "@/components/ui/toast";
import KnowledgeBaseSidebar from './components/KnowledgeBaseSidebar';
import ApiLibs from '@/lib/ApiLibs';
import Image from 'next/image';
import KnowledgeBaseDetail from './components/KnowledgeBaseDetail';

// Tab类型
interface TabType {
  key: string; // unique
  type: 'explore' | 'detail';
  id?: string; // detail时为kbId
  title: string;
  subscribed: boolean;
}

type PageView = 'explore' | 'detail';

// 提取详情页组件
const DetailView = React.memo(({ 
  kbId, 
  onExploreClick,
  onSubscriptionChange,
  subscribed,
  onKnowledgeBaseUpdate
}: { 
  kbId: string;
  onExploreClick: () => void;
  onSubscriptionChange: (kbId: string, isSubscribed: boolean) => void;
  subscribed?: boolean;
  onKnowledgeBaseUpdate: (updatedKb: { uid: string; name: string; description?: string; visibility?: string }) => void;
}) => {
  return (
    <KnowledgeBaseDetail
      key={`${kbId}-${subscribed}`}
      kbId={kbId}
      onBack={onExploreClick}
      onSubscriptionChange={onSubscriptionChange}
      initialSubscribed={subscribed}
      onKnowledgeBaseUpdate={onKnowledgeBaseUpdate}
    />
  );
});

DetailView.displayName = 'DetailView';

// 提取浏览页组件
const ExploreView = React.memo(({ 
  onKnowledgeBaseSelect,
  onSubscriptionChange 
}: { 
  onKnowledgeBaseSelect: (id: string) => void;
  onSubscriptionChange: (kbId: string, isSubscribed: boolean) => void;
}) => {
  return (
    <KnowledgeBaseExplore
      currentView="explore"
      selectedId={undefined}
      onExploreClick={() => {}} // 在浏览页面不需要这个回调
      onKnowledgeBaseSelect={onKnowledgeBaseSelect}
      onSubscriptionChange={onSubscriptionChange}
    />
  );
});

ExploreView.displayName = 'ExploreView';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const kbIdFromUrl = searchParams.get('id');
  const shouldCreate = searchParams.get('create') === 'true';
  const [isKbSidebarOpen, setIsKbSidebarOpen] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  // Tab管理
  const [tabs, setTabs] = useState<TabType[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('kb_tabs');
      if (cached) return JSON.parse(cached);
    }
    return [{ key: 'explore', type: 'explore', title: 'Explore', subscribed: true }];
  });
  const [activeTabKey, setActiveTabKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('kb_activeTabKey');
      if (cached) return cached;
    }
    return 'explore';
  });
  const [refreshSidebarKey, setRefreshSidebarKey] = useState(0);
  const [kbNameMap, setKbNameMap] = useState<{ [id: string]: string }>({});

  // 检查是否需要打开创建对话框
  useEffect(() => {
    if (shouldCreate) {
      // 移除create参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('create');
      router.replace(newUrl.pathname + newUrl.search);
      
      // 直接设置对话框状态为打开
      setIsCreateDialogOpen(true);
    }
  }, [shouldCreate, router]);

  // 本地缓存tabs和activeTabKey
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kb_tabs', JSON.stringify(tabs));
    }
  }, [tabs]);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kb_activeTabKey', activeTabKey);
    }
  }, [activeTabKey]);
        
  // 刷新侧边栏的函数
  const refreshSidebar = useCallback(() => {
    setRefreshSidebarKey(prev => prev + 1);
  }, []);

  // 处理URL中的知识库ID参数
  useEffect(() => {
    if (kbIdFromUrl) {
      // 如果标签不存在，创建新标签
      if (!tabs.some(t => t.id === kbIdFromUrl)) {
        handleKnowledgeBaseSelect(kbIdFromUrl);
      } else {
        // 如果标签已存在，激活它
        const existingTab = tabs.find(t => t.id === kbIdFromUrl);
        if (existingTab) {
          setActiveTabKey(existingTab.key);
        }
      }
    }
  }, [kbIdFromUrl]);

  // 修改打开标签的逻辑
  const openTab = (tab: TabType) => {
    setTabs(prev => {
      if (prev.some(t => t.key === tab.key)) return prev;
      return [...prev, { ...tab, subscribed: true }];
    });
    setActiveTabKey(tab.key);

    // 更新URL
    if (tab.type === 'detail' && tab.id) {
      router.replace(`${pathname}?id=${tab.id}`);
    } else if (tab.type === 'explore') {
      router.replace(pathname);
    }
  };

  // 修改关闭标签的逻辑
  const closeTab = (key: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.key === key);
      const newTabs = prev.filter(t => t.key !== key);
      
      // 切换到左侧Tab或最后一个
      if (key === activeTabKey) {
        if (newTabs.length > 0) {
          const newActiveTab = newTabs[Math.max(0, idx - 1)];
          setActiveTabKey(newActiveTab.key);
          
          // 更新URL
          if (newActiveTab.type === 'detail' && newActiveTab.id) {
            router.replace(`${pathname}?id=${newActiveTab.id}`);
          } else {
            router.replace(pathname);
          }
        } else {
          setActiveTabKey('explore');
          router.replace(pathname);
        }
      }
      return newTabs;
    });
  };

  // 修改标签点击的逻辑
  const handleTabClick = (key: string) => {
    setActiveTabKey(key);
    
    // 更新URL
    const clickedTab = tabs.find(t => t.key === key);
    if (clickedTab?.type === 'detail' && clickedTab.id) {
      router.replace(`${pathname}?id=${clickedTab.id}`);
    } else {
      router.replace(pathname);
    }
  };

  // 自动补全Tab名称
  useEffect(() => {
    const detailTabs = tabs.filter(tab => tab.type === 'detail' && tab.id && (tab.title === tab.id || !tab.title));
    detailTabs.forEach(tab => {
      if (tab.id && !kbNameMap[tab.id]) {
        ApiLibs.knowledgeBase.getKnowledgeBaseDetailApiKbGetDetailGet(tab.id).then(res => {
          const name = res?.data?.name;
          if (name) {
            setKbNameMap(prev => ({ ...prev, [tab.id!]: name }));
            setTabs(prevTabs => prevTabs.map(t => t.key === tab.key ? { ...t, title: name } : t));
          }
        });
      }
    });
    // eslint-disable-next-line
  }, [tabs]);

  // Tab栏骨架屏
  const renderTabSkeleton = () => (
    <div className="flex items-center gap-x-2">
      {Array(2).fill(0).map((_, i) => (
        <div key={i} className="bg-accent/10 rounded-md animate-pulse w-24 h-8 my-1" />
      ))}
    </div>
  );

  // 处理订阅状态变化
  const handleSubscriptionChange = useCallback((kbId: string, isSubscribed: boolean) => {
    // 更新所有相关组件的状态
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id === kbId) {
        return { ...tab, subscribed: isSubscribed };
      }
      return tab;
    }));

    // 只在侧边栏需要更新时才更新refreshSidebarKey
    if (activeTabKey === 'explore') {
      setRefreshSidebarKey(prev => prev + 1);
    }
  }, [activeTabKey]);

  const handleExploreClick = useCallback(() => {
    openTab(createTab('explore', 'explore', 'Explore'));
  }, []);

  const handleKnowledgeBaseSelect = useCallback((id: string) => {
    // 先创建一个加载中的tab
    openTab(createTab(id, 'detail', 'Loading...'));
    
    // 获取知识库详情来更新标题
    ApiLibs.knowledgeBase.getKnowledgeBaseDetailApiKbGetDetailGet(id)
      .then(res => {
        const name = res?.data?.name;
        if (name) {
          setTabs(prevTabs => prevTabs.map(tab => 
            tab.id === id ? { ...tab, title: name } : tab
          ));
        }
      })
      .catch(console.error);
  }, []);

  const createTab = (id: string, type: 'detail' | 'explore', title: string, subscribed: boolean = false) => {
    return { key: id, type, id, title, subscribed };
  };

  // 处理知识库更新
  const handleKnowledgeBaseUpdate = useCallback((updatedKb: { uid: string; name: string; description?: string; visibility?: string }) => {
    // 更新标签标题
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === updatedKb.uid ? { ...tab, title: updatedKb.name } : tab
    ));
    
    // 更新知识库名称映射
    setKbNameMap(prev => ({ ...prev, [updatedKb.uid]: updatedKb.name }));
    
    // 刷新侧边栏
    refreshSidebar();
  }, [refreshSidebar]);

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* Knowledge Base内容区 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 顶部Tab栏 */}
        <div className="flex items-center h-12 bg-white border-b px-2">
          {/* Tab栏左侧的收起/展开按钮 */}
          <div
            className={`
              relative flex items-center px-4 h-8 rounded-md cursor-pointer
              transition-all duration-150 my-1 mr-2
              ${isKbSidebarOpen
                ? 'bg-white shadow text-primary'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}
            `}
            onClick={() => setIsKbSidebarOpen(!isKbSidebarOpen)}
          >
            <Image
              src={isKbSidebarOpen ? '/icon/sidebar-expand.svg' : '/icon/sidebar-collapse.svg'}
              alt={isKbSidebarOpen ? 'Collapse' : 'Expand'}
              width={20}
              height={20}
              className="text-black"
            />
          </div>
          
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            {tabs.length === 0 ? (
              renderTabSkeleton()
            ) : (
              <div className="inline-flex items-center gap-x-2">
                {tabs.map(tab => (
                  <div
                    key={tab.key}
                    className={`
                      relative flex items-center px-4 h-8 min-w-[80px] max-w-[180px] rounded-md cursor-pointer
                      transition-all duration-150 my-1
                      ${activeTabKey === tab.key
                        ? 'bg-white shadow text-primary font-semibold'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}
                    `}
                    style={{ fontSize: '13px', marginRight: '8px' }}
                    onClick={() => handleTabClick(tab.key)}
                  >
                    {tab.type === 'explore' ? (
                      <><img src="/icon/compass.svg" alt="Explore" className="w-4 h-4 mr-1" /><span className="truncate">{tab.title}</span></>
                    ) : (
                      <><img src="/icon/knowledgebase.svg" alt="KB" className="w-5 h-5 mr-1" /><span className="truncate">{tab.title}</span></>
                    )}
                    {tab.key !== 'explore' && (
                      <button
                        className="ml-2 text-xs text-muted-foreground hover:text-destructive transition"
                        style={{ fontSize: '12px' }}
                        onClick={e => { e.stopPropagation(); closeTab(tab.key); }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 知识库侧边栏 */}
          {isKbSidebarOpen && (
            <KnowledgeBaseSidebar 
              key={`sidebar-${refreshSidebarKey}`}
              onSelect={(id: string, name?: string) => {
                // 确保使用传入的名称
                openTab(createTab(id, 'detail', name || 'Loading...'));
                
                // 如果没有名称，尝试获取知识库详情来更新标题
                if (!name) {
                  ApiLibs.knowledgeBase.getKnowledgeBaseDetailApiKbGetDetailGet(id)
                    .then(res => {
                      const name = res?.data?.name;
                      if (name) {
                        setTabs(prevTabs => prevTabs.map(tab => 
                          tab.id === id ? { ...tab, title: name } : tab
                        ));
                      }
                    })
                    .catch(console.error);
                }
              }}
              selectedId={activeTabKey !== 'explore' ? activeTabKey : undefined}
              onExploreClick={handleExploreClick}
              onSubscriptionChange={handleSubscriptionChange}
              onKnowledgeBaseUpdate={handleKnowledgeBaseUpdate}
              isCreateDialogOpen={isCreateDialogOpen}
              onCreateDialogOpenChange={setIsCreateDialogOpen}
            />
          )}

          {/* Tab内容区 */}
          <div className="flex-1 overflow-hidden">
            {tabs.map(tab => {
              if (tab.key !== activeTabKey) return null;

              if (!tab.id && tab.type === 'detail') return null;

              return tab.type === 'explore' ? (
                <ExploreView
                  key="explore"
                  onKnowledgeBaseSelect={handleKnowledgeBaseSelect}
                  onSubscriptionChange={handleSubscriptionChange}
                />
              ) : (
                <DetailView
                  key={`${tab.id}-${tab.subscribed}`}
                  kbId={tab.id!}
                  onExploreClick={handleExploreClick}
                  onSubscriptionChange={handleSubscriptionChange}
                  subscribed={tab.subscribed}
                  onKnowledgeBaseUpdate={handleKnowledgeBaseUpdate}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}