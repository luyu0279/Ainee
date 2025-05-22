"use client";

import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallbackColor?: string;
  className?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  fallbackColor = '#0EA5E9',
  className = ''
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  return error ? (
    <div 
      className={className}
      style={{ 
        backgroundColor: fallbackColor,
        minHeight: '300px',
        aspectRatio: '1/1'
      }}
      aria-label={alt}
    />
  ) : (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
    />
  );
} 