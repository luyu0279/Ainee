import KnowledgeBaseDialog from "./KnowledgeBaseDialog";

interface EditKnowledgeBaseModalProps {
  open: boolean;
  onClose: () => void;
  knowledgeBase: {
    uid: string;
    name: string;
    description?: string;
    visibility?: 'private' | 'default' | 'public';
    subscriber_count?: number;
  };
  onComplete: (updatedKb: { uid: string; name: string; description?: string; visibility?: string }) => void;
}

export default function EditKnowledgeBaseModal({
  open,
  onClose,
  knowledgeBase,
  onComplete,
}: EditKnowledgeBaseModalProps) {
  return (
    <KnowledgeBaseDialog
      mode="edit"
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      knowledgeBase={knowledgeBase}
      onSuccess={onComplete}
    />
  );
} 