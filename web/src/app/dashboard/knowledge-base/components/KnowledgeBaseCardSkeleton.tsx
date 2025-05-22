export default function KnowledgeBaseCardSkeleton() {
  return (
    <div className="bg-background border rounded-lg p-3">
      <div className="flex-1 min-w-0">
        <div className="h-6 bg-muted rounded w-3/4 mb-1.5" />
        <div className="space-y-1 mb-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-muted" />
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-24" />
        </div>
      </div>
    </div>
  );
} 