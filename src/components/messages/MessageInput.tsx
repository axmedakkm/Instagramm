"use client";

import { Mic, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useSendVoiceMessage } from "@/hooks/useSendVoiceMessage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  /** Recorded-but-not-sent-yet voice note, held for preview/playback before
   * the user commits to sending it (or discards it). */
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { send, isSending } = useSendMessage(conversationId);
  const { sendVoice, isSending: isSendingVoice } =
    useSendVoiceMessage(conversationId);
  const { isRecording, start, stop, cancel } = useVoiceRecorder();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Revoke the object URL whenever it's replaced or the component unmounts,
  // so we don't leak blob URLs.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-border p-3"
    >
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Message..."
        className="rounded-full"
      />
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
