import clsx from 'clsx';

/**
 * PageSkeleton — shimmer loading placeholder for page content.
 */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-48 rounded-lg bg-aegis-surface/40" />
        <div className="h-4 w-72 rounded-lg bg-aegis-surface/30" />
      </div>
      {/* Card skeletons */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-aegis-surface/20 border border-aegis-border/10" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-aegis-surface/15 border border-aegis-border/10" />
      ))}
    </div>
  );
}
