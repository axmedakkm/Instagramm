"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  ImagePlus,
  Loader2,
  Music,
  Pause,
  Play,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { toast } from "sonner";
import { MusicPicker } from "@/components/shared/MusicPicker";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { storiesApi, usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { MusicTrack, UserSummary } from "@/types";

/** Caption can't run away past what's readable on a phone-sized frame. */
const CAPTION_MAX_LENGTH = 200;
/** Keeps a dragged caption's center from sliding fully off the frame. */
const POSITION_BOUNDS = { min: 8, max: 92 };
/** A pointer move under this many pixels counts as a tap, not a drag. */
const DRAG_THRESHOLD_PX = 6;

/**
 * Full-page story composer — same frame the viewer uses (see `StoryViewer`),
 * so picking media and posting it feels like one continuous place instead of
 * a dialog bolted on top of the feed.
 */
export function CreateStoryComposer() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [music, setMusic] = useState<MusicTrack | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [captionPosition, setCaptionPosition] = useState({ x: 50, y: 50 });
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
  const [mention, setMention] = useState<UserSummary | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ x: 50, y: 35 });
  const [mentionSheetOpen, setMentionSheetOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const debouncedMentionQuery = useDebounce(mentionQuery.trim(), 300);

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    router.back();
  };

  const handleFileSelected = (fileList: FileList | null) => {
    const selected = fileList?.[0];
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const openCaptionEditor = () => {
    setCaptionDraft(caption);
    setIsEditingCaption(true);
  };

  const toggleMusicPreview = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  // Search results for the mention picker — empty until the user types.
  const { data: mentionResults, isFetching: mentionSearching } = useQuery({
    queryKey: queryKeys.users.search(debouncedMentionQuery),
    queryFn: () => usersApi.search(debouncedMentionQuery),
    enabled: mentionSheetOpen && debouncedMentionQuery.length > 0,
  });
  const mentionCandidates = (mentionResults ?? []).filter(
    (user) => user.id !== currentUser?.id,
  );

  const selectMention = (user: UserSummary) => {
    setMention(user);
    setMentionSheetOpen(false);
    setMentionQuery("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      storiesApi.create(file as File, {
        music,
        caption: caption.trim(),
        captionPosition,
        mention: mention ? { userId: mention.id } : null,
        mentionPosition,
      }),
    onSuccess: () => {
      toast.success("Your story was shared!");
      // The archive page reads straight from `GET /stories/me/archive`, so
      // there's nothing to stitch into a local cache here.
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.archive });
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.feed });
      // The stories bar's "Your story" ring reads this key to know you have
      // an active story — without invalidating it too, the ring keeps
      // showing the "add a story" plus badge until something else refetches.
      if (currentUser) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.stories.byUser(currentUser.id),
        });
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      // Straight into viewing what you just posted, same as tapping your own
      // ring right afterward would do.
      router.replace(
        currentUser ? `/stories?u=${currentUser.username}` : "/feed",
      );
    },
    onError: () => {
      toast.error("Couldn't share your story. Please try again.");
    },
  });

  // Step 1: nothing picked yet — a plain full-screen prompt.
  if (!file || !previewUrl) {
    return (
      <div className="relative flex h-screen w-full flex-col items-center justify-center gap-4 bg-black text-white">
        <button
          type="button"
          onClick={discard}
          aria-label="Close"
          className="absolute left-4 top-4 rounded-full bg-white/10 p-2"
        >
          <X className="size-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => handleFileSelected(event.target.files)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/30 px-12 py-16 text-white/70 transition-colors hover:border-white/60 hover:text-white"
        >
          <ImagePlus className="size-10" />
          <span className="text-sm font-medium">
            Select a photo or video
          </span>
        </button>
      </div>
    );
  }

  // Step 2: full-bleed editor over the picked media.
  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-black">
      <div
        ref={frameRef}
        className="relative aspect-[9/16] h-full max-h-screen w-full max-w-md touch-none overflow-hidden bg-neutral-900"
      >
        {file.type.startsWith("video/") ? (
          <video
            src={previewUrl}
            className="pointer-events-none size-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <Image
            src={previewUrl}
            alt="Story preview"
            fill
            className="pointer-events-none object-contain"
            unoptimized
          />
        )}

        {/* Top bar: discard on the left, text/music tools on the right. */}
        <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between">
          <button
            type="button"
            onClick={discard}
            aria-label="Discard"
            className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCaptionEditor}
              aria-label="Add text"
              className="grid h-9 place-items-center rounded-full bg-black/40 px-3.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              Aa
            </button>
            <button
              type="button"
              onClick={() => setMusicSheetOpen(true)}
              aria-label={music ? "Change music" : "Add music"}
              className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              <Music className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setMentionSheetOpen(true)}
              aria-label={mention ? "Change mention" : "Mention someone"}
              className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              <AtSign className="size-5" />
            </button>
          </div>
        </div>

        {/* Caption preview — drag to reposition, tap (without dragging) to
            edit its text again. */}
        {caption && !isEditingCaption && (
          <DraggableCaption
            frameRef={frameRef}
            text={caption}
            position={captionPosition}
            onPositionChange={setCaptionPosition}
            onTap={openCaptionEditor}
          />
        )}

        {/* Mention chip — drag to reposition, tap (without dragging) to pick
            someone else instead. */}
        {mention && (
          <DraggableMention
            frameRef={frameRef}
            username={mention.username}
            position={mentionPosition}
            onPositionChange={setMentionPosition}
            onTap={() => setMentionSheetOpen(true)}
            onRemove={() => setMention(null)}
          />
        )}

        {/* Music pill — the play button previews the 30s clip right here so
            you can hear what you're picking before it's posted; tapping the
            rest of the pill reopens the picker. */}
        {music && (
          <div className="absolute inset-x-3 bottom-20 z-10 mx-auto flex w-fit max-w-[80%] items-center gap-1.5 rounded-full bg-black/40 py-1 pl-1 pr-3 text-xs font-medium text-white backdrop-blur">
            <button
              type="button"
              onClick={toggleMusicPreview}
              disabled={!music.previewUrl}
              aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
              className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20 disabled:opacity-40"
            >
              {isPreviewPlaying ? (
                <Pause className="size-3 fill-current" />
              ) : (
                <Play className="size-3 translate-x-px fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMusicSheetOpen(true)}
              className="min-w-0"
            >
              <Music className="mr-1 inline size-3 shrink-0 -translate-y-px" />
              <span className="truncate align-middle">
                {music.title} · {music.artist}
              </span>
            </button>
            {music.previewUrl && (
              <audio
                ref={previewAudioRef}
                src={music.previewUrl}
                loop
                onPlay={() => setIsPreviewPlaying(true)}
                onPause={() => setIsPreviewPlaying(false)}
              />
            )}
          </div>
        )}

        {/* Caption editor overlay — dims the media while typing. */}
        {isEditingCaption && (
          <div className="absolute inset-0 z-30 flex flex-col bg-black/70 backdrop-blur-sm">
            <div className="flex items-center justify-end p-3">
              <Button
                size="sm"
                onClick={() => {
                  setCaption(captionDraft.trim());
                  setIsEditingCaption(false);
                }}
              >
                Done
              </Button>
            </div>
            <div className="flex flex-1 items-center justify-center px-6">
              <textarea
                autoFocus
                rows={3}
                value={captionDraft}
                onChange={(event) =>
                  setCaptionDraft(
                    event.target.value.slice(0, CAPTION_MAX_LENGTH),
                  )
                }
                placeholder="Write something..."
                className="w-full resize-none border-none bg-transparent text-center text-2xl font-semibold text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
              />
            </div>
            <p className="pb-6 text-center text-xs text-white/50">
              Drag the text on the frame to move it
            </p>
          </div>
        )}

        {/* Publish. */}
        <div className="absolute inset-x-3 bottom-4 z-20">
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Add to story
          </Button>
        </div>
      </div>

      <Dialog open={musicSheetOpen} onOpenChange={setMusicSheetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add music</DialogTitle>
          </DialogHeader>
          <MusicPicker value={music} onChange={setMusic} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={mentionSheetOpen}
        onOpenChange={(open) => {
          setMentionSheetOpen(open);
          if (!open) setMentionQuery("");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mention someone</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={mentionQuery}
            onChange={(event) => setMentionQuery(event.target.value)}
            placeholder="Search people"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {mentionSearching &&
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-1 py-2">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}

            {!mentionSearching &&
              debouncedMentionQuery.length > 0 &&
              mentionCandidates.length === 0 && (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                  No people found for &ldquo;{debouncedMentionQuery}&rdquo;.
                </p>
              )}

            {!mentionSearching &&
              mentionCandidates.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => selectMention(person)}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-accent"
                >
                  <UserAvatar user={person} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {person.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.fullName}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The caption text, positioned absolutely within `frameRef` and draggable
 * by pointer. A pointer-down/up with barely any movement in between is
 * treated as a tap (`onTap`) instead of a drag, so it stays editable.
 */
function DraggableCaption({
  frameRef,
  text,
  position,
  onPositionChange,
  onTap,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  text: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onTap: () => void;
}) {
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const clamp = (value: number) =>
    Math.min(POSITION_BOUNDS.max, Math.max(POSITION_BOUNDS.min, value));

  const updateFromPointer = (clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    onPositionChange({
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    movedRef.current = false;
    startRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) movedRef.current = true;
    updateFromPointer(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!movedRef.current) onTap();
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      className="absolute z-10 max-w-[85%] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none text-center text-xl font-semibold text-white drop-shadow-lg active:cursor-grabbing"
    >
      {text}
    </button>
  );
}

/**
 * The "@mention" chip, positioned and dragged the same way `DraggableCaption`
 * is. A `<div>` rather than a `<button>` (like the caption) since it needs a
 * nested remove button — a `<button>` can't contain another interactive
 * `<button>`.
 */
function DraggableMention({
  frameRef,
  username,
  position,
  onPositionChange,
  onTap,
  onRemove,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  username: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onTap: () => void;
  onRemove: () => void;
}) {
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const clamp = (value: number) =>
    Math.min(POSITION_BOUNDS.max, Math.max(POSITION_BOUNDS.min, value));

  const updateFromPointer = (clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    onPositionChange({
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    movedRef.current = false;
    startRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) movedRef.current = true;
    updateFromPointer(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!movedRef.current) onTap();
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none items-center gap-1 rounded-full bg-black/40 py-1 pl-3 pr-1 text-sm font-semibold text-white backdrop-blur active:cursor-grabbing"
    >
      <AtSign className="size-3.5 shrink-0" />
      <span className="max-w-[160px] truncate">{username}</span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Remove mention"
        className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
