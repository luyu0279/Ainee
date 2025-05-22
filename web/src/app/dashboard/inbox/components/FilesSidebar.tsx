"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Filter, SortAsc, SortDesc, Loader2, Check, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ApiLibs from "@/lib/ApiLibs";
import { ResponseCode } from "@/apis/models/ResponseCode";
import { toast } from "sonner";
import { ContentMediaType } from "@/types/fileTypes";
import type { ContentResponse } from "@/apis/models/ContentResponse";
import { getItemIcon } from "@/utils/fileUtils";
import { ImportDialog } from "@/components/import/ImportDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { UploadStatusButton } from "@/components/upload/UploadStatusButton";
import { useFileUpload } from "@/contexts/FileUploadContext";

interface FileItem {
  id: string;
  uid?: string;
  title: string;
  media_type: ContentMediaType;
  created_at: string;
  updated_at?: string;
  owned: boolean;
  timestamp?: number; // Add timestamp for sorting shared history
}

interface FilesSidebarProps {
  onFileSelect?: (fileId: string) => void;
  externalActiveTab?: 'my-files' | 'shared';
  externalSharedFileToRecord?: FileItem | null;
}

const FileItemSkeleton = () => (
  <div className="flex items-center gap-2 p-2">
    <Skeleton className="h-4 w-4 rounded" />
    <Skeleton className="h-4 flex-1 rounded" />
  </div>
);

export default function FilesSidebar({ onFileSelect, externalActiveTab, externalSharedFileToRecord }: FilesSidebarProps) {
  const router = useRouter();
  const { uploads, cancelUpload, setOnUploadSuccess } = useFileUpload();
  // State for file list
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileItem[]>([]);
  const [filteredSharedFiles, setFilteredSharedFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-files' | 'shared'>('my-files');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaTypeFilters, setMediaTypeFilters] = useState<Set<ContentMediaType>>(
    new Set(Object.values(ContentMediaType))
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number>(300);

  // Memoize fetchUserContents to prevent recreation on every render
  const fetchUserContents = useCallback(async (cursor?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await ApiLibs.content.getUserContentsApiContentUserContentsGet(cursor);

      if (response.code === ResponseCode.SUCCESS && response.data) {
        const newFiles = response.data.contents.map((content: ContentResponse) => {
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
            updated_at: content.created_at || undefined,
            owned: content.owned || false
          } as FileItem;
        });

        if (cursor) {
          if (activeTab === 'my-files') {
            setFiles(prev => [...prev, ...newFiles.filter(file => file.owned)]);
            setSharedFiles(prev => [...prev, ...newFiles.filter(file => !file.owned)]);
          } else {
            // shared tab 下不 setSharedFiles
          }
        } else {
          setFiles(newFiles.filter(file => file.owned));
          if (activeTab === 'my-files') {
            setSharedFiles(newFiles.filter(file => !file.owned));
          } // shared tab 下不 setSharedFiles
        }

        setHasNext(!!response.data.next_cursor);
        setNextCursor(response.data.next_cursor || null);
      } else {
        setError(response.message || 'Failed to load files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, setFiles, setSharedFiles, setHasNext, setNextCursor, setError, setIsLoading]);


  // Set up upload success callback
  useEffect(() => {
    setOnUploadSuccess(fetchUserContents);
  }, [fetchUserContents, setOnUploadSuccess]);

  // Calculate dropdown max height based on button position
  const updateDropdownMaxHeight = () => {
    if (filterButtonRef.current) {
      const buttonRect = filterButtonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - buttonRect.bottom - 20; // 20px padding
      const spaceAbove = buttonRect.top - 20;
      const maxHeight = Math.max(spaceBelow, spaceAbove);
      setDropdownMaxHeight(maxHeight);
    }
  };

  useEffect(() => {
    updateDropdownMaxHeight();
    window.addEventListener('resize', updateDropdownMaxHeight);
    return () => window.removeEventListener('resize', updateDropdownMaxHeight);
  }, []);

  // Handle media type filter changes
  const toggleMediaTypeFilter = (type: ContentMediaType) => {
    setMediaTypeFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  // Toggle all filters
  const toggleAllFilters = () => {
    if (mediaTypeFilters.size === Object.values(ContentMediaType).length) {
      setMediaTypeFilters(new Set());
    } else {
      setMediaTypeFilters(new Set(Object.values(ContentMediaType)));
    }
  };

  // Fetch files - using useCallback for optimization

  // Load more files
  const handleLoadMore = () => {
    if (hasNext && nextCursor) {
      fetchUserContents(nextCursor);
    }
  };

  // Update filtered files when filters change
  useEffect(() => {
    let filtered = [...files];
    let filteredShared = [...sharedFiles];
    // console.log('[DEBUG] sharedFiles before filter:', filteredShared);

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      filteredShared = filteredShared.filter(file =>
        file.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      // console.log('[DEBUG] filteredShared after searchTerm:', filteredShared);
    }

    // Apply media type filters
    if (mediaTypeFilters.size < Object.values(ContentMediaType).length) {
      filtered = filtered.filter(file => mediaTypeFilters.has(file.media_type));
      filteredShared = filteredShared.filter(file => mediaTypeFilters.has(file.media_type));
      // console.log('[DEBUG] filteredShared after mediaTypeFilters:', filteredShared);
    }

    // Apply sort
    const sortFiles = (a: FileItem, b: FileItem) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    };

    filtered.sort(sortFiles);
    filteredShared.sort(sortFiles);

    setFilteredFiles(filtered);
    setFilteredSharedFiles(filteredShared);
    // console.log('[DEBUG] filteredShared after sort:', filteredShared);
  }, [files, sharedFiles, searchTerm, mediaTypeFilters, sortOrder]);

  // Initial fetch
  useEffect(() => {
    fetchUserContents();
  }, [fetchUserContents]);

  // Initialize IndexedDB
  useEffect(() => {
    const initIndexedDB = async () => {
      if (!window.indexedDB) {
        console.error("Your browser doesn't support IndexedDB");
        return;
      }

      try {
        const request = window.indexedDB.open("AineeAppDB", 1);

        request.onerror = (event) => {
          console.error("IndexedDB error:", event);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create object store for shared files history if it doesn't exist
          if (!db.objectStoreNames.contains("sharedFilesHistory")) {
            const objectStore = db.createObjectStore("sharedFilesHistory", { keyPath: "id" });
            objectStore.createIndex("timestamp", "timestamp", { unique: false });
          }
        };

        request.onsuccess = () => {
          console.log("IndexedDB initialized successfully");
          // Load shared files history after initialization
          loadSharedFilesHistory();
        };
      } catch (error) {
        console.error("Error initializing IndexedDB:", error);
      }
    };

    initIndexedDB();
  }, []);

  // Load shared files history from IndexedDB - using useCallback
  const loadSharedFilesHistory = useCallback(() => {
    // console.log('[DEBUG] loadSharedFilesHistory called');
    try {
      const request = window.indexedDB.open("AineeAppDB", 1);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(["sharedFilesHistory"], "readonly");
        const objectStore = transaction.objectStore("sharedFilesHistory");
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = () => {
          const sharedFilesData = getAllRequest.result || [];
          // console.log(`[DEBUG] Loaded ${sharedFilesData.length} shared file records`, sharedFilesData);

          // Sort by timestamp, most recent first
          const sortedFiles = sharedFilesData.sort((a, b) =>
            (b.timestamp || 0) - (a.timestamp || 0)
          ) as FileItem[];

          setSharedFiles(sortedFiles);
          setFilteredSharedFiles(sortedFiles);
        };

        getAllRequest.onerror = (error) => {
          console.error("Failed to load shared files history:", error);
          setSharedFiles([]);
          setFilteredSharedFiles([]);
        };
      };

      request.onerror = (error) => {
        console.error("Failed to open database:", error);
        setSharedFiles([]);
        setFilteredSharedFiles([]);
      };
    } catch (error) {
      console.error("Error loading shared files history:", error);
      setSharedFiles([]);
      setFilteredSharedFiles([]);
    }
  }, [setSharedFiles, setFilteredSharedFiles]);

  // 新增：记录共享文件访问到IndexedDB
  const recordSharedFileVisit = (file: FileItem) => {
    if (!file || !file.id || file.owned) return;
    try {
      const request = window.indexedDB.open("AineeAppDB", 1);
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(["sharedFilesHistory"], "readwrite");
        const objectStore = transaction.objectStore("sharedFilesHistory");
        const getRequest = objectStore.get(file.id);
        getRequest.onsuccess = () => {
          const fileToSave = {
            id: file.id,
            uid: file.uid,
            title: file.title,
            media_type: file.media_type,
            created_at: file.created_at,
            timestamp: Date.now(),
          };
          objectStore.put(fileToSave);
        };
        transaction.oncomplete = () => {
          // 可选：刷新本地sharedFiles列表
          // loadSharedFilesHistory();
        };
      };
      request.onerror = (error) => {
        console.error("记录共享文件访问出错:", error);
      };
    } catch (error) {
      console.error("记录共享文件访问时出错:", error);
    }
  };

  // Add file to shared history when selected
  const handleFileClick = (file: FileItem) => {
    // 新增：在shared tab且非owned文件时记录访客浏览
    if (activeTab === 'shared' && !file.owned) {
      recordSharedFileVisit(file);
    }
    if (onFileSelect) {
      onFileSelect(file.uid || file.id);
    }
  };

  // Load shared files when tab changes
  useEffect(() => {
    if (activeTab === 'shared') {
      // console.log('[DEBUG] activeTab changed to shared, calling loadSharedFilesHistory');
      loadSharedFilesHistory();
    }
  }, [activeTab]);

  const handleImportClick = () => setIsImportDialogOpen(true);

  // 添加事件监听器来处理无效文件的删除
  useEffect(() => {
    const handleRemoveInvalidFile = (event: CustomEvent<{ fileId: string }>) => {
      const fileId = event.detail.fileId;

      // 从文件列表中删除
      setFiles(prev => prev.filter(file => file.id !== fileId && file.uid !== fileId));
      setFilteredFiles(prev => prev.filter(file => file.id !== fileId && file.uid !== fileId));

      // 从共享文件列表中删除
      setSharedFiles(prev => prev.filter(file => file.id !== fileId && file.uid !== fileId));
      setFilteredSharedFiles(prev => prev.filter(file => file.id !== fileId && file.uid !== fileId));

      // 如果文件在IndexedDB中，也需要删除
      try {
        const request = window.indexedDB.open("AineeAppDB", 1);
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(["sharedFilesHistory"], "readwrite");
          const objectStore = transaction.objectStore("sharedFilesHistory");
          objectStore.delete(fileId);
        };
      } catch (error) {
        console.error("Error removing file from IndexedDB:", error);
      }
    };

    // 添加事件监听器
    window.addEventListener('removeInvalidFile', handleRemoveInvalidFile as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('removeInvalidFile', handleRemoveInvalidFile as EventListener);
    };
  }, []);

  // 添加刷新文件列表的函数 - 使用useCallback进行优化
  const refreshFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchUserContents();
      if (activeTab === 'shared') {
        loadSharedFilesHistory();
      }
      toast.success("File list refreshed");
    } catch (error) {
      console.error('Error refreshing files:', error);
      setError('Failed to refresh files');
      toast.error('Failed to refresh files');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, fetchUserContents, loadSharedFilesHistory, setError, setIsLoading]);

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
  }, [activeTab, refreshFiles]); // 添加refreshFiles作为依赖项

  // 响应外部tab切换
  useEffect(() => {
    if (externalActiveTab && externalActiveTab !== activeTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // 响应外部要求写入共享文件
  useEffect(() => {
    if (externalSharedFileToRecord && !externalSharedFileToRecord.owned) {
      recordSharedFileVisit(externalSharedFileToRecord);
    }
  }, [externalSharedFileToRecord]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Search and Import Section */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-8"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 flex items-center gap-2 bg-white text-xs h-8"
            onClick={handleImportClick}
          >
            <span className="text-xs">+</span>
            Import New
          </Button>

          <div className="relative">
            <UploadStatusButton
              uploads={uploads}
              onCancelUpload={cancelUpload}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex items-center justify-between px-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('my-files')}
              className={`py-2 w-12 text-center text-xs font-medium border-b-2 -mb-px ${
                activeTab === 'my-files'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`py-2 w-14 text-center text-xs font-medium border-b-2 -mb-px ${
                activeTab === 'shared'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              }`}
            >
              Shared
            </button>
          </div>

          <div className="flex items-center ml-auto gap-0">
            {/* 添加刷新按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refreshFiles}
              title="Refresh file list"
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${mediaTypeFilters.size < Object.values(ContentMediaType).length ? "bg-primary/10" : ""}`}
                  ref={filterButtonRef}
                  role="button"
                  tabIndex={0}
                >
                  <Filter className={`h-3 w-3 ${
                    mediaTypeFilters.size < Object.values(ContentMediaType).length ? "text-primary" : ""
                  }`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-0 ring-0 bg-popover shadow-elevation-menu w-56"
                style={{ maxHeight: `${dropdownMaxHeight}px`, overflowY: 'auto' }}
              >
                <DropdownMenuLabel className="text-xs flex items-center justify-between">
                  <span>Filter by type</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={toggleAllFilters}
                  >
                    {mediaTypeFilters.size === Object.values(ContentMediaType).length ? 'Clear all' : 'Select all'}
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.values(ContentMediaType).map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleMediaTypeFilter(type);
                    }}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-4 h-4">
                        {mediaTypeFilters.has(type) && <Check className="h-3 w-3" />}
                      </div>
                      <Image
                        src={getItemIcon(type)}
                        alt={type}
                        width={14}
                        height={14}
                      />
                      {type}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <FileItemSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="text-xs text-center text-red-500 p-4">{error}</div>
        ) : (
          activeTab === 'shared' && console.log('[DEBUG] filteredSharedFiles to render:', filteredSharedFiles),
          <div className="space-y-1 p-2">
            {(activeTab === 'my-files' ? filteredFiles : filteredSharedFiles).map((file) => (
              <div
                key={file.id}
                onClick={(e) => {
                  e.preventDefault();
                  handleFileClick(file);
                }}
                className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg cursor-pointer"
              >
                <Image
                  src={getItemIcon(file.media_type)}
                  alt={file.media_type}
                  width={16}
                  height={16}
                />
                <span className="flex-1 truncate text-xs">{file.title}</span>
              </div>
            ))}
          </div>
        )}

        {hasNext && (
          <Button
            variant="ghost"
            className="w-full text-xs"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Load more'
            )}
          </Button>
        )}
      </div>

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </div>
  );
}
