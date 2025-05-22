"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Lottie from 'lottie-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FileText, 
  BookOpen, 
  Smartphone, 
  Chrome, 
  ExternalLink, 
  Upload, 
  FileUp, 
  Book, 
  BarChart3, 
  Files, 
  Brain,
  Sparkles,
  Clock,
  Inbox,
  GripHorizontal
} from "lucide-react";
import { ImportDialog } from '@/components/import/ImportDialog';
import ApiLibs from "@/lib/ApiLibs";
import { ResponseCode } from "@/apis/models/ResponseCode";
import { ContentMediaType } from "@/types/fileTypes";
import { getItemIcon } from "@/utils/fileUtils";
import { Loader2 } from "lucide-react";
import { KnowledgeBaseType } from "@/apis/models/KnowledgeBaseType";
import { useSidebarStore } from '@/store/sidebarStore';

// 由于Lottie的服务端渲染问题，使用动态导入
import dynamic from 'next/dynamic';

// 动态导入Lottie动画组件，禁用SSR
const LottieAnimation: any = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => (
    <div className="w-[300px] h-[200px] bg-gray-100/30 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-sm text-gray-400">Loading animation...</div>
    </div>
  ),
});

// 文件接口定义
interface FileItem {
  id: string;
  title: string;
  media_type: ContentMediaType;
  created_at: string;
  updated_at?: string;
  type?: string;
}

// 知识库接口定义
interface KnowledgeBase {
  uid: string;
  name: string;
}

// 新增：统计所有Ainee相关indexedDB的条数
async function getAineeDBTotalCount(): Promise<number> {
  // 1. ainee_chat_db
  const chatCount = await new Promise<number>((resolve) => {
    const req = window.indexedDB.open('ainee_chat_db', 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('chat_history')) return resolve(0);
      const tx = db.transaction('chat_history', 'readonly');
      const store = tx.objectStore('chat_history');
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    };
    req.onerror = () => resolve(0);
  });

  // 2. ainee_content_db
  const contentCount = await new Promise<number>((resolve) => {
    const req = window.indexedDB.open('ainee_content_db', 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('content_ids')) return resolve(0);
      const tx = db.transaction('content_ids', 'readonly');
      const store = tx.objectStore('content_ids');
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    };
    req.onerror = () => resolve(0);
  });

  // 3. AineeAppDB
  const appCount = await new Promise<number>((resolve) => {
    const req = window.indexedDB.open('AineeAppDB', 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sharedFilesHistory')) return resolve(0);
      const tx = db.transaction('sharedFilesHistory', 'readonly');
      const store = tx.objectStore('sharedFilesHistory');
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    };
    req.onerror = () => resolve(0);
  });

  return chatCount + contentCount + appCount;
}

export default function DashboardPage() {
  const { setPageLoading } = useSidebarStore();

  useEffect(() => {
    // Stop loading indicator
    setPageLoading(false);
  }, [setPageLoading]);

  // 使用用户提供的动画文件
  const [animationData, setAnimationData] = React.useState<any>(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  
  // 统计数据状态
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [totalKnowledgeBases, setTotalKnowledgeBases] = useState<number>(0);
  const [aiInteractions, setAiInteractions] = useState<number>(0);
  
  // 文件列表状态
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // 直接从public文件夹路径加载
    fetch('/images/dash_hero.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error("Failed to load animation:", err));
  }, []);
  
  // 获取用户文件列表
  const fetchUserContents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 获取用户文件列表
      const response = await ApiLibs.content.getUserContentsApiContentUserContentsGet(null, 100);
      
      if (response.code === ResponseCode.SUCCESS && response.data) {
        // 安全地访问API返回数据
        const apiData: any = response.data;
        const allContents = apiData.contents || [];
        
        // 过滤出processing_status为completed的内容
        const contents = allContents.filter((content: any) => content.processing_status === "completed");
        
        // 设置文件总数
        setTotalFiles(contents.length);
        
        // 将API返回的数据映射到我们的FileItem接口
        const fileItems: FileItem[] = contents.map((content: any) => {
          // 从API返回的内容获取媒体类型
          let mediaType = ContentMediaType.link;
          if (content.media_type) {
            const mediaTypeStr = String(content.media_type).toLowerCase();
            if (mediaTypeStr.includes('video')) mediaType = ContentMediaType.video;
            else if (mediaTypeStr.includes('pdf')) mediaType = ContentMediaType.pdf;
            else if (mediaTypeStr.includes('audio') && mediaTypeStr.includes('internal')) mediaType = ContentMediaType.audioInternal;
            else if (mediaTypeStr.includes('audio') && mediaTypeStr.includes('microphone')) mediaType = ContentMediaType.audioMicrophone;
            else if (mediaTypeStr.includes('audio')) mediaType = ContentMediaType.audio;
            else if (mediaTypeStr.includes('word')) mediaType = ContentMediaType.word;
            else if (mediaTypeStr.includes('image')) mediaType = ContentMediaType.image;
            else if (mediaTypeStr.includes('ppt')) mediaType = ContentMediaType.ppt;
            else if (mediaTypeStr.includes('text')) mediaType = ContentMediaType.text;
            else if (mediaTypeStr.includes('excel')) mediaType = ContentMediaType.excel;
          }
          
          // 获取文件类型的简短描述
          const getFileTypeDescription = (mediaType: ContentMediaType) => {
            switch (mediaType) {
              case ContentMediaType.video: return 'video';
              case ContentMediaType.pdf: return 'pdf';
              case ContentMediaType.audio: 
              case ContentMediaType.audioInternal:
              case ContentMediaType.audioMicrophone: return 'audio';
              case ContentMediaType.word: return 'doc';
              case ContentMediaType.image: return 'image';
              case ContentMediaType.ppt: return 'ppt';
              case ContentMediaType.text: return 'text';
              case ContentMediaType.excel: return 'spreadsheet';
              default: return 'link';
            }
          };
          
          return {
            id: content.uid || '',
            title: content.title || 'Untitled',
            media_type: mediaType,
            created_at: content.created_at || new Date().toISOString(),
            updated_at: content.updated_at,
            type: getFileTypeDescription(mediaType)
          };
        });
        
        // 设置最近访问的文件 (按创建时间排序)
        const recent = [...fileItems]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4); // 只取前4个最新文件
        setRecentFiles(recent);
      } else {
        throw new Error(response.message || 'Failed to fetch files');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    }
  };
  
  // 获取知识库列表
  const fetchKnowledgeBases = async () => {
    try {
      const response = await ApiLibs.knowledgeBase.getKnowledgeBaseListApiKbListOwnGet(
        KnowledgeBaseType.ALL
      );
      
      if (response.code === ResponseCode.SUCCESS && response.data) {
        const knowledgeBases = response.data.knowledge_bases || [];
        setTotalKnowledgeBases(knowledgeBases.length);
      }
    } catch (err) {
      console.error('Error fetching knowledge bases:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 页面加载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      await fetchUserContents();
      await fetchKnowledgeBases();
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      getAineeDBTotalCount().then(setAiInteractions);
    }
  }, []);

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 6) {
      return 'Last week';
    } else if (diffDays > 0) {
      return `${diffDays} days ago`;
    } else if (diffHours > 0) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffMins > 0) {
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="flex-1 overflow-auto pb-8">
      {/* Hero section */}
      <div className="w-full bg-gradient-to-r from-green-100 via-green-50 to-white p-4 md:p-8 lg:p-12 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Ainee helps you capture, organize, and interact with your knowledge using AI.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="sm" className="h-9">
                  <Link href="/dashboard/inbox">
                    <Inbox className="mr-2 h-4 w-4" />
                    Go to Inbox
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Files 
                </Button>
              </div>
            </div>
            <div className="hidden md:block relative">
              {animationData && (
                <LottieAnimation 
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  style={{
                    width: 320,
                    height: 220,
                  }}
                  className="drop-shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 space-y-6 pt-6">
        {/* Stats row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{totalFiles}</div>
                )}
                <Files className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Knowledge Bases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{totalKnowledgeBases}</div>
                )}
                <Brain className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{aiInteractions}</div>
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick access and recents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick actions */}
          <Card className="lg:col-span-1 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Access frequently used features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/dashboard/inbox" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors">
                <div className="bg-primary/10 p-2 rounded-md">
                  <Inbox className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Inbox</h3>
                  <p className="text-sm text-muted-foreground">View and manage your files</p>
                </div>
              </Link>
              
              <Link href="/dashboard/knowledge-base" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors">
                <div className="bg-primary/10 p-2 rounded-md">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Knowledge Base</h3>
                  <p className="text-sm text-muted-foreground">Organize your knowledge</p>
                </div>
              </Link>
              
              <Link href="/dashboard/ai-apps" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors">
                <div className="bg-primary/10 p-2 rounded-md">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">AI Apps</h3>
                  <p className="text-sm text-muted-foreground">Interact with your content</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Files */}
          <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Recent Files</CardTitle>
                <CardDescription>Your recently accessed files</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/files">
                  View all <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recentFiles.length > 0 ? (
                <div className="space-y-2">
                  {recentFiles.map((file) => (
                    <Link 
                      key={file.id}
                      href={`/dashboard/inbox?fileId=${file.id}`}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-md">
                          <Image 
                            src={getItemIcon(file.media_type)}
                            alt={file.type || "file"}
                            width={16}
                            height={16}
                            className="h-4 w-4" 
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm truncate max-w-[200px]">{file.title}</h3>
                          <p className="text-xs text-muted-foreground">{file.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground">{formatTime(file.created_at)}</span>
                        <Clock className="ml-2 h-3 w-3 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent files found</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant="outline" 
                size="sm"
                onClick={() => setImportDialogOpen(true)}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Import Files / URLs
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* App ecosystem */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">App Ecosystem</h2>
            <span className="text-sm text-muted-foreground">Access Ainee from anywhere</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow border-primary/20">
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
                <Smartphone className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-medium">Ainee for Mobile</CardTitle>
                  <CardDescription className="text-sm">Seamless learning on the go</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Download the Ainee app for your iPhone for the best mobile experience.
                </p>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs px-3">
                  <Link href="https://apps.apple.com/us/app/ainee/id6738338767?pt=ainee_com&ct=202411&mt=website" target="_blank">
                    App Store <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow border-primary/20">
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
                <Chrome className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-medium">Ainee Chrome Extension</CardTitle>
                  <CardDescription className="text-sm">Capture web content effortlessly</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Install the Ainee Chrome Extension to save and organize content from any webpage.
                </p>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs px-3">
                  <Link href="https://chromewebstore.google.com/detail/ainee-capture-knowledge-a/ibldmmdnopmghejifiikmpnpmajkgjlh?authuser=0&hl=en" target="_blank">
                    Chrome Web Store <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      
      {/* Import Dialog */}
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
} 