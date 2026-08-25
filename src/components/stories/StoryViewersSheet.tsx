"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Story } from "@/types";

export function StoryViewersSheet({
  story,
  open,
  onOpenChange,
}: {
  story: Story;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: viewers, isLoading } = useQuery({
    queryKey: queryKeys.stories.viewers(story.id),
    queryFn: () => storiesApi.viewers(story.id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader>
          <DialogTitle>{story.viewsCount} views</DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}

          {!isLoading && viewers?.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No views yet.
            </p>
          )}

          {viewers?.map((viewer) => (
            <Link
              key={viewer.id}
              href={`/${viewer.username}`}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
            >
              <UserAvatar user={viewer} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{viewer.username}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {viewer.fullName}
                </p>
              </div>
              <Eye className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
