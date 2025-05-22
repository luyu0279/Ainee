"use client";

import React from 'react';

export interface TabItem {
    id: string;
    label: string;
}

export const tabsData: TabItem[] = [
    { id: 'transcript', label: 'Transcript' },
    { id: 'showNotes', label: 'ShowNotes' },
];

interface TranscriptHearderProps {
    contentDetails: any;
    activeTab: string;
    setActiveTab: (id: string) => void;
}

export default function TranscriptHearder({ contentDetails, activeTab, setActiveTab }: TranscriptHearderProps) {
    return (
        <div className="border-b border-[#F6F5FA] bg-white z-10 overflow-x-auto py-2">
            <div className="text-[17px] font-bold px-4 mb-2 line-clamp-1 overflow-ellipsis">{contentDetails.title}</div>
            <div className="flex px-4">
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
    );
} 