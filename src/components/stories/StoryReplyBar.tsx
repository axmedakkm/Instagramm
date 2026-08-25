"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { conversationsApi, storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Story } from "@/types";

/**
 * Instagram implements story "likes" and replies the same way under the
 * hood: both just send a direct message to the story's author. There's no
 * dedicated story-like endpoint on this backend, so a heart tap sends a
 * "❤️" DM — same mechanism as a text comment.
 * Instagram implements story replies (text, voice) as a direct message to
 * the story's author, and this backend does the same — so those just send a
 * DM. A "like" (heart tap) is different: it *also* sends the "❤️" DM (same
 * as before, so it still shows up as an activity in the author's inbox), but
 * now additionally calls the real `POST /stories/:id/like` so it's counted
 * — that's what powers the like count shown in the story archive
 * (`/settings/archive`).
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

function useStoryLike(story: Story) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => storiesApi.like(story.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.feed });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stories.byUser(story.author.id),
      });
    },
    // Best-effort — the DM heart already went through, so don't surface a
    // second error toast for the count just not being incremented.
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
  const reply = useStoryReply(story);
  const like = useStoryLike(story);
  const recorder = useVoiceRecorder();
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pause the story while the viewer is typing a comment.
  useEffect(() => {
    onActivityChange(text.length > 0);
  }, [text, onActivityChange]);

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed || reply.isPending) return;
    reply.mutate({ text: trimmed }, { onSuccess: () => setText("") });
  };

  const handleLike = () => {
    if (reply.isPending) return;
    setJustLiked(true);
    reply.mutate({ text: "❤️" });
    like.mutate();
    setTimeout(() => setJustLiked(false), 900);
  };

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
          placeholder={`Comment on ${story.author.username}'s story...`}
          className="h-10 flex-1 border-none bg-transparent px-0 text-white placeholder:text-white/70 shadow-none focus-visible:ring-0"
        />
        {text.trim() && (
          <button
            type="button"
            onClick={handleSendText}
            disabled={reply.isPending}
            className="shrink-0 rounded-full p-2 text-white"
            aria-label="Send comment"
          >
            <Send className="size-4" />
          </button>
        )}
      </div>

      {!text.trim() && (
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
      )}
    </div>
  );
}
