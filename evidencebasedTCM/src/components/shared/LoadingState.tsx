export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted/30 border-t-primary" />
      <p className="mt-4 text-sm">{message}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 h-4 w-2/3 rounded bg-muted/30" />
      <div className="mb-2 h-3 w-1/2 rounded bg-muted/30" />
      <div className="flex gap-2 mt-4">
        <div className="h-5 w-16 rounded-full bg-muted/30" />
        <div className="h-5 w-12 rounded-full bg-muted/30" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`skeleton-${i}`} className="animate-pulse flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted/30" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted/30" />
            <div className="h-3 w-1/2 rounded bg-muted/30" />
          </div>
          <div className="h-5 w-12 rounded-full bg-muted/30" />
        </div>
      ))}
    </div>
  );
}
