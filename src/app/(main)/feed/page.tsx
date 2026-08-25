"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ArrowUp,
  CircleCheck,
  Compass,
  Heart,
  Loader2,
  RefreshCw,
  Send,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoriesBar } from "@/components/feed/StoriesBar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export default function FeedPage() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.feed,
    queryFn: ({ pageParam }: { pageParam: number }) => postsApi.feed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  // Three mutually exclusive "nothing to show" cases, named once here so the
  // JSX below reads as a list of states instead of a pile of && conditions.
  const showEmpty = !isLoading && !isError && posts.length === 0;
  const showCaughtUp = posts.length > 0 && !hasNextPage && !isFetchingNextPage;

  return (
    <div className="mx-auto flex w-full max-w-6xl">
      <main className="mx-auto w-full max-w-[470px] flex-1">
        <FeedTopBar />
        <StoriesBar />

        {isLoading && <FeedSkeleton />}

        {isError && (
          <FeedNotice
            icon={<WifiOff className="size-7" />}
            title="Couldn't load your feed"
            description="Check your connection and give it another go."
          >
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </FeedNotice>
        )}

        {showEmpty && (
          <FeedNotice
            icon={<Heart className="size-7" />}
            title="Your feed is quiet"
            description="Posts from people you follow land here. Find a few accounts to get started."
          >
            <Button asChild variant="gradient" size="sm">
              <Link href="/explore">
                <Compass className="size-4" />
                Explore posts
              </Link>
            </Button>
          </FeedNotice>
        )}

        {/* `stagger` (globals.css) fades each card up one after another, so the
            feed assembles itself instead of slamming in as one block. */}
        <div className="stagger pt-4" style={{ ["--stagger" as string]: "90ms" }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        <div ref={sentinelRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}

        {showCaughtUp && <CaughtUp />}
      </main>

      <RightSidebar />
      <ScrollToTopButton />
    </div>
  );
}

/**
 * Mobile-only top bar. On large screens the left Sidebar already carries the
 * wordmark and these actions, so it's hidden there (`lg:hidden`).
 */
function FeedTopBar() {
  return (
    <header className="glass sticky top-0 z-20 flex items-center justify-between border-b border-border/60 px-4 py-2.5 lg:hidden">
      <Link
        href="/feed"
        className="brand-gradient text-xl font-bold tracking-tight"
      >
        Instagramm
      </Link>

      <div className="flex items-center">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/notifications" aria-label="Notifications">
            <Heart className="size-6" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/messages" aria-label="Messages">
            <Send className="size-6" />
          </Link>
        </Button>
      </div>
    </header>
  );
}

/**
 * Loading placeholder. It deliberately mirrors PostCard's exact layout —
 * same rounded card, same avatar size, same rows — so the feed doesn't jump
 * when the real posts arrive.
 */
function FeedSkeleton() {
  return (
    <div className="space-y-7 pt-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="border-b border-border pb-3 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border/70 sm:shadow-soft"
        >
          {/* Author row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>

          {/* Photo */}
          <Skeleton className="aspect-square w-full rounded-none" />

          {/* Like / comment / share row */}
          <div className="flex gap-4 px-4 pt-4">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="size-6 rounded-full" />
          </div>

          {/* Likes count + caption */}
          <div className="space-y-2 px-4 pt-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The shared shell for "there's nothing here" moments — same ring-and-icon
 * shape the profile grid uses, so empty states across the app feel like one
 * app. `children` is the optional call-to-action button underneath.
 */
function FeedNotice({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="enter-up flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full border-2 border-foreground">
        {icon}
      </div>
      <p className="text-xl font-light">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}

/** Shown once the last page has loaded — the feed ends on a note, not a void. */
function CaughtUp() {
  return (
    <div className="enter-up flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
        <CircleCheck className="size-6" />
      </div>
      <p className="text-sm font-semibold">You&apos;re all caught up</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        You&apos;ve seen every new post from the people you follow.
      </p>
    </div>
  );
}

/**
 * Floating "back to top" pill. The only piece of local state on this page:
 * `visible` flips once you've scrolled past roughly one screen. It's always
 * rendered and just fades in/out, so the fade can actually animate.
 */
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 900);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "glass fixed bottom-20 right-4 z-30 grid size-11 place-items-center rounded-full border border-border/60 shadow-float transition-all duration-300 ease-spring hover:scale-110 active:scale-95 lg:bottom-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}
