"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Home, GripVertical, X } from 'lucide-react';
import ApiLibs from "@/lib/ApiLibs";
import { ResponseCode } from "@/apis/models/ResponseCode";
import { toast } from "sonner";
import { ContentMediaType as LocalContentMediaType, type FileContent } from "@/types/fileTypes";
import FileContentViewer from './components/FileContentViewer';
import FilesSidebar from './components/FilesSidebar';
import { getItemIcon } from "@/utils/fileUtils";
import { AITools } from './components/AITools';
import { ImportDialog } from '@/components/import/ImportDialog';
import { ContentMediaType } from "@/types/fileTypes";

// Tab类型
interface TabType {
  key: string; // unique
  type: 'home' | 'file';
  id?: string;
  title: string;
  permanent?: boolean;
  media_type?: LocalContentMediaType;
}

interface FileItem {
  id: string;
  title: string;
  media_type: ContentMediaType;
  created_at: string;
  updated_at?: string;
}

export default function InboxPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 同时支持 file 和 fileId 参数
  const fileIdFromUrl = searchParams.get('fileId') || searchParams.get('file');

  const [fileId, setFileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileItem[]>([]);
  
  // Sidebar state
  const [isFilesSidebarOpen, setIsFilesSidebarOpen] = useState(true);
  
  // Tab管理
  const [tabs, setTabs] = useState<TabType[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('inbox_tabs');
      if (cached) {
        const parsedTabs = JSON.parse(cached);
        // 确保home tab存在
        if (!parsedTabs.some((t: TabType) => t.type === 'home')) {
          return [
            { key: 'home', type: 'home', title: 'Home', permanent: true },
            ...parsedTabs
          ];
        }
        return parsedTabs;
      }
    }
    return [{ key: 'home', type: 'home', title: 'Home', permanent: true }];
  });
  
  const [activeTabKey, setActiveTabKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('inbox_activeTabKey');
      if (cached) return cached;
    }
    return 'home';
  });

  // 本地缓存tabs和activeTabKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inbox_tabs', JSON.stringify(tabs));
    }
  }, [tabs]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inbox_activeTabKey', activeTabKey);
    }
  }, [activeTabKey]);

  // 处理URL中的文件ID参数
  useEffect(() => {
    if (fileIdFromUrl) {
      // 直接加载文件内容，不检查标签是否存在
      handleSearch(fileIdFromUrl);
    } else {
      // 当没有文件ID参数时，默认选中home标签
      setActiveTabKey('home');
      setFileContent(null);
      setError(null);
    }
  }, [fileIdFromUrl]); // 只依赖 fileIdFromUrl

  // 修改 handleSearch 函数中的标签创建逻辑
  const handleSearch = useCallback(async (searchFileId?: string) => {
    const idToSearch = searchFileId || fileId;
    if (!idToSearch.trim()) {
      toast.error('Please enter a file ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ApiLibs.content.getContentByUidApiContentUidUidGet(idToSearch);

      if (response.code === ResponseCode.SUCCESS && response.data) {
        const contentData = response.data;
        
        // Convert API response to FileContent format
        let mediaType = LocalContentMediaType.link;
        if (contentData.media_type) {
          const mediaTypeStr = String(contentData.media_type).toLowerCase();
          if (mediaTypeStr.includes('video')) mediaType = LocalContentMediaType.video;
          else if (mediaTypeStr.includes('pdf')) mediaType = LocalContentMediaType.pdf;
          else if (mediaTypeStr.includes('audio') && mediaTypeStr.includes('internal')) mediaType = LocalContentMediaType.audioInternal;
          else if (mediaTypeStr.includes('audio') && mediaTypeStr.includes('microphone')) mediaType = LocalContentMediaType.audioMicrophone;
          else if (mediaTypeStr.includes('audio')) mediaType = LocalContentMediaType.audio;
          else if (mediaTypeStr.includes('word')) mediaType = LocalContentMediaType.word;
          else if (mediaTypeStr.includes('image')) mediaType = LocalContentMediaType.image;
          else if (mediaTypeStr.includes('ppt')) mediaType = LocalContentMediaType.ppt;
          else if (mediaTypeStr.includes('text')) mediaType = LocalContentMediaType.text;
          else if (mediaTypeStr.includes('excel')) mediaType = LocalContentMediaType.excel;
        }

        const subtitles = contentData.media_subtitles?.map(segment => ({
          start: segment.start,
          end: segment.start + (segment.duration || 0),
          text: segment.text
        })) || [];

        const updatedFileContent: FileContent = {
          id: contentData.uid,
          uid: contentData.uid,
          title: contentData.title || 'Untitled',
          media_type: mediaType,
          page_url: contentData.page_url || contentData.source || undefined,
          content: contentData.content || undefined,
          ai_tags: contentData.ai_tags || [],
          created_at: contentData.created_at || new Date().toISOString(),
          updated_at: contentData.created_at || undefined,
          file_url: contentData.file_url === null ? undefined : contentData.file_url,
          video_embed_html: contentData.video_embed_html || undefined,
          media_subtitles: subtitles,
          shownotes: contentData.shownotes || undefined,
          image_ocr: contentData.image_ocr || undefined,
          ai_summary: contentData.ai_summary || undefined,
          ai_structure: contentData.ai_structure || undefined,
          belonged_kbs: contentData.belonged_kbs || [],
          source: contentData.source || undefined,
          owned: contentData.owned
        };

        console.log('[InboxPage] updatedFileContent:', updatedFileContent);

        setFileContent(updatedFileContent);
        
        // 更新标签，确保不会重复，同时保持位置
        setTabs(prev => {
          // 找到要更新的标签的位置
          const existingIndex = prev.findIndex(t => t.id === contentData.uid);
          
          if (existingIndex !== -1) {
            // 如果标签已存在，仅更新该位置的标签内容
            const updatedTabs = [...prev];
            updatedTabs[existingIndex] = {
              ...updatedTabs[existingIndex],
              title: contentData.title || 'Untitled',
              media_type: mediaType
            };
            return updatedTabs;
          } else {
            // 如果是新标签，添加到末尾
            return [...prev, {
              key: contentData.uid,
              type: 'file' as const,
              id: contentData.uid,
              title: contentData.title || 'Untitled',
              media_type: mediaType
            }];
          }
        });

        // 激活标签
        setActiveTabKey(contentData.uid);
        
        // 更新 URL 参数为统一的 fileId
        router.replace(`${pathname}?fileId=${contentData.uid}`);

        setFileId('');
      } else {
        throw new Error(response.message || 'Failed to load file content');
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      setError(error instanceof Error ? error.message : 'Failed to load file content');
      
      if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        // 移除所有相关的标签
        setTabs(prev => prev.filter(t => t.id !== idToSearch));
        // 如果当前标签是被删除的文件，切换到 home
        if (activeTabKey === idToSearch) {
          setActiveTabKey('home');
        }
        
        const event = new CustomEvent('removeInvalidFile', { 
          detail: { fileId: idToSearch } 
        });
        window.dispatchEvent(event);
      }
    } finally {
      setLoading(false);
    }
  }, [fileId, pathname, router]);

  // 修改关闭标签的逻辑
  const closeTab = (key: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.key === key);
      if (tab?.permanent) return prev;

      // 移除所有相同 id 的标签
      const newTabs = prev.filter(t => t.key !== key && t.id !== tab?.id);
      
      // 如果关闭的是当前激活的标签
      if (key === activeTabKey) {
        const newActiveKey = newTabs[newTabs.length - 1]?.key || 'home';
        setActiveTabKey(newActiveKey);
        
        // 更新URL
        if (newActiveKey === 'home') {
          router.replace(pathname);
        } else {
          const newActiveTab = newTabs.find(t => t.key === newActiveKey);
          if (newActiveTab?.id) {
            router.replace(`${pathname}?fileId=${newActiveTab.id}`);
            // 重新加载内容以确保是最新的
            handleSearch(newActiveTab.id);
          }
        }
      }
      
      return newTabs;
    });
  };

  // Tab点击
  const handleTabClick = (key: string) => {
    if (key === activeTabKey) return;

    setActiveTabKey(key);
    const tab = tabs.find(t => t.key === key);
    
    // 更新URL并加载内容
    if (tab?.type === 'file' && tab.id) {
      router.push(`${pathname}?fileId=${tab.id}`);
      // 每次切换到文件标签时都重新加载内容，确保内容是最新的
      handleSearch(tab.id);
    } else if (tab?.type === 'home') {
      router.push(pathname);
      setFileContent(null);
      setError(null);
    }
  };

  // 打开/激活Tab
  const openTab = (tab: TabType) => {
    setTabs(prev => {
      // 如果标签已存在，只激活它
      if (prev.some(t => t.key === tab.key)) {
        handleTabClick(tab.key);
        return prev;
      }
      return [...prev, tab];
    });
    setActiveTabKey(tab.key);
    
    // Update URL
    if (tab.type === 'file' && tab.id) {
      router.push(`${pathname}?fileId=${tab.id}`);
    } else if (tab.type === 'home') {
      router.push(pathname);
    }
  };

  // 处理文件选择
  const handleFileSelect = useCallback(async (selectedFileId: string) => {
    // 如果标签已存在，激活它
    const existingTab = tabs.find(t => t.id === selectedFileId);
    if (existingTab) {
      setActiveTabKey(existingTab.key);
      router.push(`${pathname}?fileId=${selectedFileId}`);
      // 修复：即使标签已存在，也重新加载内容以确保是最新的
      handleSearch(selectedFileId);
      return;
    }

    // 加载文件内容
    try {
      setLoading(true);
      setError(null);

      const response = await ApiLibs.content.getContentByUidApiContentUidUidGet(selectedFileId);

      if (response.code === ResponseCode.SUCCESS && response.data) {
        const contentData = response.data;
        
        // 确定媒体类型
        let mediaType = LocalContentMediaType.link;
        if (contentData.media_type) {
          const mediaTypeStr = String(contentData.media_type).toLowerCase();
          if (mediaTypeStr.includes('video')) mediaType = LocalContentMediaType.video;
          else if (mediaTypeStr.includes('pdf')) mediaType = LocalContentMediaType.pdf;
          else if (mediaTypeStr.includes('audio') && mediaTypeStr.includes('internal')) mediaType = LocalContentMediaType.audioInternal;
          else if (mediaTypeStr.includes('audio') && mediaTypeStr.includes('microphone')) mediaType = LocalContentMediaType.audioMicrophone;
          else if (mediaTypeStr.includes('audio')) mediaType = LocalContentMediaType.audio;
          else if (mediaTypeStr.includes('word')) mediaType = LocalContentMediaType.word;
          else if (mediaTypeStr.includes('image')) mediaType = LocalContentMediaType.image;
          else if (mediaTypeStr.includes('ppt')) mediaType = LocalContentMediaType.ppt;
          else if (mediaTypeStr.includes('text')) mediaType = LocalContentMediaType.text;
          else if (mediaTypeStr.includes('excel')) mediaType = LocalContentMediaType.excel;
        }

        // 创建新标签
        const newTab: TabType = {
          key: selectedFileId, // 统一用uid作为key
          type: 'file',
          id: selectedFileId,
          title: contentData.title || 'Untitled',
          media_type: mediaType
        };

        // 添加标签并激活
        setTabs(prev => [...prev, newTab]);
        setActiveTabKey(selectedFileId); // 统一用uid

        // 更新URL
        router.push(`${pathname}?fileId=${selectedFileId}`);

        // 更新文件内容
        setFileContent({
          id: contentData.uid || '',
          uid: contentData.uid || "",
          title: contentData.title || 'Untitled',
          media_type: mediaType,
          page_url: contentData.page_url || contentData.source || undefined,
          content: contentData.content || undefined,
          ai_tags: contentData.ai_tags || [],
          created_at: contentData.created_at || new Date().toISOString(),
          updated_at: contentData.created_at || undefined,
          file_url: contentData.file_url === null ? undefined : contentData.file_url,
          video_embed_html: contentData.video_embed_html || undefined,
          media_subtitles: contentData.media_subtitles?.map(segment => ({
            start: segment.start,
            end: segment.start + (segment.duration || 0),
            text: segment.text
          })) || [],
          shownotes: contentData.shownotes || undefined,
          image_ocr: contentData.image_ocr || undefined,
          ai_summary: contentData.ai_summary || undefined,
          ai_structure: contentData.ai_structure || undefined,
          belonged_kbs: contentData.belonged_kbs || [],
          source: contentData.source || undefined,
          owned: contentData.owned || false
        });
      } else {
        // 当找不到文件时，发出事件通知侧边栏删除该文件
        const errorMessage = response.message || 'Failed to load file content';
        
        if (response.code === ResponseCode.FILE_NOT_FOUND || errorMessage.toLowerCase().includes('not found')) {
          // 关闭相关标签（如果存在）
          const existingTab = tabs.find(t => t.id === selectedFileId);
          if (existingTab) {
            closeTab(existingTab.key);
          }
          
          // 发出自定义事件，通知侧边栏删除文件
          const event = new CustomEvent('removeInvalidFile', { 
            detail: { fileId: selectedFileId } 
          });
          window.dispatchEvent(event);
          
          // 显示友好的错误消息
          toast.error('File not found. It has been removed from your list.');
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error loading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to load file');
      toast.error('Failed to load file content');
    } finally {
      setLoading(false);
    }
  }, [pathname, router, tabs, closeTab]);

  const [rightPanelWidth, setRightPanelWidth] = useState(400); // 默认AI工具区宽度
  const [isDragging, setIsDragging] = useState(false);

  // 处理拖拽逻辑
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.getElementById('file-detail-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    // Increase maximum draggable range to 800px from 600px
    // Decrease minimum to 200px from 280px for more flexibility
    const newWidth = Math.max(200, Math.min(800, containerRect.right - e.clientX));
    setRightPanelWidth(newWidth);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* 顶部Tab栏 */}
      <div className="flex items-center h-12 bg-white border-b px-2">
        {/* Tab栏左侧的收起/展开按钮 */}
        <div
          className={`
            relative flex items-center px-4 h-8 rounded-md cursor-pointer
            transition-all duration-150 my-1 mr-2
            ${isFilesSidebarOpen
              ? 'bg-white shadow text-primary'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}
          `}
          onClick={() => setIsFilesSidebarOpen(!isFilesSidebarOpen)}
        >
          <Image
            src={isFilesSidebarOpen ? '/icon/sidebar-expand.svg' : '/icon/sidebar-collapse.svg'}
            alt={isFilesSidebarOpen ? 'Collapse' : 'Expand'}
            width={20}
            height={20}
            className="text-black"
          />
        </div>
        
        <div className="flex-1 overflow-x-auto scrollbar-hide">
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
                {tab.type === 'home' ? (
                  <Home className="w-4 h-4 mr-1" />
                ) : (
                  <Image 
                    src={getItemIcon(tab.media_type || LocalContentMediaType.link)} 
                    alt={tab.type} 
                    width={16}
                    height={16}
                    className="mr-1" 
                  />
                )}
                <span className="truncate">{tab.title}</span>
                {!tab.permanent && (
                  <button
                    className="ml-2 text-xs text-muted-foreground hover:text-destructive transition"
                    style={{ fontSize: '12px' }}
                    onClick={e => { e.stopPropagation(); closeTab(tab.key); }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 下方内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 文件侧边栏 */}
        {isFilesSidebarOpen && (
          <div className="w-60 border-r bg-background flex-shrink-0">
            <FilesSidebar 
              onFileSelect={handleFileSelect}
              externalActiveTab={fileContent && fileContent.owned === false ? 'shared' : undefined}
              externalSharedFileToRecord={fileContent && fileContent.owned === false ? {
                id: String(fileContent.uid || fileContent.id || ''),
                uid: fileContent.uid,
                title: fileContent.title || 'Untitled',
                media_type: fileContent.media_type as ContentMediaType,
                created_at: fileContent.created_at || new Date().toISOString(),
                updated_at: fileContent.updated_at,
                owned: fileContent.owned || false
              } : undefined}
            />
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <div className="text-destructive text-lg font-semibold mb-2">Error</div>
                <p className="text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setError(null);
                    setActiveTabKey('home');
                    setFileContent(null);
                    router.push(pathname);
                  }}
                >
                  Return to Home
                </Button>
              </div>
            </div>
          ) : (
            tabs.map(tab => {
              if (tab.key !== activeTabKey) return null;

              if (tab.type === 'home') {
                return (
                  <div key={tab.key} className="h-full overflow-auto p-8">
                    <div className="max-w-2xl mx-auto">
                      <h1 className="text-2xl font-semibold tracking-tight mb-8">Inbox Home</h1>
                      <div className="space-y-8">
                        {/* Quick Access Section */}
                        <div className="space-y-4">
                          <h2 className="text-lg font-medium tracking-tight">Quick Access</h2>
                          <div className="relative">
                            <Input
                              placeholder="Enter file ID..."
                              value={fileId}
                              onChange={(e) => setFileId(e.target.value)}
                              className="w-full h-10 pl-10 pr-4 text-base bg-accent/50 rounded-lg outline-none placeholder:text-muted-foreground"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSearch();
                                }
                              }}
                            />
                            <Search className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Button 
                              onClick={() => handleSearch()}
                              disabled={loading || !fileId.trim()}
                              className="w-full"
                            >
                              {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              ) : (
                                <Search className="h-5 w-5 mr-2" />
                              )}
                              <span>View File</span>
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setImportDialogOpen(true)}
                            >
                              Import New Files
                            </Button>
                          </div>
                        </div>

                        {/* Recent Activity Section */}
                        {/* <div className="space-y-4">
                          <h2 className="text-lg font-medium tracking-tight">Recent Activity</h2>
                          <div className="grid gap-4">
                            {files.slice(0, 3).map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg hover:bg-accent transition cursor-pointer"
                                onClick={() => handleSearch(file.id)}
                              >
                                <div className="flex-shrink-0">
                                  <Image
                                    src={getItemIcon(file.media_type)}
                                    alt={file.media_type}
                                    width={24}
                                    height={24}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium truncate">{file.title}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(file.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div> */}

                        {/* Quick Stats Section
                        <div className="space-y-4">
                          <h2 className="text-lg font-medium tracking-tight">Quick Stats</h2>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-accent/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Total Files</p>
                              <p className="text-2xl font-semibold">{files.length}</p>
                            </div>
                            <div className="p-4 bg-accent/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Shared Files</p>
                              <p className="text-2xl font-semibold">{sharedFiles.length}</p>
                            </div>
                            <div className="p-4 bg-accent/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Recent Files</p>
                              <p className="text-2xl font-semibold">
                                {files.filter(f => {
                                  const date = new Date(f.created_at);
                                  const now = new Date();
                                  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
                                  return daysDiff <= 7;
                                }).length}
                              </p>
                            </div>
                          </div>
                        </div> */}

                        {/* Import Dialog */}
                        <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={tab.key} className="h-full overflow-hidden">
                  <div id="file-detail-container" className="flex h-full relative">
                    {/* 左侧文件内容区 */}
                    <div className="flex-1 min-w-0 h-full overflow-auto">
                      <FileContentViewer
                        fileContent={fileContent}
                        loading={loading}
                        error={error}
                      />
                    </div>

                    {/* 拖拽把手 */}
                    <div
                      className="group cursor-col-resize relative"
                      style={{ 
                        width: '4px', 
                        margin: '0 -2px', 
                        zIndex: 10
                      }}
                      onMouseDown={handleDragStart}
                    >
                      {/* Thin visible line that doesn't expand on hover */}
                      <div className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-200 ${isDragging ? 'bg-primary' : ''}`}></div>
                      
                      {/* Grip icon visible on hover */}
                      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-1 rounded-sm bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? 'opacity-100' : ''}`}>
                        <GripVertical className="h-3 w-3 text-gray-500" />
                      </div>
                    </div>

                    {/* 右侧AI工具区 */}
                    <div 
                      className="h-[calc(100vh-3rem)] p-2 overflow-hidden"
                      style={{ width: `${rightPanelWidth}px` }}
                    >
                      <div className="h-full w-full">
                        <AITools
                          fileContent={fileContent}
                          loading={loading}
                          width="100%"
                          height="100%"
                        />
                      </div>
                    </div>

                    {/* 拖拽时的遮罩层 */}
                    {isDragging && (
                      <div className="fixed inset-0 z-50 cursor-col-resize" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}