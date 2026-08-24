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
      toast.error("Couldn't access your microphone.");
    }
  };

  const handleStopRecording = async () => {
    const duration = elapsedSeconds;
    const file = await stop();
    if (!file) return;
    try {
      await sendVoice({ file, duration });
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
          disabled={isSendingVoice}
          aria-label="Record a voice message"
        >
          <Mic className="size-5" />
        </Button>
      )}
    </form>
  );
}
