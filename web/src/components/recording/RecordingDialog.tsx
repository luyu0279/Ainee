"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Mic, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import ApiLibs from '@/lib/ApiLibs';
import { toast } from 'sonner';
import { ContentMediaType } from '@/apis/models/ContentMediaType';
import RealtimeTranscription from './RealtimeTranscription';
import { useRecording } from '@/contexts/RecordingContext';

// Helper function to get supported mime type
const getMimeType = (): string => {
  const mimeTypes = [
    'audio/wav',
    'audio/mpeg',  // mp3
    'audio/mp4',   // m4a
  ];
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  
  throw new Error('No supported audio format found');
};

interface RecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBaseId?: string;
  onSuccess?: () => void;
  fileName: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isTranscribing: boolean;
  duration: number;
  remainingTime: number;
  isPending: boolean;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  isInterim?: boolean;
  sequence?: number;
}

const RECORDING_MAX_DURATION = 30 * 60; // 30 minutes in seconds

// Custom DialogContent without close button
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[1100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      )}
      {...props}
    >
      <DialogTitle className="sr-only">Recording Dialog</DialogTitle>
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

export function RecordingDialog({
  open,
  onOpenChange,
  knowledgeBaseId,
  onSuccess,
  fileName
}: RecordingDialogProps) {
  const { startRecording: setGlobalRecording, stopRecording: stopGlobalRecording } = useRecording();
  const [expanded, setExpanded] = useState(true);
  const [uploadingExists, setUploadingExists] = useState(false);
  const [topPosition, setTopPosition] = useState(60);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isTranscribing: false,
    duration: 0,
    remainingTime: RECORDING_MAX_DURATION,
    isPending: false
  });
  const [shouldShow, setShouldShow] = useState(true);
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number>(0);
  const [isClient, setIsClient] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add state tracking for media recorder
  const [isMediaRecorderPaused, setIsMediaRecorderPaused] = useState(false);

  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Check recording time limit
  const checkRecordingTimeLimit = async () => {
    try {
      const response = await ApiLibs.content.canCreateAudioTaskApiContentCanCreateAudioTaskGet();
      if (response.code === "SUCCESS" && response.data) {
        return response.data;
      }
      toast.error('Audio processing quota exceeded. Please upgrade your plan.');
      return false;
    } catch (error) {
      console.error('Error checking audio quota:', error);
      return false;
    }
  };

  // Start recording timer
  const startRecordingTimer = () => {
    recordingTimerRef.current = setInterval(() => {
      setRecordingState(prev => {
        const newDuration = prev.duration + 1;
        const newRemainingTime = RECORDING_MAX_DURATION - newDuration;

        if (newRemainingTime <= 0) {
          stopRecording();
          return prev;
        }

        if (newRemainingTime === 60) {
          toast.warning('Recording will end in 1 minute');
        }

        return {
          ...prev,
          duration: newDuration,
          remainingTime: newRemainingTime
        };
      });
    }, 1000);
  };

  // Stop recording timer
  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Initialize media recorder with event handlers
  const initializeMediaRecorder = (stream: MediaStream) => {
    const selectedMimeType = getMimeType();
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      audioBitsPerSecond: 128000
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    // Add state change handlers
    mediaRecorder.onpause = () => {
      setIsMediaRecorderPaused(true);
      console.log('MediaRecorder paused');
        };

    mediaRecorder.onresume = () => {
      setIsMediaRecorderPaused(false);
      console.log('MediaRecorder resumed');
    };

    mediaRecorder.onstop = () => {
      setIsMediaRecorderPaused(false);
      console.log('MediaRecorder stopped');
    };

    return mediaRecorder;
  };

  // Modify startRecording to use the new initialize function
  const startRecording = async () => {
    try {
      const existingRecording = document.querySelector('[data-recording-dialog]');
      if (existingRecording) {
        toast.error('Another recording is in progress. Please stop it first.');
        const existingDialog = document.querySelector('[data-recording-dialog]');
        if (existingDialog) {
          (existingDialog as HTMLElement).focus();
        }
        return;
      }

      const canRecord = await checkRecordingTimeLimit();
      if (!canRecord) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = initializeMediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Initialize speech recognition before starting
      if (!recognitionRef.current) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          
          recognition.onstart = () => {
            console.log('Speech recognition started');
            setRecordingState(prev => ({ ...prev, isTranscribing: true }));
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (recordingState.isPaused) {
              return;
            }

            const results = Array.from(event.results);
            const latestResult = results[results.length - 1];
            const transcript = latestResult[0].transcript;
            const isFinal = latestResult.isFinal;
            
            const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
            
            setTranscriptionSegments(prev => {
              const withoutInterim = prev.filter(s => !s.isInterim);
              
              if (!isFinal) {
                return [
                  ...withoutInterim,
                  {
                    id: crypto.randomUUID(),
                    text: transcript,
                    timestamp: elapsedTime,
                    isInterim: true
                  }
                ];
              } else {
                return [
                  ...withoutInterim,
                  {
                    id: crypto.randomUUID(),
                    text: transcript,
                    timestamp: elapsedTime,
                    isInterim: false
                  }
                ];
              }
            });
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
              toast.error('Microphone access denied. Please check your browser permissions.');
            }
          };

          recognition.onend = () => {
            console.log('Speech recognition ended');
            if (!recordingState.isPaused) {
              setRecordingState(prev => ({ ...prev, isTranscribing: false }));
            }
            
            if (recordingState.isRecording && !recordingState.isPaused) {
              try {
                recognition.start();
              } catch (e) {
                console.error('Failed to restart recognition:', e);
              }
        }
      };

          recognitionRef.current = recognition;
        }
      }

      // Clear transcription segments right before starting
      setTranscriptionSegments([]);

      // Start media recorder
      mediaRecorder.start(1000);

      // Start speech recognition
      if (recognitionRef.current) {
        try {
        recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
        }
      }

      setRecordingState(prev => ({ 
        ...prev, 
        isRecording: true,
        isTranscribing: true 
      }));
      startRecordingTimer();
      startTimeRef.current = Date.now();
      setGlobalRecording();

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check your microphone permissions.');
    }
  };

  // Pause recording with proper state management
  const pauseRecording = async () => {
    if (!mediaRecorderRef.current || !recordingState.isRecording || recordingState.isPaused) {
      return;
    }

    try {
      // Pause media recorder
      mediaRecorderRef.current.pause();
      
      // Stop recording timer
      stopRecordingTimer();

      // Pause speech recognition
      if (recognitionRef.current) {
        try {
        recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }

      // Update recording state
      setRecordingState(prev => ({ 
        ...prev, 
        isPaused: true,
        isTranscribing: false 
      }));

      console.log('Recording paused successfully');
    } catch (error) {
      console.error('Error pausing recording:', error);
      toast.error('Failed to pause recording');
    }
  };

  // Resume recording with proper state management
  const resumeRecording = async () => {
    if (!mediaRecorderRef.current || !recordingState.isPaused) {
      return;
    }

    try {
      // Resume media recorder
      mediaRecorderRef.current.resume();
      
      // Resume recording timer from where it was paused
      startRecordingTimer();
      
      // Update start time reference to maintain correct timing
      startTimeRef.current = Date.now() - (recordingState.duration * 1000);

      // Resume speech recognition
      if (recognitionRef.current) {
        try {
          // Resume the existing recognition instance
        recognitionRef.current.start();
          console.log('Speech recognition resumed');
        } catch (error) {
          console.error('Error resuming speech recognition:', error);
          // If resuming fails, create a new instance with the same settings
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          
          // Copy over the existing event handlers
          recognition.onstart = recognitionRef.current.onstart;
          recognition.onresult = recognitionRef.current.onresult;
          recognition.onerror = recognitionRef.current.onerror;
          recognition.onend = recognitionRef.current.onend;
          
          // Update reference and start
          recognitionRef.current = recognition;
          recognition.start();
        }
      }

      // Update recording state
      setRecordingState(prev => ({ 
        ...prev, 
        isPaused: false,
        isTranscribing: true 
      }));

      console.log('Recording resumed successfully');
    } catch (error) {
      console.error('Error resuming recording:', error);
      toast.error('Failed to resume recording');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      try {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      stopRecordingTimer();
        stopGlobalRecording();

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      setTranscriptionSegments([]);

      const mimeType = mediaRecorderRef.current.mimeType;
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      let fileExtension = '.wav';
      if (mimeType.includes('mpeg')) {
        fileExtension = '.mp3';
      } else if (mimeType.includes('mp4')) {
        fileExtension = '.m4a';
      }

      const audioFile = new File([audioBlob], `${fileName}${fileExtension}`, { type: mimeType });

      setRecordingState(prev => ({ ...prev, isPending: true }));

        const createResponse = await ApiLibs.content.batchCreateApiContentBatchCreatePost([{
          media_type: ContentMediaType.AUDIO_MICROPHONE,
          file_name: audioFile.name,
          kb_uid: knowledgeBaseId || null
        }]);

        if (createResponse.code === "SUCCESS" && createResponse.data?.[0]) {
          const uid = createResponse.data[0].uid;

          const uploadResponse = await ApiLibs.content.uploadAndPendsApiContentUploadAndPendPost({
            uid,
            file: audioFile
          });

          if (uploadResponse.code === "SUCCESS") {
            toast.success('Recording uploaded successfully');
            onSuccess?.();
          } else {
            throw new Error(uploadResponse.message || 'Upload failed');
          }
        } else {
          throw new Error('Failed to create content');
        }
      } catch (error) {
        console.error('Error processing recording:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to process recording');
      } finally {
        setRecordingState({
          isRecording: false,
          isPaused: false,
          isTranscribing: false,
          duration: 0,
          remainingTime: RECORDING_MAX_DURATION,
          isPending: false
        });
        // First hide the minimized view
        setShouldShow(false);
        // Then close the dialog
        onOpenChange(false);
      }
    }
  };

  // Add cancelRecording function
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      // Stop media recorder and tracks
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Stop recording timer
      stopRecordingTimer();
      
      // Stop global recording state
      stopGlobalRecording();
      
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Reset all states
      setRecordingState({
        isRecording: false,
        isPaused: false,
        isTranscribing: false,
        duration: 0,
        remainingTime: RECORDING_MAX_DURATION,
        isPending: false
      });
      
      // Clear transcription segments
      setTranscriptionSegments([]);

      // Clear recorded audio chunks
      audioChunksRef.current = [];
      
      // Hide the dialog
      setShouldShow(false);
      onOpenChange(false);
    }
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopRecordingTimer();
      stopGlobalRecording();
      setShouldShow(false);
    };
  }, [stopGlobalRecording]);

  // Start recording automatically when dialog opens
  useEffect(() => {
    if (open && !recordingState.isRecording) {
      // Clear previous transcription segments before starting new recording
      setTranscriptionSegments([]);
      startRecording();
    }
  }, [open]);

  // Check for Uploading window existence
  useEffect(() => {
    const checkUploadingWindow = () => {
      const uploadingWindow = document.querySelector('[data-uploading-window]');
      setUploadingExists(!!uploadingWindow);
      setTopPosition(uploadingWindow ? 120 : 60); // 120px if Uploading exists, 60px if not
    };

    // Initial check
    checkUploadingWindow();

    // Create observer to watch for Uploading window changes
    const observer = new MutationObserver(checkUploadingWindow);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Add effect to handle shouldShow based on open prop
  useEffect(() => {
    if (open) {
      setShouldShow(true);
      setExpanded(true);
    }
  }, [open]);

  // Modify handleOpenChange to handle shouldShow
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Only handle actual dialog close, not minimization
      if (!recordingState.isRecording) {
        setShouldShow(false);
        onOpenChange(false);
      }
      return;
    }
    onOpenChange(true);
  };

  // Add separate handler for expand/collapse
  const handleExpandChange = () => {
    setExpanded(!expanded);
  };

  // Add useEffect to handle client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Modify handleTranscript to use useEffect for timestamp
  const handleTranscript = (text: string, isFinal: boolean) => {
    if (!isClient) return;
    
    const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setTranscriptionSegments(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        timestamp: elapsedTime,
        isInterim: !isFinal
      }
    ]);
  };

  // Return null if shouldShow is false
  if (!shouldShow) {
    return null;
  }

  // Render minimized view when not expanded
  if (!expanded) {
    return (
      <div 
        className="fixed right-4 z-[1100] transition-all duration-300"
        style={{ top: `${topPosition}px` }}
      >
        <div
          role="button"
          tabIndex={0}
          className="bg-white shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-all duration-200 border border-gray-200"
          onClick={handleExpandChange}
        >
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            recordingState.isRecording 
              ? "bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite]" 
              : "bg-gray-300"
          )} />
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-sm truncate max-w-[150px]">
              {fileName}
            </span>
            <span className="font-medium text-sm">
              {formatTime(recordingState.duration)}
            </span>
          </div>
          <div className="ml-2 p-1 hover:bg-gray-100 rounded-full">
            <ChevronUp className="h-4 w-4 text-gray-500" />
          </div>
        </div>
      </div>
    );
  }

  // Modify the return statement to handle SSR
  if (!isClient) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleOpenChange}
      data-recording-dialog
    >
      <CustomDialogContent 
        className={cn(
          "p-0 gap-0 transition-all duration-200 ease-in-out",
          expanded ? "max-h-[80vh]" : "max-h-[120px]"
        )}
        style={{
          top: `${topPosition}%`,
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between py-4 px-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Mic className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Recording</span>
              </div>
            </div>
            <button
              onClick={handleExpandChange}
              className="text-gray-500 hover:text-gray-700"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          <div className="space-y-4 py-4">
            {recordingState.isPending ? (
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <div className="text-sm text-muted-foreground">
                  AI is analyzing...
                  <br />
                  Approx. 1-5 min
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 flex justify-between items-center">
                  <div className="text-xl font-bold">
                  {fileName}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold">
                    {formatTime(recordingState.duration)}
                    </div>
                    {recordingState.isRecording && (
                      <div
                        role="button"
                        tabIndex={0}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        onClick={recordingState.isPaused ? resumeRecording : pauseRecording}
                      >
                        {recordingState.isPaused ? (
                          <Play className="h-5 w-5 text-primary" />
                        ) : (
                          <Pause className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                  {recordingState.remainingTime <= 60 && (
                  <div className="text-red-500 text-sm px-4">
                      Time running out ({recordingState.remainingTime}s)...
                    </div>
                  )}

                <div className="relative">
                    <div className="space-y-2">
                        <RealtimeTranscription
                            isRecording={recordingState.isRecording}
                            isPaused={recordingState.isPaused}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 px-4">
                  {/* Always show Cancel button */}
                  <div
                    role="button"
                    tabIndex={0}
                    className=" inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
                    onClick={cancelRecording}
                  >
                    Cancel
                  </div>

                  {/* Show Pause/Resume and Stop buttons only when recording is active */}
                  {recordingState.isRecording && (
                    <>
                    
                      <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "inline-flex items-center justify-center rounded-md text-sm px-2 font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-4",
                          "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        onClick={stopRecording}
                      >
                        Stop & Submit
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
} 