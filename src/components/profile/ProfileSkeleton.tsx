import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder shown while the profile is loading. Every block here lines up
 * with the real ProfileHeader + grid, so the page doesn't visibly jump once
 * the data lands — the single biggest tell between a polished app and an
 * unfinished one. Nothing is interactive; it's all `Skeleton` blocks.
 */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="px-4 pb-6 pt-6 sm:pt-8">
        {/* Avatar + info column */}
        <div className="flex gap-4 sm:gap-6">
          <Skeleton className="size-20 shrink-0 rounded-full sm:size-28" />

          <div className="min-w-0 flex-1">
            {/* Username + burger */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="size-9 shrink-0 rounded-full" />
            </div>

            {/* Stats */}
            <div className="mt-4 flex gap-4">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-24" />
            </div>

            {/* Bio */}
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3.5 w-full max-w-xs" />
              <Skeleton className="h-3.5 w-2/3 max-w-[10rem]" />
            </div>
          </div>
        </div>

        {/* Action button */}
        <Skeleton className="mt-5 h-10 w-full rounded-lg" />
      </div>

      {/* Tab strip */}
      <div className="flex justify-center py-3">
        <Skeleton className="h-3 w-20" />
      </div>

      {/* Grid of posts */}
      <div className="grid grid-cols-3 gap-1.5 px-1 pt-4 sm:gap-2 sm:px-0">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
