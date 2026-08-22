import { ChatWindow } from "@/components/messages/ChatWindow";
import { ConversationList } from "@/components/messages/ConversationList";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return (
    <div className="flex h-screen w-full">
      <div className="hidden w-[360px] shrink-0 border-r border-border lg:block">
        <ConversationList activeId={conversationId} />
      </div>

      <ChatWindow conversationId={conversationId} />
    </div>
  );
}
