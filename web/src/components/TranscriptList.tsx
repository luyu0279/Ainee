"use client";

import React from 'react';

interface SubtitleItem {
    start: number;
    end: number;
    text: string;
}

interface TranscriptListProps {
    list: SubtitleItem[];
    seekToTime: (time: number, autoPlay?: boolean) => void;
}

export default function TranscriptList({ list, seekToTime }: TranscriptListProps) {
    if (!list || list.length === 0) {
        return (
            <div className="px-4 py-2 text-center text-gray-500">
                No transcript available for this audio
            </div>
        );
    }
    
    return (
        <div className="px-4 pb-[180px]">
            {list.map((item, index) => (
                <div
                    key={index}
                    className="py-2 border-b border-[#F6F5FA]"
                >
                    <div 
                        className="text-[13px] text-[#A7A3A1] mb-1 inline-block cursor-pointer hover:text-blue-500"
                        onClick={() => seekToTime(item.start, true)}
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