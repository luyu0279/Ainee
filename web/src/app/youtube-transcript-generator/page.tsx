"use client";

import { useState, useEffect, useMemo } from "react";
import ApiLibs from "@/lib/ApiLibs";
import { YouTubeTranscriptionRequest } from "@/apis/models/YouTubeTranscriptionRequest";
import { SubtitleSegment } from "@/apis/models/SubtitleSegment";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from 'next/dynamic';

// 动态导入Mindmap组件以避免SSR问题
const Mindmap = dynamic(() => import('@/components/Mindmap'), {
  ssr: false,
  loading: () => <p>Loading mindmap...</p>
});

// 添加图标组件
const Icon = {
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  Clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ),
  Download: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  Copy: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
  ),
  ChevronDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  Spinner: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  Lightning: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
  ),
  Shield: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  Language: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.8 2H12a1 1 0 110 2H8.2l-.8 2H10a1 1 0 110 2H7.8l-.8 2h2a1 1 0 110 2H5a1 1 0 01-.93-1.36l3.76-9.4A1 1 0 018.7 4H6V3a1 1 0 011-1zm6 0a1 1 0 011 1v13a1 1 0 11-2 0V3a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  ),
  Lock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  ),
  Graduation: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
    </svg>
  ),
  Video: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
    </svg>
  ),
  Briefcase: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
    </svg>
  ),
  GraduationCap: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
    </svg>
  )
};

// 缓存接口定义
interface CacheData {
  transcription: SubtitleSegment[];
  transcription_raw?: any[]; // Raw transcript data with more details
  markdownmap: string;
  timestamp: number;
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

interface UseCase {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

const features: Feature[] = [
  {
    icon: <Icon.Lightning className="h-6 w-6 text-white" />,
    title: "Fast & Efficient",
    description: "Generate YouTube video transcripts in seconds. No waiting or processing delays. Get instant access to your video text."
  },
  {
    icon: <Icon.Lock className="h-6 w-6 text-white" />,
    title: "100% Free",
    description: "Our YouTube transcript generator is completely free to use with no hidden costs, sign-ups, or credit card requirements."
  },
  {
    icon: <Icon.Clock className="h-6 w-6 text-white" />,
    title: "Timestamps Included",
    description: "Get accurate timestamps with each transcript segment, making it easy to reference specific parts of the video."
  },
  {
    icon: <Icon.Download className="h-6 w-6 text-white" />,
    title: "Easy Download",
    description: "Download your YouTube transcripts as TXT files for easy storage, editing, and sharing with others."
  },
  {
    icon: <Icon.Language className="h-6 w-6 text-white" />,
    title: "Multiple Languages",
    description: "Generate transcripts in the video's original language and even translate them to other languages."
  },
  {
    icon: <Icon.Shield className="h-6 w-6 text-white" />,
    title: "Privacy Focused",
    description: "We don't store your transcripts or video data. Everything stays private and secure on your device."
  }
];

const testimonials: Testimonial[] = [
  {
    name: "Sarah Johnson",
    role: "Content Creator",
    quote: "This tool has revolutionized how I create content. I can now easily repurpose my YouTube videos into blog posts and social media content."
  },
  {
    name: "Michael Chen",
    role: "Student",
    quote: "As a student, this has been invaluable for taking notes from lecture videos. The timestamps make it easy to reference specific parts."
  },
  {
    name: "David Wilson",
    role: "Business Professional",
    quote: "We use this tool to create transcripts of our training videos. It's saved us countless hours of manual transcription work."
  }
];

const useCases: UseCase[] = [
  {
    icon: <Icon.Video className="h-6 w-6 text-white" />,
    title: "Content Creators",
    description: "Generate transcripts from your YouTube videos to:",
    benefits: [
      "Create blog posts from video content",
      "Add accurate captions to videos",
      "Improve video SEO with keyword-rich transcripts",
      "Repurpose content for social media posts"
    ]
  },
  {
    icon: <Icon.GraduationCap className="h-6 w-6 text-white" />,
    title: "Students & Researchers",
    description: "Extract valuable information from educational videos:",
    benefits: [
      "Take notes from lecture videos",
      "Create study materials from educational content",
      "Quote and cite video sources in academic work",
      "Search for specific information within videos"
    ]
  },
  {
    icon: <Icon.Briefcase className="h-6 w-6 text-white" />,
    title: "Professionals & Businesses",
    description: "Leverage video content for business purposes:",
    benefits: [
      "Create records of webinars and presentations",
      "Extract insights from industry-specific videos",
      "Generate meeting notes from recorded sessions",
      "Develop training materials from video content"
    ]
  }
];

export default function YouTubeVideoSummarizer() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState("summary"); // summary or meeting
  const [transcription, setTranscription] = useState<SubtitleSegment[]>([]);
  const [transcriptionRaw, setTranscriptionRaw] = useState<any[]>([]); // Raw transcript data
  const [summaryText, setSummaryText] = useState<string>("");
  const [openFaq, setOpenFaq] = useState(-1);
  const [cache, setCache] = useState<Record<string, CacheData>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingVideoUrl, setPendingVideoUrl] = useState("");
  const [displayedVideoUrl, setDisplayedVideoUrl] = useState("");
  const [showCopied, setShowCopied] = useState(false);

  // 从localStorage加载缓存
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem('youtube_summary_cache');
      if (savedCache) {
        setCache(JSON.parse(savedCache));
      }
    } catch (error) {
      console.error("Failed to load cache from localStorage:", error);
    }
  }, []);

  // 更新缓存到localStorage
  const updateCache = (newCache: Record<string, CacheData>) => {
    setCache(newCache);
    try {
      localStorage.setItem('youtube_summary_cache', JSON.stringify(newCache));
    } catch (error) {
      console.error("Failed to save cache to localStorage:", error);
    }
  };

  // 清理超过24小时的缓存
  const cleanupCache = (currentCache: Record<string, CacheData>) => {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000; // 24小时的毫秒数
    const updatedCache = { ...currentCache };
    
    Object.keys(updatedCache).forEach(key => {
      if (now - updatedCache[key].timestamp > ONE_DAY) {
        delete updatedCache[key];
      }
    });
    
    return updatedCache;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 允许用户正常输入，不去除空格
    setVideoUrl(e.target.value);
    setError("");
  };

  const fetchSummary = async (url: string) => {
    setLoading(true);
    setError("");
    
    try {
      // 检查缓存中是否已有该URL的数据，并验证缓存的有效性
      if (cache[url] && 
          cache[url].transcription && 
          cache[url].transcription.length > 0 && 
          cache[url].markdownmap) {
        console.log("Using cached data for", url);
        setTranscription(cache[url].transcription);
        if (cache[url].transcription_raw) {
          setTranscriptionRaw(cache[url].transcription_raw);
        }
        setSummaryText(cache[url].markdownmap);
        setShowResults(true);
        // 更新已显示的视频URL
        setDisplayedVideoUrl(url);
        setLoading(false);
        return;
      } else if (cache[url]) {
        console.log("Found invalid cache for URL, will fetch fresh data:", url);
      }
      
      // 如果缓存中没有或缓存无效，则请求API
      const request: YouTubeTranscriptionRequest = {
        url: url
      };
      
      const response = await ApiLibs.aineeWeb.getYoutubeTranscriptionApiAineeWebYoutubeTranscriptionPost(request);
      
      if (response.code === "SUCCESS" && response.data) {
        setTranscription(response.data.transcription);
        if (response.data.transcription_raw) {
          setTranscriptionRaw(response.data.transcription_raw);
        }
        setSummaryText(response.data.markdownmap);
        setShowResults(true);
        // 更新已显示的视频URL
        setDisplayedVideoUrl(url);
        
        // 仅当成功获取数据时才更新缓存
        if (response.data.transcription && response.data.transcription.length > 0) {
          // 更新缓存
          const newCacheData: CacheData = {
            transcription: response.data.transcription,
            transcription_raw: response.data.transcription_raw || [],
            markdownmap: response.data.markdownmap,
            timestamp: Date.now()
          };
          
          const updatedCache = cleanupCache({
            ...cache,
            [url]: newCacheData
          });
          
          updateCache(updatedCache);
          console.log("Cached data for URL:", url);
        } else {
          console.log("Not caching URL due to empty transcription:", url);
        }
      } else {
        setError(response.message || "Failed to get transcription");
        console.log("Not caching URL due to API error:", url);
      }
    } catch (err) {
      console.error("Error getting transcription:", err);
      setError("Failed to get transcription. Please check the URL and try again.");
      console.log("Not caching URL due to exception:", url);
    } finally {
      setLoading(false);
      // 清除pendingVideoUrl，确保后续操作使用的是最新的videoUrl
      setPendingVideoUrl("");
    }
  };

  const handleSubmit = () => {
    // 在提交时去除链接中的空格
    const trimmedUrl = videoUrl.trim();
    
    if (!trimmedUrl) {
      setError("Please enter a YouTube video URL");
      return;
    }

    // 更新状态中的URL为去除空格后的版本
    setVideoUrl(trimmedUrl);

    // 检查URL格式是否正确
    const isValidUrl = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/).+/.test(trimmedUrl);
    if (!isValidUrl) {
      setError("Please enter a valid YouTube video URL");
      return;
    }

    // 如果结果区域已经显示，且有内容，则显示确认对话框
    if (showResults && (transcription.length > 0 || summaryText)) {
      setPendingVideoUrl(trimmedUrl);
      setShowConfirmDialog(true);
    } else {
      // 直接获取新URL的摘要
      fetchSummary(trimmedUrl);
    }
  };

  const handleConfirmNewSummary = () => {
    setShowConfirmDialog(false);
    // 收起结果区
    setShowResults(false);
    // 保存当前pendingVideoUrl
    const urlToFetch = pendingVideoUrl;
    // 更新当前videoUrl以匹配pendingVideoUrl
    setVideoUrl(pendingVideoUrl);
    // 使用保存的URL获取新摘要
    fetchSummary(urlToFetch);
  };

  const handleCancelNewSummary = () => {
    setShowConfirmDialog(false);
    // 重置pendingVideoUrl
    setPendingVideoUrl("");
  };

  // 确定当前显示的视频URL - 使用正确的依赖管理
  const currentVideoUrl = useMemo(() => {
    // 如果在处理新任务，使用pendingVideoUrl
    if (pendingVideoUrl && (loading || showConfirmDialog)) {
      return pendingVideoUrl;
    }
    
    // 如果已经有已显示的视频URL，则优先使用它
    if (displayedVideoUrl && showResults) {
      return displayedVideoUrl;
    }
    
    // 如果以上条件都不满足，例如首次加载，使用输入框的URL
    return videoUrl;
  }, [loading, pendingVideoUrl, videoUrl, showConfirmDialog, displayedVideoUrl, showResults]);

  // 从URL提取视频ID
  const getYoutubeVideoId = (url: string) => {
    if (!url) return "";
    
    if (url.includes("youtu.be/")) {
      return url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("v=")) {
      try {
        return new URL(url).searchParams.get("v") || "";
      } catch (e) {
        // 处理无法解析的URL
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : "";
      }
    }
    return "";
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? -1 : index);
  };

  // Format the transcript for display
  const formatTranscript = () => {
    return transcription.map((segment, index) => (
      <p key={index} className="text-gray-600 text-sm mb-2">
        <span 
          className="text-gray-400 cursor-pointer hover:text-blue-500 transition-colors"
          onClick={() => handleTimestampClick(segment.start)}
        >[{formatDisplayTime(segment.start)}]</span> {segment.text}
      </p>
    ));
  };

  // Format time from seconds to MM:SS with milliseconds (for SRT format)
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };
  
  // Format time from seconds to MM:SS without milliseconds (for display)
  const formatDisplayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle timestamp click to jump to that position in the video
  const handleTimestampClick = (seconds: number) => {
    // 获取iframe元素
    const videoContainer = document.querySelector('.rounded-lg.overflow-hidden.mb-4.relative.pb-\\[56\\.25\\%\\].h-0');
    if (!videoContainer) return;
    
    const iframe = videoContainer.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return;
    
    // 使用YouTube Player API跳转到指定时间
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: "seekTo",
        args: [seconds, true]
      }),
      "*"
    );
  };

  const convertToSRT = (transcript: SubtitleSegment[], rawTranscript?: any[]): string => {
    // If we have raw transcript data, use it for more accurate SRT files
    if (rawTranscript && rawTranscript.length > 0) {
      return rawTranscript.map((segment, index) => {
        const startTime = formatTime(segment.start);
        const endTime = formatTime(segment.end || segment.start + (segment.duration || 5));
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
      }).join('');
    }
    
    // Fallback to using regular transcript data
    return transcript.map((segment, index) => {
      const startTime = formatTime(segment.start);
      const endTime = formatTime(segment.start + 5); // Assuming 5 seconds duration for each segment
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
    }).join('');
  };

  const downloadSRT = async (transcript: SubtitleSegment[]) => {
    try {
      // Get video ID from URL
      const videoId = getYoutubeVideoId(currentVideoUrl);
      if (!videoId) {
        throw new Error('Invalid video URL');
      }

      // Fetch video title from YouTube API
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const data = await response.json();
      const videoTitle = data.title.replace(/[^a-zA-Z0-9]/g, '_'); // Replace special characters with underscores

      // Use raw transcript data if available for more accurate SRT files
      const srtContent = convertToSRT(transcript, transcriptionRaw);
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ainee.com_${videoTitle}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading SRT:', error);
      // Fallback to default filename if there's an error
      const srtContent = convertToSRT(transcript, transcriptionRaw);
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ainee.com_transcript.srt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF4D4D]/10 via-[#4D4DFF]/10 to-[#50E3C2]/10 overflow-hidden relative">
      {/* Enhanced grid background with subtle animation */}
      <div className="absolute z-[-1] inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] animate-[pulse_15s_ease-in-out_infinite]"></div>
      
      {/* Animated gradient orbs */}
      <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(77,77,255,0.08),transparent)] pointer-events-none animate-[rotate_240s_linear_infinite]"></div>
      <div className="absolute right-0 top-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle_400px_at_center,rgba(105,218,0,0.06),transparent)] pointer-events-none animate-[float_15s_ease-in-out_infinite]"></div>
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-3xl opacity-10 aspect-square h-96 rounded-full bg-gradient-to-br from-[#4D4DFF] via-[#69DA00] to-[#50E3C2]"></div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">
                Free YouTube Transcript Generator
          </h1>
              <p className="text-lg text-[#737373] italic mb-8">
                Convert any YouTube video to text with timestamps <br />
                Download, copy, and use your YouTube transcripts instantly - no signup required.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <a 
                  href="#generator" 
                  className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white font-semibold hover:opacity-90 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById('generator');
                    if (element) {
                      const headerOffset = 100;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                      });
                    }
                  }}
                >
                  Generate Transcript
                </a>
                <a 
                  href="#features" 
                  className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-white text-[#4D4DFF] border-2 border-[#4D4DFF] hover:bg-[#4D4DFF]/10 font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById('features');
                    if (element) {
                      const headerOffset = 100;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                      });
                    }
                  }}
                >
                  Learn More
                </a>
              </div>
        </div>

            <div className="md:w-1/2 flex justify-center">
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 w-full max-w-md transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center text-white mr-4">
                      <Icon.Check className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-lg font-medium text-[#213756]">Transcript with timestamps</span>
                      <p className="text-sm text-[#737373] mt-1">Navigate videos easily with accurate timestamps</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center text-white mr-4">
                      <Icon.Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-lg font-medium text-[#213756]">No login required</span>
                      <p className="text-sm text-[#737373] mt-1">Use instantly without creating an account</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center text-white mr-4">
                      <Icon.Download className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-lg font-medium text-[#213756]">Completely free to use</span>
                      <p className="text-sm text-[#737373] mt-1">No hidden costs or premium features</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section id="generator" className="container relative px-6 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto">
        {/* Main content */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-white/20 mb-8">
            {/* Input form */}
            <div>
              <p className="text-[#213756] text-[15px] leading-[24px] text-center md:text-lg md:leading-[28px] font-medium mb-6 max-w-2xl mx-auto">
                Paste a YouTube video link below and get accurate transcripts with timestamps from YouTube videos
              </p>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="text"
                  className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={handleInputChange}
                />
                <button
                  onClick={handleSubmit}
                  disabled={loading || !videoUrl}
                  className="px-6 py-3 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap relative overflow-hidden"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="mr-2 relative">
                        <span className="absolute top-0 left-0 right-0 bottom-0 animate-ping rounded-full bg-white/30"></span>
                        <Icon.Spinner className="animate-spin h-4 w-4 text-white" />
                      </span>
                      <span className="relative animate-pulse">Processing<span className="animate-pulse-dots">...</span></span>
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
                    </span>
                  ) : "Generate Transcript"}
                </button>
              </div>
              {error && <p className="mt-2 text-red-500">{error}</p>}
            </div>

            {/* 确认对话框 */}
            {showConfirmDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Start a New Summary?</h3>
                  <p className="text-gray-600 mb-6">Previous content will be cleared. Are you sure you want to start a new task?</p>
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={handleCancelNewSummary} 
                      className="px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleConfirmNewSummary} 
                      className="px-4 py-2 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white rounded-md hover:opacity-90 transition-opacity"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results section - only visible after submission */}
            {showResults && (
              <div className="mt-8">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left column - Video and Transcript */}
                    <div className="p-4 bg-white">
                      {/* Video preview */}
                      <div className="rounded-lg overflow-hidden mb-4 relative pb-[56.25%] h-0">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYoutubeVideoId(currentVideoUrl)}?enablejsapi=1`}
                          className="absolute top-0 left-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="YouTube video"
                        ></iframe>
                      </div>
                      
                      {/* Transcript section with copy button */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-md font-medium text-gray-700">Transcript</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => downloadSRT(transcription)}
                              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 mr-1">
                                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                              </svg>
                              Download SRT
                            </button>
                          <button 
                            onClick={() => {
                                navigator.clipboard.writeText(transcription.map(segment => segment.text).join(' '));
                                setShowCopied(true);
                                setTimeout(() => setShowCopied(false), 2000);
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center transition-colors"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 mr-1">
                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                            Copy
                          </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 h-64 overflow-y-auto">
                          {transcription.length > 0 ? (
                            formatTranscript()
                          ) : (
                            <p className="text-gray-600 text-sm">
                              No transcript available for this video.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right column - Summary and Meeting Notes */}
                    <div className="p-4 bg-white">
                      {/* Tabs */}
                      <div className="flex border-b border-gray-200 mb-4">
                        <button
                          className={`py-2 px-4 text-sm font-medium ${
                            activeTab === "summary"
                              ? "border-b-2 border-blue-500 text-blue-600"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                          onClick={() => handleTabChange("summary")}
                        >
                          Summary
                        </button>
                        <button
                          className={`py-2 px-4 text-sm font-medium ${
                            activeTab === "meeting"
                              ? "border-b-2 border-blue-500 text-blue-600"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                          onClick={() => handleTabChange("meeting")}
                        >
                          Mindmap
                        </button>
                      </div>

                      {/* Tab content */}
                      <div className="relative">
                        {/* Scrollable content area */}
                        <div className="h-[calc(100%-40px)] max-h-[500px] overflow-y-auto">
                          {/* Summary copy button - fixed position */}
                          {activeTab === "summary" && summaryText && (
                            <div className="sticky top-0 right-0 float-right z-10 bg-white/95 rounded-bl-md shadow-sm">
                              <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(summaryText);
                                  alert("Summary copied to clipboard!");
                                }}
                                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center transition-colors"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 mr-1">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                                Copy
                              </button>
                              </div>
                            </div>
                          )}
                          
                          {activeTab === "summary" ? (
                            <div className="prose prose-sm max-w-none pt-8">
                              {summaryText ? (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({...props}) => <h1 className="text-xl font-bold my-3 font-sans text-[#213756]" {...props} />,
                                    h2: ({...props}) => <h2 className="text-lg font-bold my-2 font-sans text-[#213756]" {...props} />,
                                    h3: ({...props}) => <h3 className="text-md font-bold my-2 font-sans text-[#213756]" {...props} />,
                                    p: ({...props}) => <p className="mb-3 font-sans text-[#737373] text-sm leading-relaxed" {...props} />,
                                    ul: ({...props}) => <ul className="list-disc pl-5 mb-3 font-sans text-[#737373] text-sm" {...props} />,
                                    ol: ({...props}) => <ol className="list-decimal pl-5 mb-3 font-sans text-[#737373] text-sm" {...props} />,
                                    li: ({...props}) => <li className="mb-1 font-sans text-[#737373]" {...props} />,
                                    code: ({...props}) => <code className="bg-gray-100 px-1 rounded text-sm font-mono text-[#4D4DFF]" {...props} />,
                                    pre: ({...props}) => <pre className="bg-gray-100 p-2 rounded-md my-2 text-sm font-mono overflow-x-auto" {...props} />,
                                    blockquote: ({...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 font-sans text-[#737373]" {...props} />,
                                    table: ({...props}) => <table className="border-collapse w-full my-3 font-sans text-sm" {...props} />,
                                    th: ({...props}) => <th className="border border-gray-300 p-2 bg-gray-50 font-sans text-[#213756]" {...props} />,
                                    td: ({...props}) => <td className="border border-gray-300 p-2 font-sans text-[#737373] text-sm" {...props} />,
                                  }}
                                >
                                  {summaryText}
                                </ReactMarkdown>
                              ) : (
                                <p className="text-gray-600">
                                  No summary available for this video.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="h-full w-full">
                              {summaryText ? (
                                <Mindmap chart={summaryText} />
                              ) : (
                                <p className="text-gray-600 text-center p-4">
                                  No mindmap available. Generate a summary first to view the mindmap.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
            {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-40 pointer-events-none">
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#4D4DFF]/5 rounded-full blur-3xl"></div>
                <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[#69DA00]/5 rounded-full blur-3xl"></div>
          </div>
          
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">How to Generate YouTube Transcripts</h2>
                    <p className="text-[#737373] mt-3 text-lg italic text-center">Complete the process in three simple steps and get accurate YouTube video transcripts in seconds.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Step 1 */}
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur"></div>
                        <div className="flex items-center mb-6 relative">
                            <div className="w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white rounded-full flex items-center justify-center mr-4 shadow-md">
                                <span className="font-bold text-lg">1</span>
                </div>
                            <h3 className="text-xl font-bold text-[#213756]">Copy Video URL</h3>
              </div>
                        <p className="text-gray-600 mb-6 leading-relaxed">Copy the YouTube video URL from your browser's address bar or from the share button below any YouTube video.</p>
            </div>
            
            {/* Step 2 */}
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur"></div>
                        <div className="flex items-center mb-6 relative">
                            <div className="w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white rounded-full flex items-center justify-center mr-4 shadow-md">
                                <span className="font-bold text-lg">2</span>
                </div>
                            <h3 className="text-xl font-bold text-[#213756]">Paste & Generate</h3>
              </div>
                        <p className="text-gray-600 mb-6 leading-relaxed">Paste the URL into our transcript generator tool above and click the "Generate Transcript" button.</p>
            </div>
            
            {/* Step 3 */}
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur"></div>
                        <div className="flex items-center mb-6 relative">
                            <div className="w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white rounded-full flex items-center justify-center mr-4 shadow-md">
                                <span className="font-bold text-lg">3</span>
                </div>
                            <h3 className="text-xl font-bold text-[#213756]">Use Your Transcript</h3>
              </div>
                        <p className="text-gray-600 mb-6 leading-relaxed">Copy, download, or directly view the generated transcript with timestamps for your YouTube video.</p>
            </div>
          </div>
        </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container relative px-6 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">
                Powerful Features
            </h2>
              <p className="text-lg text-[#737373] italic max-w-2xl mx-auto">
                Our YouTube transcript generator comes packed with powerful features to enhance your video content experience
            </p>
          </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-xl flex items-center justify-center mb-6">
                    {feature.icon}
                </div>
                  <h3 className="text-xl font-bold text-[#213756] mb-4">{feature.title}</h3>
                  <p className="text-[#737373]">{feature.description}</p>
              </div>
              ))}
              </div>
            </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="container relative px-6 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">
                What Our Users Say
              </h2>
              <p className="text-lg text-[#737373] italic max-w-2xl mx-auto">
                Don't just take our word for it - hear what our users have to say about our YouTube transcript generator
                </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {testimonial.name.charAt(0)}
              </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-bold text-[#213756]">{testimonial.name}</h3>
                      <p className="text-[#737373]">{testimonial.role}</p>
            </div>
                </div>
                  <p className="text-[#737373] italic">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="container relative px-6 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">
                YouTube Transcript Generator Use Cases
              </h2>
              <p className="text-lg text-[#737373] italic max-w-2xl mx-auto">
                Discover how our YouTube video transcript generator can help different users extract value from video content
                </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {useCases.map((useCase, index) => (
                <div key={index} className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center mb-6">
                    {useCase.icon}
              </div>
                  <h3 className="text-xl font-bold text-[#213756] mb-3">{useCase.title}</h3>
                  <p className="text-[#737373] mb-4">{useCase.description}</p>
                  <ul className="text-[#737373] space-y-2 list-disc pl-5">
                    {useCase.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex}>{benefit}</li>
                    ))}
                  </ul>
            </div>
              ))}
          </div>
        </div>
        </section>
        
        {/* FAQ Section */}
        <div className="w-full flex flex-col items-center justify-center py-20 md:py-24 bg-white/30 backdrop-blur-sm mt-20 rounded-2xl">
          <div className="flex flex-col justify-center items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">
              Frequently asked questions
            </h2>
            <p className="text-[#737373] mt-3 text-lg italic text-center">
              Ainee YouTube Transcript Generator FAQ
            </p>
          </div>
          
          <div className="mt-10 md:mt-12 max-w-sm md:max-w-3xl w-full px-4 md:px-0">
            <div className="w-full space-y-5">
              {/* Question 1 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(0)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 0}
                >
                  <span className="text-[#3E1953] font-semibold">Is this YouTube transcript generator really free?</span>
                  <Icon.ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 0 ? "rotate-180" : ""}`} />
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 0 ? '1000px' : '0',
                    opacity: openFaq === 0 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      Yes, our YouTube transcript generator is completely free to use. There are no hidden costs, no sign-up requirements, and no credit card needed. We believe in providing accessible tools for everyone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 2 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(1)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 1}
                >
                  <span className="text-[#3E1953] font-semibold">How accurate are the generated transcripts?</span>
                  <Icon.ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 1 ? "rotate-180" : ""}`} />
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 1 ? '1000px' : '0',
                    opacity: openFaq === 1 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      Our tool accesses the same transcripts generated by YouTube's official systems. The accuracy depends on the original video's audio quality, speaking clarity, and whether the video creator has manually reviewed the transcripts. For most videos, the accuracy is very good.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 3 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(2)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 2}
                >
                  <span className="text-[#3E1953] font-semibold">Can I generate transcripts for any YouTube video?</span>
                  <Icon.ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 2 ? "rotate-180" : ""}`} />
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 2 ? '1000px' : '0',
                    opacity: openFaq === 2 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      You can generate transcripts for any YouTube video that has captions available. Most popular and recent videos have automatic captions, but some videos might not have them enabled by the creator. If a video doesn't have captions, our tool won't be able to generate a transcript.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 4 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(3)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 3}
                >
                  <span className="text-[#3E1953] font-semibold">Do you support languages other than English?</span>
                  <Icon.ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 3 ? "rotate-180" : ""}`} />
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 3 ? '1000px' : '0',
                    opacity: openFaq === 3 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      Yes, our YouTube transcript generator supports multiple languages. You can generate transcripts in whatever language the video captions are available in. Some videos offer captions in multiple languages, allowing you to choose your preferred language.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 5 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(4)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 4}
                >
                  <span className="text-[#3E1953] font-semibold">Is there a limit on video length or how many transcripts I can generate?</span>
                  <Icon.ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 4 ? "rotate-180" : ""}`} />
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 4 ? '1000px' : '0',
                    opacity: openFaq === 4 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      There is no limit on the length of videos you can transcribe or the number of transcripts you can generate. Whether it's a short 2-minute clip or a 3-hour lecture, our tool can handle it all at no cost.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 6 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(5)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 5}
                >
                  <span className="text-[#3E1953] font-semibold">How can I use the generated transcript?</span>
                  <Icon.ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 5 ? "rotate-180" : ""}`} />
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 5 ? '1000px' : '0',
                    opacity: openFaq === 5 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      You can use the generated transcript in many ways: copy it to your clipboard, download it as a text file, use it for note-taking, content creation, research, or accessibility purposes. You can also edit the transcript or use it with AI tools to create summaries or other content.
                    </p>
                  </div>
                </div>
              </div>
                  </div>
                </div>
              </div>

        {/* New CTA Section based on draft */}
        <section className="py-20 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] relative overflow-hidden mt-24 mb-12">
          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-0 top-0 w-full h-full bg-[url('/noise.png')] opacity-5"></div>
            <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -top-48 -left-48"></div>
            <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -bottom-48 -right-48"></div>
            
            {/* Floating particles */}
            <div className="absolute w-3 h-3 rounded-full bg-white/30 animate-float-slow left-[10%] top-[20%]"></div>
            <div className="absolute w-2 h-2 rounded-full bg-white/20 animate-float-slow-reverse right-[10%] top-[30%]"></div>
            <div className="absolute w-4 h-4 rounded-full bg-white/20 animate-float-medium left-[80%] top-[60%]"></div>
            <div className="absolute w-2 h-2 rounded-full bg-white/30 animate-float-medium-reverse left-[20%] bottom-[20%]"></div>
              </div>

          <div className="container mx-auto px-6 relative z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 drop-shadow-sm">
              Ready to Generate Your YouTube Transcript?
                </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light">
              Get started for free today and convert any YouTube video to text in seconds.
            </p>
                <button
                  onClick={() => {
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth"
                    });
                  }}
              className="bg-white text-[#4D4DFF] hover:bg-gray-100 px-8 py-4 rounded-xl font-medium text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md relative overflow-hidden group"
                >
                  {/* Shine effect */}
              <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-[#4D4DFF]/10 to-transparent skew-x-[-20deg] translate-x-[-150%] group-hover:animate-shine"></span>
              Generate Transcript Now
                </button>
        </div>
      </section>
      </section>
    </div>
  );
} 

