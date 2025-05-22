import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ChevronUpSquare,
  ChevronDownSquare,
  Link2,
  Tag,
  BookOpen,
  X,
  Loader2,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ApiLibs from "@/lib/ApiLibs";
import type { FileContent } from "@/types/fileTypes";
import type { KnowledgeBaseResponse } from "@/apis/models/KnowledgeBaseResponse";
import { KnowledgeBaseType } from "@/apis/models/KnowledgeBaseType";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Interface for edit dialog props
interface EditFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileContent: FileContent;
  onEditSuccess: (updatedContent?: FileContent) => void;
}

// EditFileDialog component
const EditFileDialog = ({ open, onOpenChange, fileContent, onEditSuccess }: EditFileDialogProps) => {
  const router = useRouter();
  const [fileName, setFileName] = useState(fileContent?.title || "");
  const [tags, setTags] = useState<string[]>(fileContent?.ai_tags || []);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseResponse[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form when fileContent changes
  React.useEffect(() => {
    if (fileContent) {
      setFileName(fileContent.title || "");
      setTags(fileContent.ai_tags || []);
      if (fileContent.belonged_kbs && fileContent.belonged_kbs.length > 0) {
        setSelectedKnowledgeBases(fileContent.belonged_kbs.map(kb => kb.uid));
      } else {
        setSelectedKnowledgeBases([]);
      }
    }
  }, [fileContent, open]);
  
  // Load knowledge bases
  React.useEffect(() => {
    if (open) {
      loadKnowledgeBases();
    }
  }, [open]);
  
  const loadKnowledgeBases = async () => {
    try {
      setIsLoading(true);
      const response = await ApiLibs.knowledgeBase.getKnowledgeBaseListApiKbListOwnGet(
        KnowledgeBaseType.OWNED
      );
      
      if (response.code === "SUCCESS" && response.data) {
        setKnowledgeBases(response.data.knowledge_bases || []);
        
        if (fileContent?.belonged_kbs && fileContent.belonged_kbs.length > 0) {
          setSelectedKnowledgeBases(fileContent.belonged_kbs.map(kb => kb.uid));
        }
      }
    } catch (error) {
      console.error("Error loading knowledge bases:", error);
      toast.error("Failed to load knowledge bases");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 3) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  // Toggle knowledge base selection
  const toggleKnowledgeBase = (kbId: string) => {
    if (selectedKnowledgeBases.includes(kbId)) {
      setSelectedKnowledgeBases(selectedKnowledgeBases.filter(id => id !== kbId));
    } else {
      setSelectedKnowledgeBases([...selectedKnowledgeBases, kbId]);
    }
  };
  
  // Submit edit
  const handleSubmit = async () => {
    if (!fileContent?.uid || !fileName.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await ApiLibs.content.editContentApiContentEditPost({
        uid: fileContent.uid,
        title: fileName.trim(),
        tags: tags,
        add_to_kb_ids: selectedKnowledgeBases.length > 0 ? selectedKnowledgeBases : undefined
      });
      
      if (response.code === "SUCCESS") {
        toast.success("File updated successfully");
        onOpenChange(false);
        
        // Create updated content with the changed values
        const updatedContent: FileContent = {
          ...fileContent,
          title: fileName.trim(),
          ai_tags: tags,
          // Convert the selected knowledge base IDs to full objects if we have them available
          belonged_kbs: selectedKnowledgeBases.length > 0 
            ? knowledgeBases
                .filter(kb => selectedKnowledgeBases.includes(kb.uid))
                .map(kb => ({
                  uid: kb.uid,
                  name: kb.name,
                  description: kb.description || null
                }))
            : fileContent.belonged_kbs
        };
        
        onEditSuccess(updatedContent);
      } else {
        toast.error(response.message || "Failed to update file");
      }
    } catch (error) {
      console.error("Error updating file:", error);
      toast.error("An error occurred while updating the file");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit File</DialogTitle>
          <DialogDescription>
            Update file information and manage its knowledge bases.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* File Name */}
          <div className="space-y-2">
            <label htmlFor="fileName" className="text-sm font-medium">
              File Name
            </label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              className="w-full"
            />
          </div>
          
          {/* File Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              File Tags (up to 3 can be added)
            </label>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <div 
                  key={index} 
                  className="flex items-center bg-secondary rounded-full px-3 py-1 text-xs"
                >
                  <span className="mr-1">#{tag}</span>
                  <button 
                    type="button" 
                    onClick={() => removeTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            
            {tags.length < 3 && (
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add new tag"
                  className="w-full"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addTag}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
          
          {/* Knowledge Bases */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Add to Knowledge Bases
            </label>
            
            <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : knowledgeBases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No knowledge bases found.</p>
              ) : (
                knowledgeBases.map((kb) => (
                  <div 
                    key={kb.uid} 
                    className="flex items-center space-x-2"
                  >
                    <input 
                      type="checkbox" 
                      id={`kb-edit-${kb.uid}`} 
                      checked={selectedKnowledgeBases.includes(kb.uid)}
                      onChange={() => toggleKnowledgeBase(kb.uid)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`kb-edit-${kb.uid}`} className="text-sm truncate max-w-[400px] cursor-pointer" title={kb.name}>
                      {kb.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 justify-end">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handleSubmit} 
            disabled={isSubmitting || !fileName.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface FileDetailHeaderProps {
  fileContent: FileContent;
  onEditSuccess?: () => void;
  getItemIcon: (mediaType: any) => string;
}

export const FileDetailHeader: React.FC<FileDetailHeaderProps> = ({
  fileContent,
  onEditSuccess,
  getItemIcon
}) => {
  const router = useRouter();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [kbSelectorOpen, setKbSelectorOpen] = useState(false);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState<KnowledgeBaseResponse[]>([]);
  const [isLoadingKbs, setIsLoadingKbs] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [localFileContent, setLocalFileContent] = useState<FileContent>(fileContent);

  // Add useEffect to update localFileContent when fileContent changes
  useEffect(() => {
    setLocalFileContent(fileContent);
  }, [fileContent]);

  // 初始化选中的知识库
  React.useEffect(() => {
    if (localFileContent?.belonged_kbs) {
      setSelectedKnowledgeBases(localFileContent.belonged_kbs.map(kb => kb.uid));
    } else {
      setSelectedKnowledgeBases([]);
    }
  }, [localFileContent]);

  // 处理添加标签
  const handleAddTag = async () => {
    if (!newTagInput.trim() || !localFileContent?.uid) return;
    
    const newTag = newTagInput.trim();
    const currentTags = localFileContent.ai_tags || [];
    
    if (currentTags.includes(newTag) || currentTags.length >= 3) {
      return;
    }
    
    const updatedTags = [...currentTags, newTag];
    
    try {
      const response = await ApiLibs.content.editContentApiContentEditPost({
        uid: localFileContent.uid,
        tags: updatedTags
      });
      
      if (response.code === "SUCCESS") {
        // Update local state immediately
        setLocalFileContent({
          ...localFileContent,
          ai_tags: updatedTags
        });
        setNewTagInput("");
        toast.success("Tag added successfully");
        // Also trigger parent refresh for consistency
        onEditSuccess?.();
      } else {
        toast.error(response.message || "Failed to add tag");
      }
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    }
  };

  // 加载可用的知识库列表
  const loadAvailableKnowledgeBases = async () => {
    if (isLoadingKbs) return;
    
    try {
      setIsLoadingKbs(true);
      const response = await ApiLibs.knowledgeBase.getKnowledgeBaseListApiKbListOwnGet(
        KnowledgeBaseType.OWNED
      );
      
      if (response.code === "SUCCESS" && response.data) {
        const kbs = response.data.knowledge_bases || [];
        setAvailableKnowledgeBases(kbs);
        
        if (fileContent?.belonged_kbs) {
          const kbIds = fileContent.belonged_kbs.map(kb => kb.uid);
          setSelectedKnowledgeBases(kbIds);
        }
      } else {
        toast.error("Failed to load knowledge bases");
      }
    } catch (error) {
      console.error("Error loading knowledge bases:", error);
      toast.error("Failed to load knowledge bases");
    } finally {
      setIsLoadingKbs(false);
    }
  };

  // 打开知识库选择器
  const openKnowledgeBaseSelector = () => {
    if (fileContent?.belonged_kbs) {
      const kbIds = fileContent.belonged_kbs.map(kb => kb.uid);
      setSelectedKnowledgeBases(kbIds);
    } else {
      setSelectedKnowledgeBases([]);
    }
    
    setKbSelectorOpen(true);
    loadAvailableKnowledgeBases();
  };

  // 更新知识库关联
  const handleUpdateKnowledgeBases = async () => {
    if (!localFileContent?.uid) return;
    
    try {
      setIsLoadingKbs(true);
      
      const response = await ApiLibs.content.editContentApiContentEditPost({
        uid: localFileContent.uid,
        add_to_kb_ids: selectedKnowledgeBases
      });
      
      if (response.code === "SUCCESS") {
        // Update local state immediately with the selected knowledge bases
        // We need to convert the knowledge base IDs to full objects
        const updatedKbs = availableKnowledgeBases
          .filter(kb => selectedKnowledgeBases.includes(kb.uid))
          .map(kb => ({
            uid: kb.uid,
            name: kb.name,
            description: kb.description || null
          }));
          
        setLocalFileContent({
          ...localFileContent,
          belonged_kbs: updatedKbs
        });
        
        setKbSelectorOpen(false);
        toast.success("Knowledge bases updated successfully");
        // Also trigger parent refresh for consistency
        onEditSuccess?.();
      } else {
        toast.error(response.message || "Failed to update knowledge bases");
      }
    } catch (error) {
      console.error("Error updating knowledge bases:", error);
      toast.error("Failed to update knowledge bases");
    } finally {
      setIsLoadingKbs(false);
    }
  };

  // 处理分享功能
  const handleShare = () => {
    if (localFileContent?.page_url) {
      const url = localFileContent.page_url.startsWith('http') 
        ? localFileContent.page_url 
        : `https://${localFileContent.page_url}`;
        
      navigator.clipboard.writeText(url)
        .then(() => {
          toast.success("Link copied to clipboard!");
        })
        .catch((error) => {
          console.error("Failed to copy: ", error);
          toast.error("Failed to copy link");
        });
    } else {
      toast.info("No shareable link available for this content");
    }
  };

  // 处理编辑点击
  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  // 处理删除点击
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  // 处理删除确认
  const handleDeleteConfirm = async () => {
    if (!localFileContent?.uid) {
      toast.error("Cannot delete: File ID is missing");
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      setIsDeleting(true);
      const response = await ApiLibs.content.deleteContentApiContentDeleteUidPost(localFileContent.uid);
      
      if (response && response.code === "SUCCESS") {
        toast.success("File deleted successfully");
        router.push('/dashboard/inbox');
      } else {
        toast.error(response.message || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("An error occurred while deleting the file");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="w-full pt-2 px-2 relative">
      <div className="flex flex-col w-full border-b">
        {/* File Title and Actions Row */}
        <div className="flex items-start justify-between pb-4">
          <div className="flex items-start space-x-2 min-w-0 flex-1">
            <Image 
              src={getItemIcon(localFileContent.media_type)} 
              alt={String(localFileContent.media_type)} 
              width={20} 
              height={20} 
              className="flex-shrink-0 mt-1"
            />
            <h1 
              className={`text-xl font-semibold ${
                isDetailsExpanded ? 'break-words' : 'truncate'
              }`}
              title={localFileContent.title}
            >
              {localFileContent.title}
            </h1>
          </div>

          {/* Action Buttons - Inline with title */}
          <div className="flex items-start gap-0.5 ml-2 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Share" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            
            {localFileContent.owned && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="More Options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-0 ring-0 bg-popover shadow-elevation-menu">
                  <DropdownMenuItem onClick={handleEditClick} className="flex items-center">
                    <Edit className="h-4 w-4 mr-2" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeleteClick} className="text-red-500 focus:text-red-500 flex items-center">
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              title={isDetailsExpanded ? "Collapse details" : "Expand details"}
            >
              {isDetailsExpanded ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>

        {/* Collapsible Details Section */}
        {isDetailsExpanded && (
          <div className="mt-3 mb-3 space-y-3">
            {/* Source URL if available */}
            {localFileContent.source && localFileContent.source.trim() !== '' && (
              <div className="flex items-center">
                <Link2 className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                <h3 className="text-sm font-medium mr-2">Source:</h3>
                <a 
                  href={localFileContent.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline truncate"
                >
                  {localFileContent.source}
                </a>
              </div>
            )}
            
            {/* Tags */}
            <div className="flex items-center">
              <Tag className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
              <h3 className="text-sm font-medium mr-2">Tags:</h3>
              
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 items-center">
                  {(localFileContent.ai_tags || []).map((tag, index) => (
                    <div 
                      key={index} 
                      className="flex items-center bg-secondary rounded-full px-3 py-1 text-xs"
                    >
                      <span className="mr-1">#{tag}</span>
                      {localFileContent.owned && (
                        <button 
                          type="button" 
                          onClick={async () => {
                            if (!localFileContent.uid) return;
                            const updatedTags = (localFileContent.ai_tags || []).filter(t => t !== tag);
                            try {
                              const response = await ApiLibs.content.editContentApiContentEditPost({
                                uid: localFileContent.uid,
                                tags: updatedTags
                              });
                              
                              if (response.code === "SUCCESS") {
                                // Update local state immediately
                                setLocalFileContent({
                                  ...localFileContent,
                                  ai_tags: updatedTags
                                });
                                toast.success("Tag removed successfully");
                                // Also trigger parent callback for consistency
                                onEditSuccess?.();
                              } else {
                                toast.error(response.message || "Failed to remove tag");
                              }
                            } catch (error) {
                              console.error("Error removing tag:", error);
                              toast.error("Failed to remove tag");
                            }
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {localFileContent.owned && (localFileContent.ai_tags || []).length < 3 && (
                    <div className="flex items-center">
                      <Input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTagInput.trim()) {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Add tag"
                        className="h-7 text-xs w-24 mr-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-7 text-xs px-2"
                        onClick={handleAddTag}
                        disabled={!newTagInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Knowledge Bases */}
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
              <h3 className="text-sm font-medium mr-2">Knowledge Bases:</h3>
              
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 items-center">
                  {(localFileContent.belonged_kbs || []).length > 0 ? (
                    <>
                      {(localFileContent.belonged_kbs || []).map((kb) => (
                        <div 
                          key={kb.uid} 
                          className="flex items-center bg-secondary rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-secondary/80"
                          onClick={() => router.push(`/dashboard/knowledge-base?id=${kb.uid}`)}
                          title="Click to view knowledge base"
                        >
                          <span>{kb.name}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground mr-2">
                      No knowledge bases associated
                    </span>
                  )}
                  
                  {localFileContent.owned && (
                    <Button 
                      variant="outline" 
                      className="h-7 text-xs px-2"
                      onClick={openKnowledgeBaseSelector}
                    >
                      + Add to Knowledge Bases
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Base Selector Dialog */}
      <Dialog 
        open={kbSelectorOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setKbSelectorOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add to Knowledge Bases</DialogTitle>
            <DialogDescription>
              Select the knowledge bases you want to add this content to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="max-h-[300px] overflow-y-auto border rounded-md p-3 space-y-2">
              {isLoadingKbs ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableKnowledgeBases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No knowledge bases found.</p>
              ) : (
                availableKnowledgeBases.map((kb) => (
                  <div key={kb.uid} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`kb-select-${kb.uid}`}
                      checked={selectedKnowledgeBases.includes(kb.uid)}
                      onChange={() => {
                        if (selectedKnowledgeBases.includes(kb.uid)) {
                          setSelectedKnowledgeBases(
                            selectedKnowledgeBases.filter(id => id !== kb.uid)
                          );
                        } else {
                          setSelectedKnowledgeBases([...selectedKnowledgeBases, kb.uid]);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`kb-select-${kb.uid}`} className="text-sm truncate max-w-[400px] cursor-pointer" title={kb.name}>
                      {kb.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setKbSelectorOpen(false)}
              disabled={isLoadingKbs}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleUpdateKnowledgeBases}
              disabled={isLoadingKbs}
            >
              {isLoadingKbs ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this file?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the file and remove it from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteConfirm} 
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {isDeleting ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add the EditFileDialog component instance */}
      <EditFileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        fileContent={localFileContent}
        onEditSuccess={(updatedContent) => {
          if (updatedContent) {
            setLocalFileContent(updatedContent);
          }
          onEditSuccess?.();
        }}
      />
    </div>
  );
};

export default FileDetailHeader; 