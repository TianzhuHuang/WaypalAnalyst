'use client';

export default function ThreadListSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-full p-3 rounded-lg bg-white/5 animate-pulse"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-white/10 rounded mb-2 w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-3 w-12 bg-white/5 rounded" />
              <div className="h-4 w-4 bg-white/5 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
