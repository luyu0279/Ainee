"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import AineeBridge from "@/lib/AineeBridge";
import { tabsData } from "@/components/TranscriptHearder";
import VideoDetailList from "@/components/details/VideoDetailList";
import { ContentResponse } from "@/types/contentTypes";

// Define a type for the player controls for clarity
interface PlayerControlsRef {
  toggleMinimize: () => void;
  resetPlayerPosition: () => void;
}

// --- Begin: Memoized Video Embed Component ---
interface VideoEmbedPlayerProps {
  htmlContent: string;
  videoRef: React.RefObject<HTMLDivElement | null>;
  iframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
  style?: React.CSSProperties;
}

const VideoEmbedPlayer = React.memo<VideoEmbedPlayerProps>(({ htmlContent, videoRef, iframeRef, style }) => {
  useEffect(() => {
    if (videoRef.current) {
      const iframeElement = videoRef.current.querySelector('iframe');
      if (iframeElement) {
        if (iframeRef.current !== iframeElement) {
          iframeRef.current = iframeElement;
        }
        iframeElement.style.width = '100%';
        iframeElement.style.height = '100%';
      } else {
        iframeRef.current = null;
      }
    } else {
      iframeRef.current = null;
    }
  }, [htmlContent]);

  return (
    <div 
      ref={videoRef} 
      className="w-full h-full pt-7" 
      style={style}
      dangerouslySetInnerHTML={{ __html: htmlContent || '<div class="w-full h-full flex items-center justify-center text-white text-sm">No video available</div>' }} 
    />
  );
});
VideoEmbedPlayer.displayName = 'VideoEmbedPlayer';
// --- End: Memoized Video Embed Component ---

const VideoDetail = React.memo(({
  content,
  annotations = []
}: {
  content: ContentResponse,
  annotations?: Record<string, any>[]
}) => {
  console.log('[VideoDetail] content 123:', content);
  const videoRef = useRef<HTMLDivElement>(null); // This ref is now for the VideoEmbedPlayer
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [activeTab, setActiveTab] = useState(tabsData[0].id);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 220 }); // Initial position
  const [size, setSize] = useState({ width: 320, height: 180 });
  const [defaultSize] = useState({ width: 320, height: 180 });
  const dragRef = useRef<HTMLDivElement>(null);
  const startDragPosRef = useRef({ x: 0, y: 0 }); // Renamed for clarity
  const startResizeInfoRef = useRef({ x: 0, y: 0, width: 0, height: 0}); // Store initial resize info
  const resizeHandleRef = useRef<HTMLDivElement>(null); // Renamed for clarity

  // Effect for initializing and updating player position, less prone to resetting on resize
  useEffect(() => {
    const defaultX = 20;
    const playerHeight = isMinimized ? 40 : size.height;
    // Calculate Y position based on current window height, player height, and a margin
    const newY = window.innerHeight - playerHeight - 20; 
    setPosition(prevPosition => ({
      x: Math.max(0, Math.min(prevPosition.x, window.innerWidth - (isMinimized ? 220 : size.width))),
      y: newY
    }));
  }, [isMinimized, size.height, size.width]);
  

  const seekToTime = useCallback(async (seconds: number) => {
    console.log('[VideoDetail] seekToTime called with seconds:', seconds);
    console.log('[VideoDetail] iframeRef.current:', iframeRef.current);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      console.log('[VideoDetail] Attempting to postMessage to iframe:', iframeRef.current.contentWindow);
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [seconds, true],
          }),
          "*"
        );
        console.log('[VideoDetail] postMessage sent successfully.');
      } catch (error) {
        console.error('[VideoDetail] Error sending postMessage:', error);
      }
    } else {
      console.warn('[VideoDetail] seekToTime: iframeRef.current or contentWindow is not available.');
      if (!iframeRef.current) console.warn('[VideoDetail] iframeRef.current is null/undefined.');
      if (iframeRef.current && !iframeRef.current.contentWindow) console.warn('[VideoDetail] iframeRef.current.contentWindow is null/undefined.');
    }
  }, []); // iframeRef is stable due to useRef

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      (target.closest('button') && target.closest('.player-controls')) ||
      target === resizeHandleRef.current ||
      target.closest('.resize-handle')
    ) {
      return; 
    }
    e.preventDefault();
    setIsDragging(true);
    startDragPosRef.current = { 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    };
  }, [position.x, position.y]);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - startDragPosRef.current.x;
    const newY = e.clientY - startDragPosRef.current.y;
    const currentWidth = isMinimized ? 220 : size.width;
    const currentHeight = isMinimized ? 40 : size.height;
    const maxX = window.innerWidth - currentWidth;
    const maxY = window.innerHeight - currentHeight;
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, size.width, size.height, isMinimized]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      // Store initial mouse position and current player size and position
      startResizeInfoRef.current = { 
        x: e.clientX, 
        y: e.clientY, 
        width: rect.width, 
        height: rect.height,
      };
    }
  }, []);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startResizeInfoRef.current.x;
    const aspectRatio = 16 / 9; 
    let newWidth = startResizeInfoRef.current.width + deltaX;
    let newHeight = newWidth / aspectRatio;

    newWidth = Math.max(200, newWidth);
    newHeight = Math.max(112, newHeight);
    newWidth = Math.min(newWidth, window.innerWidth);
    newHeight = Math.min(newHeight, window.innerHeight);
    
    if (newWidth / aspectRatio > newHeight) {
        newWidth = newHeight * aspectRatio;
    } else {
        newHeight = newWidth / aspectRatio;
    }
    setSize({ width: newWidth, height: newHeight });
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    // After resizing, explicitly check if the player is out of bounds and adjust position
    // This ensures the player snaps back if dragged partially off-screen during resize
    const currentWidth = size.width;
    const currentHeight = size.height;
    const maxX = window.innerWidth - currentWidth;
    const maxY = window.innerHeight - currentHeight;

    setPosition(prevPos => ({
        x: Math.max(0, Math.min(prevPos.x, maxX)),
        y: Math.max(0, Math.min(prevPos.y, maxY))
    }));
  }, [size.width, size.height]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const resetPlayerPosition = useCallback(() => {
    const defaultX = 20;
    const defaultPlayerHeight = defaultSize.height;
    const defaultY = window.innerHeight - defaultPlayerHeight - 20;
    setPosition({ x: defaultX, y: defaultY });
    setSize({ ...defaultSize });
    setIsMinimized(false); 
  }, [defaultSize]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    } else {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    } else {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
    
    // 确保组件卸载时清理所有事件监听器
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResize, handleResizeEnd]);

  // 添加一个特殊的处理器来确保当鼠标离开窗口时也停止调整大小
  useEffect(() => {
    const handleMouseLeave = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isResizing]);

  // Window resize listener to keep player in bounds
  useEffect(() => {
    const handleWindowResize = () => {
      const currentWidth = isMinimized ? 220 : size.width;
      const currentHeight = isMinimized ? 40 : size.height;
      const maxX = window.innerWidth - currentWidth;
      const maxY = window.innerHeight - currentHeight;
      
      setPosition(prevPos => ({
        x: Math.max(0, Math.min(prevPos.x, maxX)),
        y: Math.max(0, Math.min(prevPos.y, maxY))
      }));
    };
    
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize(); 
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [size.width, size.height, isMinimized]);

  const videoContainerStyle = useMemo(() => ({ 
    position: 'relative' as 'relative',
    overflow: 'hidden',
  }), []);

  const playerStyle = useMemo(() => ({
    width: isMinimized ? '220px' : `${size.width}px`,
    height: isMinimized ? '40px' : `${size.height}px`,
    left: `${position.x}px`,
    top: `${position.y}px`,
    cursor: isDragging ? 'grabbing' : (isResizing ? 'nwse-resize' : 'grab'),
    // Apply transition only when not actively dragging or resizing
    transition: (isDragging || isResizing) ? 'none' : 'width 0.2s ease-out, height 0.2s ease-out, top 0.2s ease-out, left 0.2s ease-out',
  }), [isMinimized, size, position, isDragging, isResizing]);

  // Ensure contentDetails prop for VideoDetailList is stable if its source is stable
  const stableContentDetails = useMemo(() => {
    console.log('[VideoDetail] stableContentDetails content:', content);
    return content
  }, [content]);

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={dragRef}
        className="fixed z-[1000] shadow-xl rounded overflow-hidden bg-black group"
        style={playerStyle}
        onMouseDown={handleDragStart}
      >
        {/* Player Controls Bar - Ensure it's always on top of the video content */}
        <div 
          className="absolute top-0 left-0 right-0 h-7 bg-gray-900 bg-opacity-80 flex items-center px-2 player-controls z-[1001] cursor-grab group-hover:bg-opacity-90 transition-opacity duration-200"
        >
          <div className="text-white text-xs truncate flex-1 ml-1">
            {content.title || 'Video Player'}
          </div>
          <div className="flex items-center">
            <button 
              onClick={resetPlayerPosition}
              className="text-white mx-1 p-1 hover:bg-gray-700 rounded focus:outline-none"
              title="Reset position"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"/></svg>
            </button>
            <button 
              onClick={toggleMinimize}
              className="text-white mx-1 p-1 hover:bg-gray-700 rounded focus:outline-none"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5V19H10V17H7V14ZM5 10H7V7H10V5H5V10ZM17 17H14V19H19V14H17V17ZM14 5V7H17V10H19V5H14Z"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 16H8V19H10V14H5V16ZM8 8H5V10H10V5H8V8ZM14 19H16V16H19V14H14V19ZM16 8V5H14V10H19V8H16Z"/></svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Video Content Area - Only rendered when not minimized */} 
        {!isMinimized && (
          <VideoEmbedPlayer 
            htmlContent={content.video_embed_html || ''}
            videoRef={videoRef} 
            iframeRef={iframeRef}
            style={videoContainerStyle}
          />
        )}
        
        {/* Resize Handle - Only rendered when not minimized */} 
        {!isMinimized && (
          <div 
            ref={resizeHandleRef}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize bg-gray-700 bg-opacity-40 hover:bg-opacity-70 flex items-center justify-center resize-handle z-[1001] rounded-tl-md"
            onMouseDown={(e) => {
              e.stopPropagation(); // 阻止事件冒泡
              handleResizeStart(e);
            }}
            title="按住并拖动以调整大小"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="rgba(255,255,255,0.7)"><path d="M0 10L10 0L10 10L0 10Z" /></svg>
          </div>
        )}
      </div>
      
      <VideoDetailList 
        contentDetails={stableContentDetails} 
        seekToTime={seekToTime} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
    </div>
  );
});

export default VideoDetail; 