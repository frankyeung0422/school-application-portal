export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
      <p className="mt-4 text-sm">{message}</p>
    </div>
  );
}
