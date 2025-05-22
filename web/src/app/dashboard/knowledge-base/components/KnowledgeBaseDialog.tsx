import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import ApiLibs from '@/lib/ApiLibs';
import { Lock, Globe2, Share2 } from 'lucide-react';
import { KnowledgeBaseVisibility } from '@/apis/models/KnowledgeBaseVisibility';

interface KnowledgeBaseDialogProps {
  mode: 'create' | 'edit';
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: (result: { uid: string; name: string; description?: string; visibility?: string }) => void;
  knowledgeBase?: {
    uid: string;
    name: string;
    description?: string;
    visibility?: 'private' | 'default' | 'public';
    subscriber_count?: number;
  };
}

export default function KnowledgeBaseDialog({
  mode,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  knowledgeBase,
}: KnowledgeBaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'default' | 'public'>('default');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;
  const onOpenChange = isControlled ? controlledOnOpenChange : setOpen;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && mode === 'edit' && knowledgeBase) {
      setName(knowledgeBase.name);
      setDescription(knowledgeBase.description || '');
      setVisibility(knowledgeBase.visibility || 'default');
    } else if (isOpen && mode === 'create') {
      setName('');
      setDescription('');
      setVisibility('default');
    }
  }, [isOpen, mode, knowledgeBase]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const response = await ApiLibs.knowledgeBase.saveKnowledgeBaseApiKbCreatePost({
          name: name.trim(),
          description: description.trim(),
          visibility: visibility as KnowledgeBaseVisibility,
        });
        toast.success('Knowledge base created successfully');
        onSuccess({
          uid: response?.data?.uid || '',
          name: name.trim(),
          description: description.trim(),
          visibility: visibility,
        });
      } else if (mode === 'edit' && knowledgeBase) {
        await ApiLibs.knowledgeBase.updateKnowledgeBaseApiKbUpdatePost({
          kb_uid: knowledgeBase.uid,
          name: name.trim(),
          description: description.trim(),
          visibility: visibility as KnowledgeBaseVisibility,
        });
        toast.success('Knowledge base updated successfully');
        onSuccess({
          uid: knowledgeBase.uid,
          name: name.trim(),
          description: description.trim(),
          visibility: visibility,
        });
      }
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to handle knowledge base:', error);
      toast.error(`Failed to ${mode} knowledge base`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSelectPrivate = mode === 'create' || (knowledgeBase?.subscriber_count || 0) === 0;

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px] min-h-[450px] max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'Create' : 'Edit'} Knowledge Base</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter knowledge base name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter knowledge base description"
            className="h-24"
          />
        </div>
        <div className="space-y-4">
          <Label>Visibility</Label>
          <RadioGroup
            value={visibility}
            onValueChange={(value) => setVisibility(value as 'private' | 'default' | 'public')}
          >
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="private" id="private" disabled={!canSelectPrivate} />
              <div className="flex-1">
                <Label htmlFor="private" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Private
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Knowledge base is visible only to you
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="default" id="default" />
              <div className="flex-1">
                <Label htmlFor="default" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Default
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Shareable via link, not discoverable on the Explore page
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="public" id="public" />
              <div className="flex-1">
                <Label htmlFor="public" className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4" />
                  Public to Explore
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Discoverable and searchable on the Explore page
                </p>
              </div>
            </div>
          </RadioGroup>
          {!canSelectPrivate && visibility !== 'private' && mode === 'edit' && (
            <p className="text-sm text-muted-foreground">
              Private option is disabled because this knowledge base has subscribers
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => onOpenChange?.(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Submit'}
        </Button>
      </div>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {dialogContent}
    </Dialog>
  );
} 