import type { Conversation, UserSummary } from "@/types";

/**
 * Every participant except the signed-in user. There's no backend concept
 * of "group" vs "1:1" — a conversation is just its participant list — so
 * this is what both shapes reduce to: one other person for a DM, several
 * for a group.
 */
export function otherParticipants(
  conversation: Pick<Conversation, "participants">,
  currentUserId?: string,
): UserSummary[] {
  const others = conversation.participants.filter((p) => p.id !== currentUserId);
  // Degenerate case (e.g. viewing your own single-participant row before the
  // list has settled) — fall back to whoever's there rather than showing
  // nothing.
  return others.length > 0 ? others : conversation.participants;
}

export function isGroupConversation(
  conversation: Pick<Conversation, "participants">,
): boolean {
  return conversation.participants.length > 2;
}

/** "alice", or "alice, bob, carol" for a group — truncated with a "+N" tail
 * past `maxNames` so a big group doesn't blow out the header/row. */
export function conversationTitle(others: UserSummary[], maxNames = 3): string {
  if (others.length <= maxNames) {
    return others.map((u) => u.username).join(", ");
  }
  const shown = others.slice(0, maxNames).map((u) => u.username);
  return `${shown.join(", ")} +${others.length - maxNames}`;
}
