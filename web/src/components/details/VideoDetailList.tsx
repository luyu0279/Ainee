"use client";

import React, { useState, useEffect, useRef } from 'react';
import { tabsData } from '../TranscriptHearder';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ApiLibs from '@/lib/ApiLibs';
import { toast } from 'react-hot-toast';

interface VideoDetailListProps {
    contentDetails: any;
    seekToTime: (seconds: number) => void;
    activeTab: string;
    setActiveTab: (id: string) => void;
}

export default function VideoDetailList({ contentDetails, seekToTime, activeTab, setActiveTab }: VideoDetailListProps) {
    console.log('[VideoDetailList] contentDetails:', contentDetails);
    return (
        <div className="relative">
            {/* <div className="text-[17px] font-bold px-4 pt-2 pb-2 line-clamp-1 overflow-ellipsis">{contentDetails.title}</div> */}
            
            <div className="sticky top-0 z-40">
                <div className="border-[#F6F5FA] bg-white">
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
            </div>

            <div className="pb-[200px]">
                {tabsData.map((tab) => (
                    <div key={tab.id} style={{display: activeTab === tab.id ? 'block' : 'none'}}>
                        {tab.id === tabsData[0].id && <TranscriptSection 
                            subtitles={contentDetails.media_subtitles} 
                            contentUid={contentDetails.uid} 
                            isOwned={!!contentDetails.owned}
                            seekToTime={seekToTime} 
                        />}
                        {tab.id === tabsData[1].id && (
                            <div className="p-4 text-[15px] pb-[60px]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {contentDetails.shownotes ? contentDetails.shownotes : 'No showNotes'}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Transcript section component
function TranscriptSection({ 
    subtitles, 
    contentUid, 
    isOwned,
    seekToTime
}: { 
    subtitles: any[] | undefined, 
    contentUid?: string,
    isOwned: boolean,
    seekToTime: (seconds: number) => void
}) {
    console.log('[TranscriptSection] isOwned:', isOwned);
    const [isGenerating, setIsGenerating] = useState(false);
    const [dots, setDots] = useState('');
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
            }
        };
    }, []);
    
    // Animate the dots in "Generating..."
    useEffect(() => {
        if (!isGenerating) return;
        
        const interval = setInterval(() => {
            setDots(prev => {
                if (prev.length >= 3) return '';
                return prev + '.';
            });
        }, 500);
        
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Function to check processing status and refresh when complete
    const pollForCompletion = async (uid: string) => {
        try {
            const maxAttempts = 30; // Maximum number of polling attempts
            const pollInterval = 5000; // Poll every 5 seconds
            let attempts = 0;
            
            const checkStatus = async () => {
                if (attempts >= maxAttempts) {
                    toast.error("Transcript generation is taking longer than expected. Please refresh the page later.");
                    setIsGenerating(false);
                    return;
                }
                
                attempts++;
                
                try {
                    const response = await ApiLibs.content.getContentByUidApiContentUidUidGet(uid);
                    if (response.code === "SUCCESS" && response.data) {
                        // Check if processing is complete, regardless of subtitles
                        if (response.data.processing_status === "completed") {
                            // Processing is complete - end polling and refresh page
                            if (response.data.media_subtitles && response.data.media_subtitles.length > 0) {
                                toast.success("Transcript generation completed successfully!");
                            } else {
                                toast.success("Processing completed, but no transcripts were found.");
                            }
                            if (pollTimerRef.current) {
                                clearTimeout(pollTimerRef.current);
                                pollTimerRef.current = null;
                            }
                            setTimeout(() => {
                                window.location.reload();
                            }, 500);
                            return;
                        } else if (response.data.processing_status === "failed") {
                            toast.error("Transcript generation failed. Please try again later.");
                            setIsGenerating(false);
                            return;
                        }
                    }
                    pollTimerRef.current = setTimeout(checkStatus, pollInterval);
                } catch (error) {
                    pollTimerRef.current = setTimeout(checkStatus, pollInterval);
                }
            };
            pollTimerRef.current = setTimeout(checkStatus, pollInterval);
        } catch (error) {
            setIsGenerating(false);
        }
    };
    
    const handleGenerateTranscript = async () => {
        if (!contentUid || isGenerating) return;
        
        try {
            setIsGenerating(true);
            const response = await ApiLibs.content.retryYoutubeTranscriptGetApiContentRetryYoutubeTranscriptGetGet(contentUid);
            if (response.code === "SUCCESS") {
                toast.success("Transcript generation started successfully");
                pollForCompletion(contentUid);
            } else {
                toast.error(response.message || "Failed to generate transcript");
                setIsGenerating(false);
            }
        } catch (error) {
            toast.error("Failed to generate transcript");
            setIsGenerating(false);
        }
    };
    
    if (!subtitles || subtitles.length === 0) {
        return (
            <div className="px-4 py-2 text-center text-gray-500">
                No transcript available for this video.
                {isOwned && (
                    <>
                        {!isGenerating ? (
                            <span 
                                className="text-blue-500 hover:text-blue-600 cursor-pointer ml-1 hover:underline"
                                onClick={handleGenerateTranscript}
                            >
                                Generate Transcript by Ainee
                            </span>
                        ) : (
                            <span className="text-blue-500 ml-1">
                                Generating{dots}
                            </span>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="px-4">
            {subtitles.map((item, index) => (
                <div
                    key={index}
                    className="py-2 border-b border-[#F6F5FA]"
                >
                    <div 
                        className="text-[13px] text-[#A7A3A1] mb-1 inline-block cursor-pointer hover:text-blue-500 hover:underline"
                        onClick={() => seekToTime(item.start)}
                        title="点击跳转到此时间点"
                    >
                        {formatTime(item.start)} - {formatTime(item.end)}
                    </div>
                    <div className="text-[15px]">
                        {item.text}
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
} 