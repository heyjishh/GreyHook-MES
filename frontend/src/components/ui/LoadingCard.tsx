import { cn } from "@/lib/utils";

interface LoadingCardProps {
  rows?: number;
  className?: string;
}

export function LoadingCard({ rows = 3, className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-1 border border-surface-border rounded-card p-5",
        className
      )}
    >
      <div className="h-3 w-24 bg-surface-2 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div
              className="h-3 bg-surface-2 rounded animate-pulse"
              style={{ width: `${80 - i * 10}%` }}
            />
            <div className="h-3 bg-surface-2 rounded animate-pulse w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
