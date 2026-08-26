"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MusicPicker } from "@/components/shared/MusicPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { MusicTrack } from "@/types";

const MAX_IMAGES = 10;

interface SelectedMedia {
  file: File;
  previewUrl: string;
  type: "image" | "video";
}

/**
 * Full-page post composer. Same flow the modal used to run, but as its own
 * page (like the story composer) so there's room for the media grid, a
 * caption, a location and a music picker without cramming a dialog.
 */
export function CreatePostComposer() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [music, setMusic] = useState<MusicTrack | null>(null);

  const hasVideo = media.some((item) => item.type === "video");

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      toast.warning("Select photos or a video to share.");
      return;
    }

    // A post is either a photo carousel or a single video, never both — same
    // rule the backend applies when it derives `mediaType`.
    if (videoFiles.length > 0) {
      if (media.length > 0 || videoFiles.length > 1 || imageFiles.length > 0) {
        toast.warning("A post can have one video, or up to 10 photos — not both.");
      }
      const [video] = videoFiles;
      media.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setMedia([
        { file: video, previewUrl: URL.createObjectURL(video), type: "video" },
      ]);
      return;
    }

    if (hasVideo) {
      toast.warning("Remove the video first to add photos.");
      return;
    }

    const room = MAX_IMAGES - media.length;
    if (imageFiles.length > room) {
      toast.warning(`You can upload up to ${MAX_IMAGES} images per post.`);
    }

    const accepted = imageFiles.slice(0, room).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: "image" as const,
    }));

    setMedia((prev) => [...prev, ...accepted]);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      postsApi.create({
        media: media.map((item) => item.file),
        caption: caption.trim() || undefined,
        location: location.trim() || undefined,
        music,
      }),
    onSuccess: () => {
      toast.success("Post shared!");
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.explore });
      media.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      router.push("/feed");
    },
    onError: () => toast.error("Couldn't share your post. Please try again."),
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <header className="glass sticky top-0 z-10 flex items-center gap-2 border-b border-border px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          className="size-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-semibold">New post</h1>
        <Button
          size="sm"
          className="ml-auto"
          disabled={media.length === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          Share
        </Button>
      </header>

      <div className="space-y-4 p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFilesSelected(event.target.files);
            // Allow re-selecting the same file after it was removed.
            event.target.value = "";
          }}
        />

        {media.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-20 text-muted-foreground transition-colors hover:border-foreground/40"
          >
            <ImagePlus className="size-10" />
            <span className="text-sm font-medium">
              Click to select up to {MAX_IMAGES} photos or one video
            </span>
          </button>
        ) : (
          <>
            {hasVideo ? (
              <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
                <video
                  src={media[0].previewUrl}
                  controls
                  className="size-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(0)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {media.map((item, index) => (
                  <div
                    key={item.previewUrl}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={item.previewUrl}
                      alt={`Selected photo ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {media.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-foreground/40"
                  >
                    <ImagePlus className="size-6" />
                  </button>
                )}
              </div>
            )}

            <Textarea
              placeholder="Write a caption..."
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={2200}
              rows={3}
            />

            <Input
              placeholder="Add location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={120}
            />

            <div className="border-t border-border pt-4">
              <MusicPicker
                value={music}
                onChange={setMusic}
                label="Add music to your post"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
