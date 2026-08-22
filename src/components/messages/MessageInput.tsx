"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendMessage } from "@/hooks/useSendMessage";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const { send, isSending } = useSendMessage(conversationId);

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
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={!text.trim() || isSending}
        aria-label="Send message"
      >
        <Send className="size-5" />
      </Button>
    </form>
  );
}
