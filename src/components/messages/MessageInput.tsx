"use client";

import { Image as ImageIcon, Mic, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmojiPicker } from "@/components/messages/EmojiPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useSendVoiceMessage } from "@/hooks/useSendVoiceMessage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { mediaApi } from "@/services/api";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  /** Recorded-but-not-sent-yet voice note, held for preview/playback before
   * the user commits to sending it (or discards it). */
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** Same idea for a picked-but-not-sent-yet photo. */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSendingImage, setIsSendingImage] = useState(false);

  const { send, isSending } = useSendMessage(conversationId);
  const { sendVoice, isSending: isSendingVoice } =
    useSendVoiceMessage(conversationId);
  const { isRecording, start, stop, cancel } = useVoiceRecorder();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRecording) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isRecording]);

  // Revoke the object URLs whenever they're replaced or the component
  // unmounts, so we don't leak blob URLs.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    try {
      await send({ text: trimmed });
      setText("");
    } catch {
      toast.error("Message failed to send.");
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    // The input re-renders with the new value before this runs, so the
    // cursor restore has to happen on the next frame.
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + emoji.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleStartRecording = async () => {
    try {
      setElapsedSeconds(0);
      await start();
    } catch {
      toast.error(
        "Microphone access was denied. Allow it in your browser settings to record a voice message.",
      );
    }
  };

  const handleStopRecording = async () => {
    const file = await stop();
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const discardPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleSendPreview = async () => {
    if (!previewFile) return;
    try {
      await sendVoice(previewFile);
      discardPreview();
    } catch {
      toast.error("Voice message failed to send.");
    }
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const discardImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleSendImage = async () => {
    if (!imageFile) return;
    setIsSendingImage(true);
    try {
      const { url } = await mediaApi.upload(imageFile);
      await send({ mediaUrl: url });
      discardImage();
    } catch {
      toast.error("Photo failed to send.");
    } finally {
      setIsSendingImage(false);
    }
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel recording"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-destructive transition-colors hover:bg-accent"
        >
          <Trash2 className="size-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="tabular-nums text-muted-foreground">
            {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:
            {String(elapsedSeconds % 60).padStart(2, "0")}
          </span>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleStopRecording}
          aria-label="Stop recording"
        >
          <Send className="size-5" />
        </Button>
      </div>
    );
  }

  // Recorded, not sent yet — preview with native play/pause + progress/
  // duration (the same `<audio controls>` element already used to play
  // back sent voice messages in `ChatWindow`).
  if (previewFile && previewUrl) {
    return (
      <div className="flex items-center gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={discardPreview}
          aria-label="Discard recording"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-destructive transition-colors hover:bg-accent"
        >
          <Trash2 className="size-5" />
        </button>
        <audio src={previewUrl} controls className="h-9 flex-1" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleSendPreview}
          disabled={isSendingVoice}
          aria-label="Send voice message"
        >
          <Send className="size-5" />
        </Button>
      </div>
    );
  }

  // Picked, not sent yet — thumbnail preview with discard/send.
  if (imageFile && imagePreviewUrl) {
    return (
      <div className="flex items-center gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={discardImage}
          aria-label="Discard photo"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-destructive transition-colors hover:bg-accent"
        >
          <Trash2 className="size-5" />
        </button>
        {/* Local blob preview — plain <img>, not next/image (no remote URL
         * to optimize yet). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagePreviewUrl}
          alt="Selected photo"
          className="size-12 shrink-0 rounded-lg object-cover"
        />
        <p className="flex-1 truncate text-sm text-muted-foreground">
          Photo ready to send
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleSendImage}
          disabled={isSendingImage}
          aria-label="Send photo"
        >
          <Send className="size-5" />
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-border p-3"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />
      <EmojiPicker onSelect={handleSelectEmoji} />
      <Input
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Message..."
        className="rounded-full"
      />
      <button
        type="button"
        onClick={handlePickImage}
        aria-label="Send a photo"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
      >
        <ImageIcon className="size-5" />
      </button>
      {text.trim() ? (
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={isSending}
          aria-label="Send message"
        >
          <Send className="size-5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleStartRecording}
          aria-label="Record a voice message"
        >
          <Mic className="size-5" />
        </Button>
      )}
    </form>
  );
}
