"use client";

import { Bookmark, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postsApi } from "@/services/api";
import { useSavedPostsStore } from "@/store/useSavedPostsStore";
import type { Post } from "@/types";

export default function SavedPage() {
  const router = useRouter();
  const posts = useSavedPostsStore((state) => state.posts);
  const unsave = useSavedPostsStore((state) => state.unsave);

  const handleUnsave = (post: Post) => {
    unsave(post.id);
    // Best-effort backend sync; the local store is the source of truth.
    postsApi.unsave(post.id).catch(() => {});
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          className="size-8"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Saved</h1>
          <p className="text-xs text-muted-foreground">
            Only you can see what you&apos;ve saved
          </p>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-foreground">
            <Bookmark className="size-9" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-light">Save videos</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Save videos and posts you want to watch again. No one is notified,
              and only you can see what you&apos;ve saved.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1 sm:gap-2 sm:p-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="group relative aspect-square overflow-hidden bg-muted"
            >
              <Link href={`/p/${post.id}`} className="block size-full">
                {post.mediaType === "video" ? (
                  <video
                    src={post.mediaUrls[0]}
                    muted
                    playsInline
                    preload="metadata"
                    className="size-full object-cover"
                  />
                ) : (
                  <Image
                    src={post.mediaUrls[0]}
                    alt={post.caption || `Post by ${post.author.username}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 240px"
                    className="object-cover"
                  />
                )}
              </Link>

              <button
                type="button"
                onClick={() => handleUnsave(post)}
                aria-label="Remove from saved"
                className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-1.5 shadow transition-opacity hover:bg-background"
              >
                <Bookmark className="size-4 fill-foreground text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
