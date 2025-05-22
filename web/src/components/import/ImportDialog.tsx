"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckIcon, UploadIcon, LinkIcon, XIcon, Loader2, MicIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ApiLibs from '@/lib/ApiLibs';
import { toast } from 'sonner';
import { useFileUpload } from '@/contexts/FileUploadContext';
import { isValidUrl } from '@/lib/utils';
import indexedDBService from '@/lib/IndexedDBService';
import { RecordingDialog } from '@/components/recording/RecordingDialog';
import { cn } from '@/lib/utils';
import { FileStatus } from '@/types/upload';
import { useRecording } from '@/contexts/RecordingContext';

// Define local types to match API models
interface KnowledgeBaseResponse {
  uid: string;
  name: string;
  description?: string | null;
  visibility?: string;
  owned?: boolean;
  subscribed?: boolean;
}

enum KnowledgeBaseType {
  OWNED = 'owned',
  SUBSCRIBED = 'subscribed',
  ALL = 'all'
}

interface MediaItem {
  media_type: ContentMediaType;
  file_name: string;
  kb_uid?: string | null;
}

enum ContentMediaType {
  ARTICLE = 'article',
  VIDEO = 'video',
  TWITTER = 'twitter',
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  TEXT = 'text',
  PPT = 'ppt',
  AUDIO = 'audio',
  SPOTIFY_AUDIO = 'spotify_audio',
  AUDIO_INTERNAL = 'audio_internal',
  AUDIO_MICROPHONE = 'audio_microphone',
  IMAGE = 'image',
  TEXT_FILE = 'text_file'
}

// Filter rules for supported file formats
const SUPPORTED_FORMATS = [
  'docx', 'doc', 'xlsx', 'xls', 'ppt', 'pptx', 'pdf', 'txt',
  'jpeg', 'jpg', 'png', 'csv', 'json', 'eml', 'html', 'md',
  'mp3', 'wav', 'm4a', 'ogg', 'aac'
];

// Add language interface
interface Language {
  code: string;
  name: string;
  locale: string;
}

// Add supported languages constant
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'zh', name: 'Chinese', locale: 'zh-CN' },
  { code: 'ja', name: 'Japanese', locale: 'ja-JP' },
  { code: 'ko', name: 'Korean', locale: 'ko-KR' },
  { code: 'es', name: 'Spanish', locale: 'es-ES' },
  { code: 'fr', name: 'French', locale: 'fr-FR' },
  { code: 'de', name: 'German', locale: 'de-DE' },
  { code: 'it', name: 'Italian', locale: 'it-IT' },
  { code: 'pt', name: 'Portuguese', locale: 'pt-PT' },
  { code: 'ru', name: 'Russian', locale: 'ru-RU' },
  { code: 'ar', name: 'Arabic', locale: 'ar-SA' },
  { code: 'hi', name: 'Hindi', locale: 'hi-IN' },
  { code: 'bn', name: 'Bengali', locale: 'bn-BD' },
  { code: 'id', name: 'Indonesian', locale: 'id-ID' },
  { code: 'ms', name: 'Malay', locale: 'ms-MY' },
  { code: 'th', name: 'Thai', locale: 'th-TH' },
  { code: 'vi', name: 'Vietnamese', locale: 'vi-VN' },
  { code: 'nl', name: 'Dutch', locale: 'nl-NL' },
  { code: 'pl', name: 'Polish', locale: 'pl-PL' },
  { code: 'tr', name: 'Turkish', locale: 'tr-TR' }
];

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKnowledgeBaseId?: string;
  onSuccess?: () => void;
}

interface KnowledgeBase {
  uid: string;
  name: string;
  description?: string | null;
  visibility?: string;
  owned?: boolean;
  subscribed?: boolean;
}

// Get Content Media Type based on file extension
const getContentMediaType = (filename: string): ContentMediaType => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  if (['jpeg', 'jpg', 'png'].includes(extension)) {
    return ContentMediaType.IMAGE;
  } else if (['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(extension)) {
    return ContentMediaType.AUDIO;
  } else if (['docx', 'doc'].includes(extension)) {
    return ContentMediaType.WORD;
  } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
    return ContentMediaType.EXCEL;
  } else if (['ppt', 'pptx'].includes(extension)) {
    return ContentMediaType.PPT;
  } else if (extension === 'pdf') {
    return ContentMediaType.PDF;
  } else {
    // For txt, md, json, html, etc.
    return ContentMediaType.TEXT;
  }
};

export function ImportDialog({
  open,
  onOpenChange,
  defaultKnowledgeBaseId,
  onSuccess
}: ImportDialogProps) {
  const { isRecording } = useRecording();
  const [activeTab, setActiveTab] = useState('files');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [isLoadingKbs, setIsLoadingKbs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addUpload, updateUploadProgress, updateUploadStatus } = useFileUpload();

  // Add state for recording dialog
  const [showRecordingDialog, setShowRecordingDialog] = useState(false);
  const [recordingFileName, setRecordingFileName] = useState('');

  // 分发导入成功事件的函数
  const dispatchImportSuccessEvent = () => {
    // 创建自定义事件
    const event = new CustomEvent('ainee:import:success', {
      detail: { timestamp: Date.now() }
    });
    // 在window上分发事件
    window.dispatchEvent(event);
    // 如果有onSuccess回调，也执行它
    if (onSuccess) {
      onSuccess();
    }
  };

  // Reset form and set default knowledge base when dialog opens
  useEffect(() => {
    if (open) {
      loadAvailableKnowledgeBases();
      if (defaultKnowledgeBaseId) {
        setSelectedKnowledgeBases([defaultKnowledgeBaseId]);
      }
    }
  }, [open, defaultKnowledgeBaseId]);

  // Load available knowledge bases
  const loadAvailableKnowledgeBases = async () => {
    try {
      setIsLoadingKbs(true);
      const response = await ApiLibs.knowledgeBase.getKnowledgeBaseListApiKbListOwnGet(
        KnowledgeBaseType.OWNED
      );

      if (response.code === "SUCCESS" && response.data) {
        // Map response to KnowledgeBase format
        const kbs: KnowledgeBase[] = (response.data.knowledge_bases || []).map((kb: KnowledgeBaseResponse) => ({
          uid: kb.uid,
          name: kb.name,
          description: kb.description,
          visibility: kb.visibility,
          owned: kb.owned,
          subscribed: kb.subscribed
        }));

        setAvailableKnowledgeBases(kbs);
      } else {
        console.error("Failed to load knowledge bases:", response);
        toast.error("Failed to load knowledge bases");
      }
    } catch (error) {
      console.error("Error loading knowledge bases:", error);
      toast.error("Failed to load knowledge bases");
    } finally {
      setIsLoadingKbs(false);
    }
  };

  // Toggle knowledge base selection - updated for radio button (single selection)
  const handleKnowledgeBaseSelection = (kbId: string) => {
    setSelectedKnowledgeBases([kbId]);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        return SUPPORTED_FORMATS.includes(extension);
      });

      if (validFiles.length !== files.length) {
        toast.warning("Some files were not added because they are not supported");
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);

      // 不在这里添加到上传状态，而是等到实际上传时再添加
    }
  };

  // Handle drag and drop functionality
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        return SUPPORTED_FORMATS.includes(extension);
      });

      if (validFiles.length !== files.length) {
        toast.warning("Some files were not added because they are not supported");
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setUrlInput(url);

    if (url && !isValidUrl(url)) {
      setUrlError('Please enter a valid URL');
    } else {
      setUrlError('');
    }
  };

  // Process the upload for a file
  const processFileUpload = async (file: File, mediaType: ContentMediaType, kb_uid?: string) => {
    try {
      // Step 1: Create content ID
      const createResponse = await ApiLibs.content.batchCreateApiContentBatchCreatePost([{
        media_type: mediaType,
        file_name: file.name,
        kb_uid: kb_uid || null
      }]);

      if (createResponse.code !== "SUCCESS" || !createResponse.data || createResponse.data.length === 0) {
        throw new Error(createResponse.message || "Failed to create content");
      }

      const contentItem = createResponse.data[0];
      const uid = contentItem.uid;

      // Add to upload status
      addUpload({
        uid,
        fileName: file.name,
        mediaType,
        knowledgeBaseId: kb_uid,
        sourceUrl: mediaType === ContentMediaType.VIDEO ||
                  mediaType === ContentMediaType.AUDIO ||
                  mediaType === ContentMediaType.SPOTIFY_AUDIO ? file.name : undefined
      });

      // Update status to uploading
      updateUploadStatus(uid, FileStatus.UPLOADING);
      updateUploadProgress(uid, 0);

      try {
      // Use ApiLibs to upload the file
      const uploadResponse = await ApiLibs.content.uploadAndPendsApiContentUploadAndPendPost({
        uid: uid,
        file: file,
        audio_language: mediaType === ContentMediaType.AUDIO ? 'en' : undefined
      });

      if (uploadResponse.code === "SUCCESS") {
          updateUploadStatus(uid, FileStatus.UPLOAD_SUCCEED);
        updateUploadProgress(uid, 100);

          // Store content ID in IndexedDB
          try {
            await indexedDBService.saveContentId(uid);
          } catch (dbError) {
            console.error("Failed to save content ID to IndexedDB:", dbError);
          }

          return uid;
      } else {
          throw new Error(uploadResponse.message || "Upload failed");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        updateUploadStatus(uid, FileStatus.UPLOAD_FAILED, errorMessage);
        throw error;
      }
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }
  };

  // Process URL import
  const processUrlImport = async (url: string, kb_uid?: string) => {
    const tempId = `url-${Date.now()}`;

    try {
      // Add to uploads tracking first with a temporary ID
      addUpload({
        uid: tempId,
        fileName: url,
        mediaType: ContentMediaType.ARTICLE,
        sourceUrl: url,
        knowledgeBaseId: kb_uid
      });

      // Directly call createByUrl API
      const response = await ApiLibs.content.createByUrlApiContentCreateByUrlPost({
        url: url
      });

      if (response.code === "SUCCESS" && response.data) {
        const uid = response.data.uid;

        // Store content ID in IndexedDB
        try {
          await indexedDBService.saveContentId(uid);
        } catch (dbError) {
          console.error("Failed to save content ID to IndexedDB:", dbError);
          // Continue anyway
        }

        // If we have a knowledge base selected, associate the content with it
        if (kb_uid) {
          try {
            await ApiLibs.knowledgeBase.addContentsToKbApiKbAddContentsPost({
              content_uids: [uid],
              kb_uid: kb_uid
            });
          } catch (error) {
            console.error("Error associating content with knowledge base:", error);
            // Continue anyway since the content was created successfully
          }
        }

        updateUploadStatus(tempId, FileStatus.UPLOAD_SUCCEED);
        return uid;
      } else {
        updateUploadStatus(tempId, FileStatus.UPLOAD_FAILED, response.message || "Failed to import URL");
        return null;
      }
    } catch (error) {
      console.error("Error importing URL:", error);
      updateUploadStatus(tempId, FileStatus.UPLOAD_FAILED, "Failed to import URL");
      return null;
    }
  };

  // Handle the save/import button click
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (activeTab === 'recording') {
      if (!recordingFileName.trim()) {
        toast.error("Please enter a recording name");
        return;
      }
      setShowRecordingDialog(true);
      onOpenChange(false);
      return;
    }

    if (activeTab === 'files' && selectedFiles.length === 0) {
      toast.error("Please select at least one file to import");
      return;
    }

    if (activeTab === 'urls') {
      const url = urlInput.trim();
      if (!url) {
        toast.error("Please enter a URL to import");
        return;
      }

      if (!isValidUrl(url)) {
        setUrlError('Please enter a valid URL');
        return;
      }
    }

    const kbId = selectedKnowledgeBases.length > 0 ? selectedKnowledgeBases[0] : undefined;

    try {
      setIsSubmitting(true);

      if (activeTab === 'files') {
        try {
          // Process all files in parallel
          const uploadPromises = selectedFiles.map(file => {
            const mediaType = getContentMediaType(file.name);
            return processFileUpload(file, mediaType, kbId);
          });

          const uploadResults = await Promise.all(uploadPromises);

          // Close dialog immediately after starting uploads
          onOpenChange(false);
          setSelectedFiles([]);

          setTimeout(() => dispatchImportSuccessEvent(), 500);
        } catch (error) {
          console.error("Error processing files:", error);
          toast.error("There was an error processing some files");
        }
      } else if (activeTab === 'urls') {
        try {
          await processUrlImport(urlInput.trim(), kbId);
          toast.success("URL import process started");
          onOpenChange(false);
          setUrlInput('');

          setTimeout(() => onSuccess?.(), 2000);
        } catch (error) {
          console.error("Error processing URL:", error);
          toast.error("There was an error importing the URL");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] min-h-[450px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Content</DialogTitle>
        </DialogHeader>

        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="border-b mb-4">
            <div className="flex">
              <button
                className={`px-4 py-2 flex items-center gap-2 border-b-2 ${
                  activeTab === 'files' 
                    ? 'border-primary text-primary font-medium' 
                    : 'border-transparent text-muted-foreground'
                }`}
                onClick={() => setActiveTab('files')}
              >
                <UploadIcon className="h-4 w-4" />
                Import Files
              </button>
              <button
                className={`px-4 py-2 flex items-center gap-2 border-b-2 ${
                  activeTab === 'urls' 
                    ? 'border-primary text-primary font-medium' 
                    : 'border-transparent text-muted-foreground'
                }`}
                onClick={() => setActiveTab('urls')}
              >
                <LinkIcon className="h-4 w-4" />
                Import URLs
              </button>
                <button
                  className={`px-4 py-2 flex items-center gap-2 border-b-2 ${
                    activeTab === 'recording' 
                      ? 'border-primary text-primary font-medium' 
                      : 'border-transparent text-muted-foreground'
                  }`}
                  onClick={() => setActiveTab('recording')}
                >
                  <MicIcon className="h-4 w-4" />
                  Record Audio
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'files' && (
              <div className="space-y-4 min-h-[200px]">
                {/* Files import area */}
                <div
                  className="border-2 border-dashed rounded-lg py-0 px-6 text-center cursor-pointer hover:bg-muted/50 transition-colors h-[120px] flex items-center justify-center"
                  onClick={triggerFileInput}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept={SUPPORTED_FORMATS.map(format => `.${format}`).join(',')}
                  />
                  <div className="flex flex-col items-center gap-1">
                    <UploadIcon className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag & drop or Browse files here</p>
                  </div>
                </div>

                {selectedFiles.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center px-4">
                    Supports importing common file formats (pdf, word, ppt, excel, txt, etc.),
                    audio files (like mp3, wav, m4a, etc.), and images (like jpg, png, etc.)
                  </div>
                )}

                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Selected Files</h4>
                    <ScrollArea className="h-[120px]">
                      <div className="space-y-0">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between py-0 px-2 bg-muted/30 rounded-md">
                            <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                            >
                              <XIcon className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'urls' && (
              <div className="space-y-4 min-h-[200px]">
                <div className="border-2 border-dashed rounded-lg py-0 px-6 text-center h-[120px] flex flex-col justify-center items-center">
                  <Input
                    placeholder="Paste the link you want to import here"
                    value={urlInput}
                    onChange={handleUrlChange}
                    className={`${urlError ? "border-red-500" : ""} max-w-xl w-full`}
                  />
                  {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
                </div>

                <div className="text-xs text-muted-foreground text-center px-4">
                Intelligent parsing for YouTube, Spotify podcasts, and Twitter links. Supports AI recognition of subtitles for audio and video on these sites.
                </div>
              </div>
            )}

              {activeTab === 'recording' && (
                <div className="space-y-4 min-h-[200px]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recording Name</h4>
                      <Input
                        placeholder="Enter recording name (required)"
                        value={recordingFileName}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          setRecordingFileName(value);
                        }}
                        className={cn("w-full", {
                          "border-red-500": activeTab === 'recording' && recordingFileName.length === 0
                        })}
                        required
                      />
                      {activeTab === 'recording' && recordingFileName.length === 0 && (
                        <p className="text-xs text-red-500">Please enter a recording name</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Knowledge base selection area */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Add to Knowledge Bases</h4>

              {isLoadingKbs ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">Loading knowledge bases...</p>
                </div>
              ) : (
                <>
                  {availableKnowledgeBases.length > 0 ? (
                    <ScrollArea className="h-[180px] border rounded-md p-4">
                      <RadioGroup
                        value={selectedKnowledgeBases.length > 0 ? selectedKnowledgeBases[0] : ""}
                        onValueChange={handleKnowledgeBaseSelection}
                      >
                        <div className="space-y-2">
                          {availableKnowledgeBases.map((kb) => (
                            <div key={kb.uid} className="flex items-center space-x-2">
                              <RadioGroupItem
                                id={kb.uid}
                                value={kb.uid}
                              />
                              <label
                                htmlFor={kb.uid}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate max-w-[400px]"
                                title={kb.name}
                              >
                                {kb.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </ScrollArea>
                  ) : (
                    <div className="py-4 text-center border rounded-md">
                      <p className="text-sm text-muted-foreground">No knowledge bases available</p>
                      <Button variant="link" className="mt-2 p-0 h-auto">
                        Create Knowledge Base
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (activeTab === 'recording' && isRecording)}
              title={isRecording && activeTab === 'recording' ? 'Another recording is in progress. Please stop it first.' : ''}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                </>
              ) : activeTab === 'recording' ? (
                isRecording ? 'Recording in Progress' : 'Start Recording'
              ) : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <RecordingDialog
        open={showRecordingDialog}
        onOpenChange={setShowRecordingDialog}
        knowledgeBaseId={selectedKnowledgeBases[0]}
        onSuccess={onSuccess}
        fileName={recordingFileName || `Recording_${new Date().toISOString().split('T')[0]}`}
      />
    </>
  );
}
