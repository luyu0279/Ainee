import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ApiLibs from '@/lib/ApiLibs';
import { Loader2, Check, Plus } from 'lucide-react';
import Image from 'next/image';
import { ImportDialog } from '@/components/import/ImportDialog';

// FileItem 类型参考 files/page.tsx
export interface FileItem {
  id: string | number;
  title: string;
  media_type: string;
  created_at: string;
  uid: string;
}

interface AddFileModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (addedFiles: FileItem[]) => void;
  kbId: string;
}

const getItemIcon = (mediaType?: string) => {
  switch (mediaType) {
    case 'video':
      return '/icon/icon_file_video.png';
    case 'pdf':
      return '/icon/icon_pdf_add.png';
    case 'audio':
      return '/icon/icon_item_voice.png';
    case 'word':
      return '/icon/icon_item_word.png';
    case 'audioInternal':
      return '/icon/icon_recording_audio.png';
    case 'audioMicrophone':
      return '/icon/icon_recording_mic.png';
    case 'image':
      return '/icon/icon_item_image.png';
    case 'ppt':
      return '/icon/icon_item_ppt.png';
    case 'text':
      return '/icon/icon_item_txt.png';
    case 'excel':
      return '/icon/icon_item_xls.png';
    default:
      return '/icon/icon_link.png';
  }
};

export default function AddFileModal({ open, onClose, onComplete, kbId }: AddFileModalProps) {
  const [fileList, setFileList] = useState<any[]>([]); // any[] 因为有 is_in_knowledge_base 字段
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // 加载文件列表
  const loadFileList = async () => {
    setIsLoading(true);
    try {
      const res = await ApiLibs.knowledgeBase.getAvailableContentsApiKbAvailableContentsKbUidGet(kbId);
      const files = Array.isArray(res?.data)
        ? res.data.map((item: any) => ({
            id: item.uid,
            uid: item.uid,
            title: item.title || 'Untitled',
            media_type: item.media_type || 'link',
            created_at: item.created_at || '',
            is_in_knowledge_base: !!item.is_in_knowledge_base,
          }))
        : [];
      setFileList(files);
    } catch (error) {
      setFileList([]);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // 只在弹窗打开时加载文件列表
  useEffect(() => {
    if (!open) return;
    loadFileList();
  }, [open, kbId]);

  // 切换选中
  const handleSelect = (id: string, isAdded: boolean) => {
    if (isAdded) return;
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 添加文件到知识库
  const handleComplete = async () => {
    if (selectedFileIds.size === 0) return;
    setIsSubmitting(true);
    try {
      await ApiLibs.knowledgeBase.addContentsToKbApiKbAddContentsPost({
        kb_uid: kbId,
        content_uids: Array.from(selectedFileIds),
      });
      toast.success('Files added to knowledge base');
      const added = fileList.filter(f => selectedFileIds.has(f.id.toString()));
      onComplete(added);
      setSelectedFileIds(new Set());
    } catch (e) {
      toast.error('Failed to add files');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理导入新文件
  const handleImportNewFiles = () => {
    setIsImportDialogOpen(true);
    onClose(); // 关闭 AddFileModal
  };

  // 处理导入成功 - 添加延迟确保文件上传完成且API数据已更新
  const handleImportSuccess = () => {
    // 使用较长的延迟等待文件上传和处理完成
    setTimeout(() => {
      // 通知父组件刷新文件列表
      onComplete([]);
    }, 3000); // 使用3秒延迟确保文件处理完成
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-md w-full p-0 max-h-[80vh] flex flex-col">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Add Files</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 mb-4 justify-center cursor-pointer"
              onClick={handleImportNewFiles}
            >
              <Plus className="w-4 h-4" /> Import New Files
            </Button>
          </div>
          <div className="px-6 pb-2 text-sm font-medium text-foreground">Add from imported files</div>
          <div className="px-6 pb-2 flex-1 overflow-hidden flex flex-col min-h-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-y-auto pr-1 min-h-0 flex-1 space-y-1">
                {fileList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No files available to add.</div>
                ) : fileList.map(file => {
                  const isAdded = file.is_in_knowledge_base;
                  const isSelected = selectedFileIds.has(file.id.toString());
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-sm leading-tight
                        ${isAdded ? 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed' : isSelected ? 'bg-accent/30 border-primary' : 'hover:bg-accent/10 cursor-pointer'}`}
                      onClick={() => handleSelect(file.id.toString(), isAdded)}
                    >
                      <Image src={getItemIcon(file.media_type)} alt={file.media_type} width={20} height={20} />
                      <span className="flex-1 truncate">{file.title}</span>
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-xs ml-1">Added</span>
                        </>
                      ) : isSelected && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-2 mt-auto">
            <Button
              className="w-full cursor-pointer"
              disabled={selectedFileIds.size === 0 || isSubmitting}
              onClick={handleComplete}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        defaultKnowledgeBaseId={kbId}
        onSuccess={handleImportSuccess}
      />
    </>
  );
} 