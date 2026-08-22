"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Mic, Send, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { cn } from "@/lib/utils";
import { conversationsApi, mediaApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Story } from "@/types";

/**
 * Instagram implements story "likes" and replies the same way under the
 * hood: both just send a direct message to the story's author. There's no
 * dedicated story-like endpoint on this backend, so a heart tap sends a
 * "❤️" DM — same mechanism as a text reply or a recorded voice note.
 */
function useStoryReply(story: Story) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { text?: string; mediaUrl?: string }) => {
      const conversation = await conversationsApi.getOrCreateWithUser(
        story.author.id,
      );
      const message = await conversationsApi.sendMessage(conversation.id, payload);
      return { conversation, message };
    },
    onSuccess: ({ conversation }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(conversation.id),
      });
    },
    onError: () => toast.error("Couldn't send. Please try again."),
  });
}

export function StoryReplyBar({
  story,
  onActivityChange,
}: {
  story: Story;
  onActivityChange: (active: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [justLiked, setJustLiked] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const reply = useStoryReply(story);
  const recorder = useVoiceRecorder();
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onActivityChange(recorder.isRecording || text.length > 0);
  }, [recorder.isRecording, text, onActivityChange]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed || reply.isPending) return;
    reply.mutate(
      { text: trimmed },
      { onSuccess: () => setText("") },
    );
  };

  const handleLike = () => {
    if (reply.isPending) return;
    setJustLiked(true);
    reply.mutate({ text: "❤️" });
    setTimeout(() => setJustLiked(false), 900);
  };

  const startRecording = async () => {
    try {
      await recorder.start();
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(
        () => setRecordSeconds((s) => s + 1),
        1000,
      );
    } catch {
      toast.error("Couldn't access your microphone.");
    }
  };

  const stopAndSendRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const file = await recorder.stop();
    if (!file) return;
    try {
      const { url } = await mediaApi.upload(file);
      reply.mutate({ mediaUrl: url });
    } catch {
      toast.error("Couldn't send your voice note.");
    }
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recorder.cancel();
  };

  if (recorder.isRecording) {
    const minutes = Math.floor(recordSeconds / 60);
    const seconds = String(recordSeconds % 60).padStart(2, "0");
    return (
      <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2.5 backdrop-blur">
        <span className="flex size-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
        <span className="flex-1 text-sm text-white">
          Recording {minutes}:{seconds}
        </span>
        <button
          type="button"
          onClick={cancelRecording}
          className="text-white/80"
          aria-label="Cancel recording"
        >
          <Trash2 className="size-5" />
        </button>
        <button
          type="button"
          onClick={stopAndSendRecording}
          className="rounded-full bg-primary p-2 text-primary-foreground"
          aria-label="Stop and send voice note"
        >
          <Square className="size-3.5 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 items-center rounded-full border border-white/30 bg-white/10 pl-4 pr-1.5 backdrop-blur">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSendText();
            }
          }}
          placeholder={`Reply to ${story.author.username}...`}
          className="h-10 flex-1 border-none bg-transparent px-0 text-white placeholder:text-white/70 shadow-none focus-visible:ring-0"
        />
        {text.trim() && (
          <button
            type="button"
            onClick={handleSendText}
            disabled={reply.isPending}
            className="shrink-0 rounded-full p-2 text-white"
            aria-label="Send reply"
          >
            <Send className="size-4" />
          </button>
        )}
      </div>

      {!text.trim() && (
        <>
          <button
            type="button"
            onClick={handleLike}
            disabled={reply.isPending}
            className="shrink-0"
            aria-label="Send a like"
          >
            <Heart
              className={cn(
                "size-7 text-white transition-transform",
                justLiked && "scale-125 fill-destructive text-destructive",
              )}
            />
          </button>
          <button
            type="button"
            onClick={startRecording}
            disabled={reply.isPending}
            className="shrink-0"
            aria-label="Record a voice reply"
          >
            <Mic className="size-7 text-white" />
          </button>
        </>
      )}
    </div>
  );
}
