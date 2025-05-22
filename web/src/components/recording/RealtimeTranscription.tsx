"use client";

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface RealtimeTranscriptionProps {
    isRecording: boolean;
    isPaused: boolean;
    onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
    language?: string;
    showHeader?: boolean;
}

export default function RealtimeTranscription({ 
    isRecording, 
    isPaused,
    onTranscriptUpdate,
    language = 'en-us',
    showHeader = true
}: RealtimeTranscriptionProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = React.useState(false);
    const [autoScroll, setAutoScroll] = React.useState(true);
    const lastTranscript = useRef('');

    const {
        transcript,
        listening,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable,
        interimTranscript,
        finalTranscript
    } = useSpeechRecognition({
        clearTranscriptOnListen: false
    });

    // Handle scroll events to show/hide scroll button
    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
            setAutoScroll(isNearBottom);
        }
    };

    // 处理转录文本更新
    useEffect(() => {
        if (!transcript) return;

        // 获取新增的文本部分
        const newText = transcript.slice(lastTranscript.current.length);
        if (newText) {
            onTranscriptUpdate?.(newText, finalTranscript.includes(newText));
            lastTranscript.current = transcript;
        }
    }, [transcript, finalTranscript]);

    // 处理录音停止逻辑
    useEffect(() => {
        if (!isRecording) {
            lastTranscript.current = '';
        }
    }, [isRecording]);

    // Start/stop listening based on isRecording prop
    useEffect(() => {
        if (!browserSupportsSpeechRecognition) {
            console.warn('Browser does not support speech recognition.');
            return;
        }

        if (isRecording && !isPaused && !listening) {
            SpeechRecognition.startListening({ 
                continuous: true,
                interimResults: true,
                language: language
            }).catch(error => {
                console.error('Error starting speech recognition:', error);
            });
        } else if ((!isRecording || isPaused) && listening) {
            SpeechRecognition.stopListening().catch(error => {
                console.error('Error stopping speech recognition:', error);
            });
        }

        return () => {
            if (listening) {
                SpeechRecognition.stopListening().catch(error => {
                    console.error('Error stopping speech recognition:', error);
                });
            }
        };
    }, [isRecording, isPaused, listening, browserSupportsSpeechRecognition, language]);

    // Auto-scroll to bottom when new content is added
    useEffect(() => {
        if (scrollContainerRef.current && isRecording && !isPaused && autoScroll) {
            const scrollContainer = scrollContainerRef.current;
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }, [transcript, isRecording, isPaused, autoScroll]);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            setAutoScroll(true);
        }
    };

    if (!browserSupportsSpeechRecognition) {
        return (
            <div className="text-center p-4 text-gray-500">
                Your browser does not support speech recognition.
                Please try using Chrome or Edge.
            </div>
        );
    }

    if (!isMicrophoneAvailable) {
        return (
            <div className="text-center p-4 text-gray-500">
                Please allow microphone access to use speech recognition.
            </div>
        );
    }

    if (!isRecording) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="max-h-[300px] overflow-y-auto bg-gray-50 rounded-lg p-4 scroll-smooth"
                >
                    <div className="min-h-[40px]">
                        {/* 状态指示器 */}
                        <div className="flex items-center mb-2">
                            <div className={cn(
                                "text-xs font-medium px-2 py-1 rounded-full transition-all duration-200",
                                isPaused ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                            )}>
                                {isPaused ? 'Paused' : 'Transcribing'}
                            </div>
                        </div>

                        {/* 转录文本 */}
                        <div className={cn(
                            "bg-white border border-gray-100 shadow-sm rounded-lg p-3 transition-all duration-200",
                            "animate-fade-in"
                        )}>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {transcript || (
                                    <div className="flex items-center space-x-2 text-gray-400">
                                        <div className="flex space-x-1">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                        </div>
                                        <span>Waiting for speech...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-gray-500 px-2 pt-3">
                            Ainee offers real-time English transcription and accurately captures all languages after recording.
                            </div>
                        </div>
                    </div>
                </div>
                
                {showScrollButton && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-4 right-4 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors duration-200 border border-gray-200"
                        title="Scroll to latest"
                    >
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                    </button>
                )}
            </div>
        </div>
    );
}

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Add this to your global CSS file (app/globals.css)
// @keyframes fadeIn {
//   from { opacity: 0; transform: translateY(5px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fade-in {
//   animation: fadeIn 0.3s ease-out forwards;
// } 