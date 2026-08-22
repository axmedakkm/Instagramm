"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useUIStore } from "@/store/useUIStore";

const MAX_IMAGES = 10;

interface SelectedImage {
  file: File;
  previewUrl: string;
}

export function CreatePostModal() {
  const isOpen = useUIStore((state) => state.isCreatePostOpen);
  const close = useUIStore((state) => state.closeCreatePost);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");

  const resetForm = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setCaption("");
    setLocation("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      close();
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );
    const room = MAX_IMAGES - images.length;

    if (files.length > room) {
      toast.warning(`You can upload up to ${MAX_IMAGES} images per post.`);
    }

    const accepted = files.slice(0, room).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...accepted]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      postsApi.create({
        images: images.map((image) => image.file),
        caption: caption.trim() || undefined,
        location: location.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Post shared!");
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.explore });
      resetForm();
      close();
    },
    onError: () => {
      toast.error("Couldn't share your post. Please try again.");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader>
          <DialogTitle>Create new post</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleFilesSelected(event.target.files)}
          />

          {images.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-16 text-muted-foreground transition-colors hover:border-foreground/40"
            >
              <ImagePlus className="size-10" />
              <span className="text-sm font-medium">
                Click to select up to {MAX_IMAGES} photos
              </span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div
                    key={image.previewUrl}
                    className="relative aspect-square overflow-hidden rounded-md bg-muted"
                  >
                    <Image
                      src={image.previewUrl}
                      alt={`Selected photo ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-foreground/40"
                  >
                    <ImagePlus className="size-6" />
                  </button>
                )}
              </div>

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
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={images.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
