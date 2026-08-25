import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Pin and "delete" for conversations, kept locally. The backend has neither
 * endpoint — pinning is purely a client-side sort order, and "deleting" a
 * chat just hides it from your own list (exactly like real Instagram: the
 * other person's copy is untouched, and the chat reappears the moment a new
 * message arrives).
 */
interface ConversationPrefsState {
  pinnedIds: string[];
  /** conversationId -> ISO timestamp of when it was "deleted". */
  hiddenAt: Record<string, string>;
  togglePin: (conversationId: string) => void;
  hide: (conversationId: string) => void;
}

export const useConversationPrefsStore = create<ConversationPrefsState>()(
  persist(
    (set) => ({
      pinnedIds: [],
      hiddenAt: {},
      togglePin: (conversationId) =>
        set((state) => ({
          pinnedIds: state.pinnedIds.includes(conversationId)
            ? state.pinnedIds.filter((id) => id !== conversationId)
            : [...state.pinnedIds, conversationId],
        })),
      hide: (conversationId) =>
        set((state) => ({
          // Unpinning too — a deleted chat shouldn't linger pinned if it
          // comes back later.
          pinnedIds: state.pinnedIds.filter((id) => id !== conversationId),
          hiddenAt: {
            ...state.hiddenAt,
            [conversationId]: new Date().toISOString(),
          },
        })),
    }),
    {
      name: "instagramm-conversation-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** True once a conversation is hidden and hasn't gotten a newer message since. */
export function isConversationHidden(
  hiddenAt: string | undefined,
  lastMessageAt: string | undefined,
) {
  if (!hiddenAt) return false;
  if (!lastMessageAt) return true;
  return new Date(lastMessageAt).getTime() <= new Date(hiddenAt).getTime();
}
