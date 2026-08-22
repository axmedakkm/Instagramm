import { MessageCircle } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";

export default function MessagesPage() {
  return (
    <div className="flex h-screen w-full">
      <div className="w-full border-r border-border lg:w-[360px]">
        <ConversationList />
      </div>

      <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-center lg:flex">
        <div className="rounded-full border-2 border-foreground p-5">
          <MessageCircle className="size-10" />
        </div>
        <p className="text-lg font-semibold">Your messages</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Select a conversation from the list, or start a new one from
          someone&apos;s profile.
        </p>
      </div>
    </div>
  );
}
