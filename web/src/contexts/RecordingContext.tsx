"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface RecordingContextType {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(() => {
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  return (
    <RecordingContext.Provider value={{ isRecording, startRecording, stopRecording }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
} 