"use client";

import React from 'react';

export default function LoadError() {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-gray-400 mb-4"
            >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Content failed to load</h3>
            <p className="text-gray-500 max-w-xs">There was an error loading this content. Please try again later.</p>
        </div>
    );
} 