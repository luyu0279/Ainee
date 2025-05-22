"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import KnowledgeBaseDialog from "./KnowledgeBaseDialog";

interface CreateKnowledgeBaseDialogProps {
  onCreateSuccess?: (newKbId: string) => void;
}

export function CreateKnowledgeBaseDialog({ onCreateSuccess }: CreateKnowledgeBaseDialogProps) {
  const handleSuccess = (result: { uid: string }) => {
    onCreateSuccess?.(result.uid);
  };

  return (
    <KnowledgeBaseDialog
      mode="create"
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </Button>
      }
      onSuccess={handleSuccess}
    />
  );
} 