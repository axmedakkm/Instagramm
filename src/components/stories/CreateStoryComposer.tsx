"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Music, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MusicPicker } from "@/components/shared/MusicPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import { useStoryArchiveStore } from "@/store/useStoryArchiveStore";
import type { MusicTrack } from "@/types";

/** Caption can't run away past what's readable on a phone-sized frame. */
const CAPTION_MAX_LENGTH = 200;

/**
 * Full-page story composer — same frame the viewer uses (see `StoryViewer`),
 * so picking media and posting it feels like one continuous place instead of
 * a dialog bolted on top of the feed.
 */
export function CreateStoryComposer() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const addToArchive = useStoryArchiveStore((state) => state.add);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [music, setMusic] = useState<MusicTrack | null>(null);
  const [caption, setCaption] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);

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

  const mutation = useMutation({
    mutationFn: () => storiesApi.create(file as File, music, caption.trim()),
    onSuccess: (createdStory) => {
      toast.success("Your story was shared!");
      // Save a copy to the local archive so it's still here after the story
      // expires in 24h. Music/caption come back on `createdStory` already —
      // the backend persists both — so there's nothing to stitch in.
      addToArchive(createdStory);
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
      <div className="relative aspect-[9/16] h-full max-h-screen w-full max-w-md overflow-hidden bg-neutral-900">
        {file.type.startsWith("video/") ? (
          <video
            src={previewUrl}
            className="size-full object-contain"
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
            className="object-contain"
            unoptimized
          />
        )}

        {/* Top bar: discard on the left, text/music tools on the right. */}
        <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between">
          <button
            type="button"
            onClick={discard}
            aria-label="Discard"
            className="rounded-full bg-black/40 p-2 text-white backdrop-blur"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCaptionEditor}
              aria-label="Add text"
              className="rounded-full bg-black/40 px-3.5 py-2 text-sm font-bold text-white backdrop-blur"
            >
              Aa
            </button>
            <button
              type="button"
              onClick={() => setMusicSheetOpen(true)}
              aria-label={music ? "Change music" : "Add music"}
              className="rounded-full bg-black/40 p-2 text-white backdrop-blur"
            >
              <Music className="size-5" />
            </button>
          </div>
        </div>

        {/* Caption preview — tap to edit again. */}
        {caption && !isEditingCaption && (
          <button
            type="button"
            onClick={openCaptionEditor}
            className="absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 text-center text-xl font-semibold text-white drop-shadow-lg"
          >
            {caption}
          </button>
        )}

        {/* Music pill — tap to change or remove. */}
        {music && (
          <button
            type="button"
            onClick={() => setMusicSheetOpen(true)}
            className="absolute inset-x-3 bottom-20 z-10 mx-auto flex w-fit max-w-[80%] items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
          >
            <Music className="size-3.5 shrink-0" />
            <span className="truncate">
              {music.title} · {music.artist}
            </span>
          </button>
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
    </div>
  );
}
