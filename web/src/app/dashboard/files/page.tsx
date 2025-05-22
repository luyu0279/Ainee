"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  FileText,
  SortAsc,
  SortDesc,
  Edit,
  Trash,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ApiLibs from "@/lib/ApiLibs";
import { ResponseCode } from "@/apis/models/ResponseCode";
import { useRouter } from 'next/navigation';
import { ImportDialog } from "@/components/import/ImportDialog";

// 媒体类型枚举 - 本地使用
enum ContentMediaType {
  video = 'video',
  pdf = 'pdf',
  audio = 'audio',
  word = 'word',
  audioInternal = 'audioInternal',
  audioMicrophone = 'audioMicrophone',
  image = 'image',
  ppt = 'ppt',
  text = 'text',
  excel = 'excel',
  link = 'link'
}

// 获取文件图标函数
const getItemIcon = (mediaType?: ContentMediaType) => {
  switch (mediaType) {
    case ContentMediaType.video:
      return '/icon/icon_file_video.png';
    case ContentMediaType.pdf:
      return '/icon/icon_pdf_add.png';
    case ContentMediaType.audio:
      return '/icon/icon_item_voice.png';
    case ContentMediaType.word:
      return '/icon/icon_item_word.png';
    case ContentMediaType.audioInternal:
      return '/icon/icon_recording_audio.png';
    case ContentMediaType.audioMicrophone:
      return '/icon/icon_recording_mic.png';
    case ContentMediaType.image:
      return '/icon/icon_item_image.png';
    case ContentMediaType.ppt:
      return '/icon/icon_item_ppt.png';
    case ContentMediaType.text:
      return '/icon/icon_item_txt.png';
    case ContentMediaType.excel:
      return '/icon/icon_item_xls.png';
    default:
      return '/icon/icon_link.png';
  }
};

// 文件接口定义
interface FileItem {
  id: string | number;
  title: string;
  media_type: ContentMediaType;
  created_at: string;
  last_accessed?: string;
  uid?: string;
  timestamp?: number; // 添加时间戳字段用于排序共享历史
}

export default function FilesPage() {
  const [isFileListExpanded, setIsFileListExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<ContentMediaType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 添加状态管理
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // 新增：添加文件列表选项卡状态
  const [activeTab, setActiveTab] = useState<'my-files' | 'shared'>('my-files');
  // 新增：共享文件列表
  const [sharedFiles, setSharedFiles] = useState<FileItem[]>([]);
  const [filteredSharedFiles, setFilteredSharedFiles] = useState<FileItem[]>([]);
  
  // Import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const router = useRouter();

  // 加载共享文件历史
  const loadSharedFilesHistory = useCallback(() => {
    try {
      const request = window.indexedDB.open("AineeAppDB", 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(["sharedFilesHistory"], "readonly");
        const objectStore = transaction.objectStore("sharedFilesHistory");
        const getAllRequest = objectStore.getAll();
        
        getAllRequest.onsuccess = () => {
          const sharedFilesData = getAllRequest.result || [];
          console.log(`加载了 ${sharedFilesData.length} 个共享文件记录`);
          
          // 按时间戳排序，最新访问的排在前面
          const sortedFiles = sharedFilesData.sort((a, b) => 
            (b.timestamp || 0) - (a.timestamp || 0)
          ) as FileItem[];
          
          setSharedFiles(sortedFiles);
          setFilteredSharedFiles(sortedFiles);
        };
        
        getAllRequest.onerror = (error) => {
          console.error("加载共享文件历史失败:", error);
          setSharedFiles([]);
          setFilteredSharedFiles([]);
        };
      };
      
      request.onerror = (error) => {
        console.error("打开数据库失败:", error);
        setSharedFiles([]);
        setFilteredSharedFiles([]);
      };
    } catch (error) {
      console.error("加载共享文件历史时出错:", error);
      setSharedFiles([]);
      setFilteredSharedFiles([]);
    }
  }, [setSharedFiles, setFilteredSharedFiles]);

  // 封装API请求获取用户文件
  const fetchUserContents = useCallback(async (cursor?: string | null) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (activeTab === 'shared') {
        // 如果是共享标签，直接从IndexedDB加载
        loadSharedFilesHistory();
        setIsLoading(false);
        return;
      }
      
      const response = await ApiLibs.content.getUserContentsApiContentUserContentsGet(cursor);
      
      if (response.code === 'SUCCESS' && response.data) {
        const newFiles = response.data.contents.map((content) => {
          const mediaType = content.media_type ? 
            (content.media_type.toLowerCase().includes('video') ? ContentMediaType.video :
            content.media_type.toLowerCase().includes('pdf') ? ContentMediaType.pdf :
            content.media_type.toLowerCase().includes('audio') && content.media_type.toLowerCase().includes('internal') ? ContentMediaType.audioInternal :
            content.media_type.toLowerCase().includes('audio') && content.media_type.toLowerCase().includes('microphone') ? ContentMediaType.audioMicrophone :
            content.media_type.toLowerCase().includes('audio') ? ContentMediaType.audio :
            content.media_type.toLowerCase().includes('word') ? ContentMediaType.word :
            content.media_type.toLowerCase().includes('image') ? ContentMediaType.image :
            content.media_type.toLowerCase().includes('ppt') ? ContentMediaType.ppt :
            content.media_type.toLowerCase().includes('text') ? ContentMediaType.text :
            content.media_type.toLowerCase().includes('excel') ? ContentMediaType.excel :
            ContentMediaType.link) : ContentMediaType.link;
          
          return {
            id: content.uid || '',
            uid: content.uid,
            title: content.title || 'Untitled',
            media_type: mediaType,
            created_at: content.created_at || new Date().toISOString(),
            owned: content.owned || false
          } as FileItem;
        });
        
        if (cursor) {
          setFiles(prev => [...prev, ...newFiles]);
        } else {
          setFiles(newFiles);
        }
        
        // 使用收到的新文件应用过滤器
        setHasNext(!!response.data.next_cursor);
        setNextCursor(response.data.next_cursor || null);
      } else {
        setError(response.message || '加载文件失败');
      }
    } catch (error) {
      console.error('加载文件出错:', error);
      setError('加载文件失败');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, loadSharedFilesHistory, setFiles, setError, setIsLoading, setHasNext, setNextCursor]);

  // 初始加载
  useEffect(() => {
    fetchUserContents();
  }, []);

  // 文件过滤和排序逻辑
  useEffect(() => {
    let result = [...files];
    
    // 搜索过滤
    if (searchTerm) {
      result = result.filter(file => 
        file.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 媒体类型过滤
    if (mediaTypeFilter) {
      result = result.filter(file => file.media_type === mediaTypeFilter);
    }
    
    // 排序
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    setFilteredFiles(result);
  }, [files, searchTerm, mediaTypeFilter, sortOrder]);

  // 新增：同样为共享文件列表添加过滤和排序逻辑
  useEffect(() => {
    let result = [...sharedFiles];
    
    // 搜索过滤
    if (searchTerm) {
      result = result.filter(file => 
        file.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 媒体类型过滤
    if (mediaTypeFilter) {
      result = result.filter(file => file.media_type === mediaTypeFilter);
    }
    
    // 排序
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    setFilteredSharedFiles(result);
  }, [sharedFiles, searchTerm, mediaTypeFilter, sortOrder]);

  // 加载更多文件
  const handleLoadMore = () => {
    if (hasNext && nextCursor) {
      fetchUserContents(nextCursor);
    }
  };

  // 刷新文件列表 - 使用useCallback进行优化
  const refreshFiles = useCallback(() => {
    toast.info("Refreshing file list...");
    fetchUserContents(); // 不传递cursor参数，从头开始加载
  }, [fetchUserContents]);

  // 新增：初始化 IndexedDB
  useEffect(() => {
    const initIndexedDB = async () => {
      // 检查浏览器是否支持 IndexedDB
      if (!window.indexedDB) {
        console.error("Your browser doesn't support IndexedDB");
        return;
      }
      
      try {
        // 打开数据库，如果不存在则创建
        const request = window.indexedDB.open("AineeAppDB", 1);
        
        request.onerror = (event) => {
          console.error("IndexedDB error:", event);
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // 创建存储浏览历史的对象存储
          if (!db.objectStoreNames.contains("sharedFilesHistory")) {
            const objectStore = db.createObjectStore("sharedFilesHistory", { keyPath: "id" });
            objectStore.createIndex("timestamp", "timestamp", { unique: false });
          }
        };
        
        request.onsuccess = () => {
          console.log("IndexedDB initialized successfully");
          // 初始化完成后加载共享文件历史
          loadSharedFilesHistory();
        };
      } catch (error) {
        console.error("Error initializing IndexedDB:", error);
      }
    };
    
    initIndexedDB();
  }, []);

  // 添加一个useEffect确保在activeTab变化时重新加载共享文件
  useEffect(() => {
    if (activeTab === 'shared') {
      loadSharedFilesHistory();
    }
  }, [activeTab]);

  // Handle import button click
  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  // 监听导入成功事件，自动刷新文件列表
  useEffect(() => {
    // 导入成功时自动刷新文件列表的处理函数
    const handleImportSuccess = () => {
      // 如果当前在"我的文件"标签，则刷新文件列表
      if (activeTab === 'my-files') {
        refreshFiles();
      }
    };

    // 添加事件监听器
    window.addEventListener('ainee:import:success', handleImportSuccess);

    // 组件卸载时移除事件监听器
    return () => {
      window.removeEventListener('ainee:import:success', handleImportSuccess);
    };
  }, [activeTab, refreshFiles]); // 添加activeTab和refreshFiles作为依赖项

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} /> */}
      
      {/* Import Dialog - 移至最外层确保任何按钮都能打开 */}
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
      
      {/* 文件列表区域 */}
      <div className={`border-r bg-card flex flex-col ${isFileListExpanded ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out`}>
        {/* 文件列表头部 */}
        <div className="p-3 border-b flex flex-col gap-2">
          {isFileListExpanded && (
            <>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setIsFileListExpanded(false)}
                >
                  <img src="/icon/sidebar-expand.svg" alt="Collapse" className="h-5 w-5" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-8 text-xs justify-start"
                onClick={handleImportClick}
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Import New
              </Button>
              
              {/* 添加文件列表选项卡 */}
              <div className="flex border-b mt-2">
                <button
                  className={`pb-2 px-3 text-xs font-medium ${activeTab === 'my-files' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveTab('my-files')}
                >
                  My Files
                </button>
                <button
                  className={`pb-2 px-3 text-xs font-medium ${activeTab === 'shared' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveTab('shared')}
                >
                  Shared
                </button>
              </div>
            </>
          )}
          
          {!isFileListExpanded && (
            <div className="flex flex-col items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setIsFileListExpanded(true)}
              >
                <img src="/icon/sidebar-collapse.svg" alt="Expand" className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleImportClick}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        
        {/* 文件列表内容 */}
        <div className="flex-1 overflow-auto">
          {isFileListExpanded && (
            <div className="pt-0 px-3 pb-3">
              <div className="sticky top-0 z-10 bg-card pt-1 pb-2 flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium">{activeTab === 'my-files' ? 'My Files' : 'Shared Files'}</h3>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* 添加刷新按钮 */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={refreshFiles}
                    title="Refresh file list"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={sortOrder === 'asc' ? "Sort Descending" : "Sort Ascending"}
                  >
                    {sortOrder === 'asc' ? 
                      <SortAsc className="h-3 w-3" /> : 
                      <SortDesc className="h-3 w-3" />
                    }
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button 
                        variant={mediaTypeFilter !== null ? "secondary" : "ghost"} 
                        size="icon" 
                        className={`h-6 w-6 ${mediaTypeFilter !== null ? "bg-primary/20" : ""}`}
                        title={mediaTypeFilter !== null ? `Filtered by: ${mediaTypeFilter}` : "Filter by Type"}
                      >
                        <Filter className={`h-3 w-3 ${mediaTypeFilter !== null ? "text-primary" : ""}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs font-normal">Filter by Type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        className="text-xs flex items-center justify-between"
                        onClick={() => setMediaTypeFilter(null)}
                      >
                        <span>All Files</span>
                        {mediaTypeFilter === null && <Check className="h-3 w-3 ml-2" />}
                      </DropdownMenuItem>
                      
                      {Object.values(ContentMediaType).map((type) => (
                        <DropdownMenuItem 
                          key={type} 
                          className="text-xs flex items-center justify-between"
                          onClick={() => setMediaTypeFilter(type as ContentMediaType)}
                        >
                          <div className="flex items-center">
                            <Image 
                              src={getItemIcon(type as ContentMediaType)} 
                              alt={type} 
                              width={14} 
                              height={14} 
                              className="mr-2"
                            />
                            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                          </div>
                          {mediaTypeFilter === type && <Check className="h-3 w-3 ml-2" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="space-y-1">
                {isLoading && files.length === 0 ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="text-xs text-center py-4 text-destructive">
                    {error}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2 h-6"
                      onClick={() => fetchUserContents()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (activeTab === 'my-files' ? filteredFiles.length === 0 : filteredSharedFiles.length === 0) ? (
                  <div className="text-xs text-center py-4 text-muted-foreground">
                    No files found.
                  </div>
                ) : (
                  // 显示文件列表，根据选项卡切换显示的文件
                  (activeTab === 'my-files' ? filteredFiles : filteredSharedFiles).map((file) => (
                    <Link 
                      key={file.id} 
                      href={`/dashboard/file-details/${file.uid || file.id}`} 
                      className="flex items-center p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => {
                        // 记录当前点击发生在哪个标签页
                        if (activeTab === 'shared') {
                          console.log(`点击共享文件: ${file.title} (ID: ${file.id})`);
                        } else {
                          console.log(`点击我的文件: ${file.title} (ID: ${file.id})`);
                        }
                      }}
                    >
                      <Image 
                        src={getItemIcon(file.media_type)} 
                        alt={String(file.media_type)} 
                        width={16} 
                        height={16} 
                        className="mr-2 flex-shrink-0"
                      />
                      <span className="text-xs truncate flex-1">{file.title}</span>
                    </Link>
                  ))
                )}
                
                {activeTab === 'my-files' && hasNext && (
                  <div className="flex justify-center pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 收起状态下的文件列表 */}
          {!isFileListExpanded && (
            <>
              <div className="flex flex-col items-center py-3 space-y-3 overflow-y-auto max-h-full">
                {isLoading && files.length === 0 ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : filteredFiles.map((file) => (
                  <Button 
                    key={file.id}
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0 tooltip-trigger"
                    title={file.title}
                    onClick={() => router.push(`/dashboard/file-details/${file.uid || file.id}`)}
                  >
                    <Image 
                      src={getItemIcon(file.media_type)} 
                      alt={String(file.media_type)} 
                      width={16} 
                      height={16} 
                    />
                  </Button>
                ))}
              </div>
              
              {/* 尝试优化原生title的延迟 */}
              <style jsx global>{`
                .tooltip-trigger {
                  position: relative;
                }
                .tooltip-trigger:hover::before {
                  content: "";
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                }
              `}</style>
            </>
          )}
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <div className="h-14 border-b flex items-center px-6">
          <h1 className="text-xl font-semibold">Files</h1>
        </div>
        
        {/* 主要内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Import New 按钮 */}
          <div className="flex justify-between items-center">
            <Button className="gap-2" onClick={handleImportClick}>
              <Plus className="h-4 w-4" /> Import New
            </Button>
          </div>
          
          {/* 最近交互文件 */}
          <section>
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Recently Interacted</h2>
            
            {isLoading && recentFiles.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-sm text-center py-8 text-destructive">
                {error}
                <Button 
                  variant="ghost" 
                  className="ml-2"
                  onClick={() => fetchUserContents()}
                >
                  Retry
                </Button>
              </div>
            ) : recentFiles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-base text-muted-foreground mb-3">No recent files found.</p>
                  <p className="text-sm text-muted-foreground mb-4">Import files to see them here.</p>
                  <Button onClick={handleImportClick}>
                    <Plus className="mr-2 h-4 w-4" /> Import Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {recentFiles.map((file) => (
                  <Link href={`/dashboard/file-details/${file.uid || file.id}`} key={file.id}>
                    <Card className="overflow-hidden hover:shadow-sm transition-shadow cursor-pointer">
                      <CardHeader className="p-3 pb-1 flex flex-row items-start justify-between space-y-0">
                        <CardTitle className="text-base font-medium truncate leading-tight" title={file.title}>
                          {file.title}
                        </CardTitle>
                        <Image 
                          src={getItemIcon(file.media_type)} 
                          alt={String(file.media_type)} 
                          width={16} 
                          height={16} 
                          className="flex-shrink-0 ml-1"
                        />
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xs text-muted-foreground">Last accessed: {file.last_accessed}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// 临时组件用于显示选中标记
const Check = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
); 