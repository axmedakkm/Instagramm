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
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useUIStore } from "@/store/useUIStore";

export function CreateStoryModal() {
  const isOpen = useUIStore((state) => state.isCreateStoryOpen);
  const close = useUIStore((state) => state.closeCreateStory);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const resetForm = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      close();
    }
  };

  const handleFileSelected = (fileList: FileList | null) => {
    const selected = fileList?.[0];
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const mutation = useMutation({
    mutationFn: () => storiesApi.create(file as File),
    onSuccess: () => {
      toast.success("Your story was shared!");
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.feed });
      resetForm();
      close();
    },
    onError: () => {
      toast.error("Couldn't share your story. Please try again.");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader>
          <DialogTitle>Create story</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => handleFileSelected(event.target.files)}
          />

          {!file || !previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-16 text-muted-foreground transition-colors hover:border-foreground/40"
            >
              <ImagePlus className="size-10" />
              <span className="text-sm font-medium">
                Click to select a photo or video
              </span>
            </button>
          ) : (
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-lg bg-muted">
              {file.type.startsWith("video/") ? (
                <video
                  src={previewUrl}
                  className="size-full object-cover"
                  controls
                />
              ) : (
                <Image
                  src={previewUrl}
                  alt="Story preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
              <button
                type="button"
                onClick={resetForm}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Share to story
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
