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

// 缓存接口定义
interface CacheData {
  transcription: SubtitleSegment[];
  markdownmap: string;
  timestamp: number;
}

export default function YouTubeVideoSummarizer() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState("summary"); // summary or meeting
  const [transcription, setTranscription] = useState<SubtitleSegment[]>([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [openFaq, setOpenFaq] = useState(-1);
  const [cache, setCache] = useState<Record<string, CacheData>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingVideoUrl, setPendingVideoUrl] = useState("");
  const [displayedVideoUrl, setDisplayedVideoUrl] = useState("");

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
        setSummaryText(response.data.markdownmap);
        setShowResults(true);
        // 更新已显示的视频URL
        setDisplayedVideoUrl(url);
        
        // 仅当成功获取数据时才更新缓存
        if (response.data.transcription && response.data.transcription.length > 0) {
          // 更新缓存
          const newCacheData: CacheData = {
            transcription: response.data.transcription,
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
        >[{formatTime(segment.start)}]</span> {segment.text}
      </p>
    ));
  };

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF4D4D]/10 via-[#4D4DFF]/10 to-[#50E3C2]/10 overflow-hidden relative">
      {/* Enhanced grid background with subtle animation */}
      <div className="absolute z-[-1] inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] animate-[pulse_15s_ease-in-out_infinite]"></div>
      
      {/* Animated gradient orbs */}
      <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(77,77,255,0.08),transparent)] pointer-events-none animate-[rotate_240s_linear_infinite]"></div>
      <div className="absolute right-0 top-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle_400px_at_center,rgba(105,218,0,0.06),transparent)] pointer-events-none animate-[float_15s_ease-in-out_infinite]"></div>
      
      <section className="container relative px-6 md:px-8 lg:px-12 py-12 md:py-16 lg:py-20 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] pb-2 mb-4">
            Free YouTube Summarizer With AI
          </h1>
          <p className="text-[#737373] text-[13px] leading-[21px] text-center md:text-base md:leading-[31px] dark:text-white/40 max-w-3xl mx-auto mb-12 md:mb-16">
            Easily obtain YouTube transcripts and leverage AI to summarize YouTube videos in just one click with the free online Ainee YouTube Summarizer tool.
          </p>
        </div>

        {/* Main content */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-white/20">
            {/* Input form */}
            <div>
              <p className="text-[#213756] text-[15px] leading-[24px] text-center md:text-lg md:leading-[28px] font-medium mb-6 max-w-2xl mx-auto">
                Paste a YouTube video link below and get a detailed summary in one click with AI.
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
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                      <span className="relative animate-pulse">Processing<span className="animate-pulse-dots">...</span></span>
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
                    </span>
                  ) : "Summarize"}
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
                          <button 
                            onClick={() => {
                              const transcriptText = transcription.map(segment => 
                                `[${formatTime(segment.start)}] ${segment.text}`
                              ).join('\n');
                              navigator.clipboard.writeText(transcriptText);
                              // Optional: Show a toast or notification that text was copied
                              alert("Transcript copied to clipboard!");
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy
                          </button>
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
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(summaryText);
                                  alert("Summary copied to clipboard!");
                                }}
                                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center transition-colors m-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copy
                              </button>
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
        
        {/* How to summarize section - moved to after the results section */}
        <div className="max-w-6xl mx-auto mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">
              How to summarize a YouTube video?
            </h2>
            <p className="text-[#737373] mt-3 text-lg italic">
              You can easily use youtube ai summarizer with just 3 simple steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Step 1 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#4D4DFF]/70 text-white flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <h3 className="ml-3 text-xl font-semibold text-[#213756]">Copy</h3>
              </div>
              <p className="text-[#737373] text-sm leading-relaxed">
                Copy YouTube Video URL Copy and paste the YouTube Video URL into Ainee's video summarizer.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4D4DFF]/80 to-[#69DA00]/80 text-white flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <h3 className="ml-3 text-xl font-semibold text-[#213756]">Summarize</h3>
              </div>
              <p className="text-[#737373] text-sm leading-relaxed">
                Generate the Summary Click the "Summarize" button, and Ainee will summarize the YouTube video and grab YouTube transcripts using its AI summarizing tool.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#69DA00]/80 to-[#69DA00] text-white flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <h3 className="ml-3 text-xl font-semibold text-[#213756]">View</h3>
              </div>
              <p className="text-[#737373] text-sm leading-relaxed">
                View the summary Instantly view the TLDR AI-generated YouTube video summary and mindmap without login and without entering your email or credit card.
              </p>
            </div>
          </div>
        </div>
        
        {/* Use Cases for Various Roles section */}
        <div className="max-w-6xl mx-auto mt-24 pb-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">
              Use Cases for Various Roles
            </h2>
            <p className="text-[#737373] mt-3 text-lg italic">
              Designed for students, researchers, and content creators of all kinds.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Professional Card */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-[#4D4DFF]"></div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-[#213756]">For Professionals</h3>
                </div>
                <p className="text-[#737373] text-sm leading-relaxed">
                  Quickly grasp the key points of industry talks, conferences, and webinars with our YouTube video AI summarizer.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full text-[#4D4DFF]">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            
            {/* Students Card */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]"></div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-[#213756]">For Students</h3>
                </div>
                <p className="text-[#737373] text-sm leading-relaxed">
                  Stay ahead in your studies by efficiently summarizing lectures and tutorials using our online AI summarizer for YouTube videos.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full text-[#4D4DFF]">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            
            {/* Researchers Card */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-[#69DA00]"></div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-[#213756]">For Researchers</h3>
                </div>
                <p className="text-[#737373] text-sm leading-relaxed">
                  Use Ainee's AI summarizing tool to efficiently explore and digest a vast collection of YouTube video materials with detailed YouTube transcripts.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full text-[#69DA00]">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="w-full flex flex-col items-center justify-center py-20 md:py-24 bg-white/30 backdrop-blur-sm mt-20 rounded-2xl">
          <div className="flex flex-col justify-center items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">
              Frequently asked questions
            </h2>
            <p className="text-[#737373] mt-3 text-lg italic text-center">
              Ainee YouTube Video Summarizer FAQ
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
                  <span className="text-[#3E1953] font-semibold">What is the Ainee YouTube video summarizer?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 0 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
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
                      It's a free online tool that uses AI to help users quickly obtain a summary and key points of YouTube videos.
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
                  <span className="text-[#3E1953] font-semibold">Do you have to pay to use this tool?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 1 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
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
                      No, the Ainee YouTube summarizer is a free tool. You can access and view YouTube video transcripts for free. There's a small cost for using the AI Summary feature.
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
                  <span className="text-[#3E1953] font-semibold">Is there a limit on video length or the number of YouTube summaries?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 2 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
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
                      There are no restrictions. You can summarize YouTube videos of any length and get high-quality AI-generated video summaries.
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
                  <span className="text-[#3E1953] font-semibold">Can I customize the YouTube summary length or the prompt?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 3 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
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
                      Yes, you can customize the YouTube summary length to meet your needs. You can also input your own AI prompt to get the format and style you prefer.
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
                  <span className="text-[#3E1953] font-semibold">How accurate are the summaries?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 4 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
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
                      Ainee uses advanced AI models like ChatGPT 4 and Claude 3, ensuring the summaries are of high quality.
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
                  <span className="text-[#3E1953] font-semibold">Is my data secure when using Ainee?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 5 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
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
                      Ainee doesn't store your data unless you choose to save notes. We ensure the security of your data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 7 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(6)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 6}
                >
                  <span className="text-[#3E1953] font-semibold">Can I use Ainee to summarize other content?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 6 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 6 ? '1000px' : '0',
                    opacity: openFaq === 6 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      Yes, Ainee supports summarizing article pages and other platforms like Vimeo, Udemy, and Coursera. Click the provided link if you need to use it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 8 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(7)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 7}
                >
                  <span className="text-[#3E1953] font-semibold">What kinds of videos can I use it to summarize?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 7 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 7 ? '1000px' : '0',
                    opacity: openFaq === 7 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      Ainee can summarize various types of videos, including educational, entertainment, and news content.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 9 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(8)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 8}
                >
                  <span className="text-[#3E1953] font-semibold">Will there be support for other languages in the future?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 8 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 8 ? '1000px' : '0',
                    opacity: openFaq === 8 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      Currently, Ainee supports summarization and transcription in over 40 languages. More languages may be added in the future.
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 10 */}
              <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                <button 
                  onClick={() => toggleFaq(9)}
                  className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                  aria-expanded={openFaq === 9}
                >
                  <span className="text-[#3E1953] font-semibold">Is Ainee user-friendly for non-technical users?</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 9 ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </button>
                <div 
                  style={{ 
                    maxHeight: openFaq === 9 ? '1000px' : '0',
                    opacity: openFaq === 9 ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                  }}
                >
                  <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                    <p>
                      Absolutely, Ainee is designed to be user-friendly for everyone, including non-technical users, making it easy to summarize YouTube videos and other content.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Final Call-to-Action - Ultra modern design */}
        <div className="w-full mt-24 mb-12 relative">
          {/* Animated floating dots background - for extra fancy effect */}
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute w-4 h-4 rounded-full bg-[#4D4DFF]/20 animate-float-slow left-[10%] top-[20%]"></div>
            <div className="absolute w-6 h-6 rounded-full bg-[#69DA00]/20 animate-float-slow-reverse left-[25%] top-[40%]"></div>
            <div className="absolute w-3 h-3 rounded-full bg-[#4D4DFF]/20 animate-float-medium left-[75%] top-[15%]"></div>
            <div className="absolute w-5 h-5 rounded-full bg-[#69DA00]/20 animate-float-medium-reverse left-[85%] top-[50%]"></div>
          </div>
          
          <div className="w-full bg-gradient-to-br from-[#4D4DFF]/10 via-white/80 to-[#69DA00]/10 backdrop-blur-xl py-16 relative overflow-hidden border-y border-white/50 shadow-[0_10px_50px_-20px_rgba(77,77,255,0.3),0_-10px_50px_-20px_rgba(105,218,0,0.3)]">
            {/* Glass panel effect with inner border */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            
            {/* Enhanced decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4D4DFF] via-[#69DA00] to-[#4D4DFF] animate-gradient-x"></div>
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#69DA00] via-[#4D4DFF] to-[#69DA00] animate-gradient-x-reverse"></div>
            <div className="absolute -right-32 -top-32 w-96 h-96 bg-[#4D4DFF]/5 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-[#69DA00]/5 rounded-full blur-3xl animate-pulse-slow"></div>
            
            {/* Diagonal line decorations with animation */}
            <div className="absolute left-0 top-0 w-full h-full overflow-hidden z-0 opacity-20">
              <div className="absolute -left-10 top-0 w-0.5 h-full bg-gradient-to-b from-[#4D4DFF]/0 via-[#4D4DFF] to-[#4D4DFF]/0 rotate-[20deg] transform origin-top-left animate-line-flow"></div>
              <div className="absolute left-1/4 top-0 w-0.5 h-full bg-gradient-to-b from-[#4D4DFF]/0 via-[#4D4DFF] to-[#4D4DFF]/0 rotate-[20deg] transform origin-top-left animate-line-flow delay-150"></div>
              <div className="absolute left-2/4 top-0 w-0.5 h-full bg-gradient-to-b from-[#69DA00]/0 via-[#69DA00] to-[#69DA00]/0 rotate-[20deg] transform origin-top-left animate-line-flow delay-300"></div>
              <div className="absolute left-3/4 top-0 w-0.5 h-full bg-gradient-to-b from-[#69DA00]/0 via-[#69DA00] to-[#69DA00]/0 rotate-[20deg] transform origin-top-left animate-line-flow delay-500"></div>
            </div>
            
            {/* Radial circles */}
            <div className="absolute right-1/4 top-1/2 w-40 h-40 rounded-full border border-[#4D4DFF]/10 animate-expand-slow opacity-30"></div>
            <div className="absolute left-1/4 top-1/3 w-56 h-56 rounded-full border border-[#69DA00]/10 animate-expand-slow opacity-30 delay-700"></div>
            
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between relative z-10">
              <div className="text-left mb-10 md:mb-0 md:mr-8 md:max-w-2xl">
                <div className="inline-block mb-2 text-sm font-medium text-[#4D4DFF] px-4 py-1 rounded-full bg-[#4D4DFF]/10 backdrop-blur-sm">
                  🚀 Exclusive Free Tool
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#213756] to-[#4D4DFF] pb-1 mb-4">
                  Start Summarizing without Login and Credit Card
                </h2>
                <p className="text-[#737373] text-lg mb-6">
                  Get instant summaries of YouTube videos with just a few clicks. No account required.
                </p>
                
                {/* Enhanced benefits row with animated icons */}
                <div className="flex flex-row flex-wrap gap-5 md:gap-8">
                  <div className="flex items-center group">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#4D4DFF]/10 mr-3 group-hover:bg-[#4D4DFF]/20 transition-colors duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#4D4DFF] group-hover:scale-110 transition-transform duration-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-[#213756] text-sm font-medium group-hover:text-[#4D4DFF] transition-colors duration-300">No Login</span>
                  </div>
                  
                  <div className="flex items-center group">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#69DA00]/10 mr-3 group-hover:bg-[#69DA00]/20 transition-colors duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#69DA00] group-hover:scale-110 transition-transform duration-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-[#213756] text-sm font-medium group-hover:text-[#69DA00] transition-colors duration-300">No Credit Card</span>
                  </div>
                  
                  <div className="flex items-center group">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#4D4DFF]/10 mr-3 group-hover:bg-[#4D4DFF]/20 transition-colors duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#4D4DFF] group-hover:scale-110 transition-transform duration-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-[#213756] text-sm font-medium group-hover:text-[#4D4DFF] transition-colors duration-300">No Payment</span>
                  </div>
                </div>
              </div>
              
              <div className="md:ml-auto relative">
                {/* Animated glow effect behind button */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#4D4DFF]/30 to-[#69DA00]/30 blur-xl rounded-full animate-pulse-slow"></div>
                
                <button
                  onClick={() => {
                    // Scroll to the top input section
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth"
                    });
                  }}
                  className="relative px-10 py-5 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white font-medium text-lg rounded-xl hover:opacity-95 transition-all hover:shadow-lg hover:shadow-[#4D4DFF]/20 hover:scale-105 duration-300 whitespace-nowrap overflow-hidden group"
                >
                  {/* Shine effect */}
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] translate-x-[-150%] group-hover:animate-shine"></span>
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* 添加全局样式 */}
      <style jsx global>{`
        /* Markdown内容样式 */
        .prose h1 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #213756;
        }
        .prose h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #213756;
        }
        .prose h3 {
          font-size: 1.1rem;
          font-weight: bold;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #213756;
        }
        .prose p {
          margin-bottom: 0.75rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #737373;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .prose ul, .prose ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #737373;
          font-size: 0.875rem;
        }
        .prose li {
          margin-bottom: 0.25rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .prose pre {
          background-color: #f5f5f5;
          padding: 0.5rem;
          border-radius: 0.25rem;
          overflow-x: auto;
        }
        .prose code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          background-color: #f5f5f5;
          padding: 0.1rem 0.2rem;
          border-radius: 0.2rem;
          color: #4D4DFF;
          font-size: 0.875rem;
        }
        .prose blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          color: #737373;
          font-style: italic;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.875rem;
        }
        .prose th, .prose td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .prose th {
          background-color: #f9fafb;
          color: #213756;
        }
        .prose td {
          color: #737373;
        }

        /* 动画样式 */
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes pulse-dots {
          0%, 20% {
            content: "";
          }
          40% {
            content: ".";
          }
          60% {
            content: "..";
          }
          80%, 100% {
            content: "...";
          }
        }
        
        .animate-pulse-dots::after {
          content: "";
          animation: pulse-dots 1.5s infinite;
        }
      `}</style>
    </div>
  );
} 

