"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ContentResponse } from "@/types/contentTypes";
import { tabsData } from "@/components/TranscriptHearder";
import AineeBridge from "@/lib/AineeBridge";
import TranscriptList from "@/components/TranscriptList";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

const speedOptions = [1, 1.25, 1.5, 1.75, 2, 0.75, 0.5];
const PLAYER_DEFAULT_HEIGHT = 120;

const PlayIcon = () => (
  <div className="w-5 h-5 flex items-center justify-center">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
      <path d="M4 3.5v9l8-4.5z" />
    </svg>
  </div>
);

const PauseIcon = () => (
  <div className="w-5 h-5 flex items-center justify-center">
    <div className="w-1 h-4 bg-white mx-0.5"></div>
    <div className="w-1 h-4 bg-white mx-0.5"></div>
  </div>
);

function AudioDetail({ content }: { content: ContentResponse }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(tabsData[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      return { x: 20, y: window.innerHeight - PLAYER_DEFAULT_HEIGHT - 20 };
    }
    return { x: 20, y: 500 };
  });
  const startDragPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setPosition({ x: 20, y: window.innerHeight - PLAYER_DEFAULT_HEIGHT - 20 });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = speedOptions[speedIndex];

      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);

      if (audio.readyState >= 1) {
        setDuration(audio.duration);
      }

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [speedIndex]);

  const changeSpeed = useCallback(() => {
    setSpeedIndex((prevIndex) => (prevIndex + 1) % speedOptions.length);
  }, []);

  const seekToTime = useCallback((time: number, autoPlay: boolean = false) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      
      if (autoPlay && !isPlaying) {
        audioRef.current.play()
          .catch(error => console.error("Error playing audio after seek:", error));
      }
    }
  }, [duration, isPlaying]);

  const seekRelative = useCallback((offset: number) => {
    seekToTime(currentTime + offset);
  }, [currentTime, seekToTime]);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => console.error("Error playing audio:", error));
      }
    }
  }, [isPlaying]);

  const formatTime = (timeInSeconds: number) => {
    const time = Math.max(0, Math.floor(timeInSeconds));
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    
    if (duration > 0 && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      seekToTime(duration * percentage);
    }
  }, [duration, seekToTime]);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== dragRef.current && (e.target as HTMLElement).closest('button, .no-drag')) {
        return;
    }
    e.preventDefault();
    setIsDragging(true);
    startDragPosRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position.x, position.y]);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    let newX = e.clientX - startDragPosRef.current.x;
    let newY = e.clientY - startDragPosRef.current.y;

    const playerWidth = dragRef.current.offsetWidth;
    const playerHeight = dragRef.current.offsetHeight;

    newX = Math.max(0, Math.min(newX, window.innerWidth - playerWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - playerHeight));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

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
    const handleResize = () => {
      if (dragRef.current) {
        const playerWidth = dragRef.current.offsetWidth;
        const playerHeight = dragRef.current.offsetHeight;
        setPosition(prevPos => ({
          x: Math.max(0, Math.min(prevPos.x, window.innerWidth - playerWidth)),
          y: Math.max(0, Math.min(prevPos.y, window.innerHeight - playerHeight)),
        }));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const audioSourceUrl = content.file_url;
  
  useEffect(() => {
    console.log('Audio source URL:', audioSourceUrl);
    console.log('Content object:', content);
  }, [audioSourceUrl, content]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleError = (e: Event) => {
        console.error('Error loading audio:', e);
        console.log('Audio element:', audio);
        console.log('Source URL:', audio.src);
      };
      
      audio.addEventListener('error', handleError);
      
      return () => {
        audio.removeEventListener('error', handleError);
      };
    }
  }, [audioSourceUrl]);

  if (!audioSourceUrl) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-[17px] font-bold px-4 pt-2 pb-1">Error</div>
        <div className="p-4">Audio source URL missing (content.file_url is empty).</div>
      </div>
    );
  }

  const playerStyle = useMemo(() => ({
    left: `${position.x}px`,
    top: `${position.y}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
  }), [position, isDragging]);

  return (
    <div>
      {/* <div className="text-[17px] font-bold px-4 pt-2 pb-1 line-clamp-1 overflow-ellipsis">
        {content.title}
      </div> */}
      
      <div className={`z-10 sticky ${AineeBridge.isInAineeApp() ? 'top-[0px]' : 'top-[68px]'} bg-white border-[#F6F5FA]`}>
        <div className="flex px-4 py-2">
          {tabsData.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-[12px] py-[6px] rounded-[8px] text-[15px] ${activeTab === tab.id ? 'bg-[#F6F5FA] font-semibold' : 'text-[#A7A3A1]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tabsData.map((tab) => (
        <div key={tab.id} style={{display: activeTab === tab.id ? 'block' : 'none'}} className="pb-[150px]">
          {tab.id === tabsData[0].id && 
            <TranscriptList 
              list={content.media_subtitles || []} 
              seekToTime={seekToTime}
            />
          }
          {tab.id === tabsData[1].id && (
            <div className="p-4 text-[15px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content.shownotes ? content.shownotes : 'No show notes available for this audio.'}
              </ReactMarkdown>
            </div>
          )}
        </div>
      ))}

      <div
        ref={dragRef}
        onMouseDown={handleDragStart}
        className="fixed z-[1000] w-96 h-24 bg-stone-900 rounded-2xl shadow-[0px_2px_16px_0px_rgba(0,0,0,0.12)] select-none"
        style={playerStyle}
      >
        <div className="w-full px-4 pt-3 pb-2 flex flex-col gap-2">
          <div className="relative h-0.5 w-full no-drag" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-0.5 outline outline-2 outline-offset-[-1px] outline-neutral-100/30"></div>
            <div 
              className="absolute top-0 left-0 h-0.5 outline outline-2 outline-offset-[-1px] outline-lime-500 cursor-pointer"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              onClick={handleProgressClick}
            ></div>
            <div 
              className="absolute top-[-8px] left-0 right-0 h-[16px] cursor-pointer"
              onClick={handleProgressClick}
            ></div>
          </div>

          <div className="text-white text-sm font-normal truncate">
            {content.title || 'Audio Track'}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <button 
                onClick={togglePlayPause} 
                className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              
              <div className="flex items-center gap-4">
                <button onClick={() => seekRelative(-10)} className="w-6 h-6">
                  <Image 
                    src="/icon/go-backward-10-sec-stroke-rounded.svg" 
                    alt="Rewind 10 seconds" 
                    width={24} 
                    height={24} 
                  />
                </button>
                <button onClick={() => seekRelative(10)} className="w-6 h-6">
                  <Image 
                    src="/icon/go-forward-10-sec-stroke-rounded.svg" 
                    alt="Forward 10 seconds" 
                    width={24} 
                    height={24} 
                  />
                </button>
                <button 
                  onClick={changeSpeed} 
                  className="text-stone-400 text-base"
                >
                  {speedOptions[speedIndex]}x
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <span className="text-white text-xs">{formatTime(currentTime)}</span>
              <span className="text-stone-400 text-xs">/{formatTime(duration)}</span>
            </div>
          </div>
        </div>
        
        <audio
          ref={audioRef}
          src={audioSourceUrl}
          className="hidden"
          preload="auto"
          onCanPlayThrough={() => console.log('Audio is ready to play without buffering')}
        />
      </div>
    </div>
  );
}

export default AudioDetail; 