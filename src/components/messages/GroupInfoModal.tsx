"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  Check,
  Crown,
  LogOut,
  Pencil,
  Search,
  ShieldMinus,
  ShieldPlus,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { conversationTitle, displayName } from "@/lib/conversation";
import { conversationsApi, usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { Conversation, ConversationJoinRequest, UserSummary } from "@/types";

/**
 * Everything about managing a group lives here, opened by tapping the group
 * name in `ChatWindow`'s header: rename, per-member nicknames (private to
 * whoever sets them), promote/demote admins, add members (direct if you're
 * an admin, a request otherwise — see `conversationsApi.addMember`), review
 * pending join requests, and leave.
 */
export function GroupInfoModal({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const conversationId = conversation.id;

  const me = conversation.participants.find((p) => p.id === currentUser?.id);
  const isAdmin = !!me?.isAdmin;
  const others = conversation.participants.filter(
    (p) => p.id !== currentUser?.id,
  );

  const [name, setName] = useState(conversation.name ?? "");
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(
    null,
  );
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const debouncedAddQuery = useDebounce(addQuery.trim(), 300);

  const refreshConversation = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });

  const rename = useMutation({
    mutationFn: (value: string) => conversationsApi.rename(conversationId, value),
    onSuccess: refreshConversation,
    onError: () => toast.error("Couldn't rename the group."),
  });

  const setNickname = useMutation({
    mutationFn: ({ userId, nickname }: { userId: string; nickname: string }) =>
      nickname.trim()
        ? conversationsApi.setNickname(conversationId, userId, nickname.trim())
        : conversationsApi.clearNickname(conversationId, userId),
    onSuccess: () => {
      setEditingNicknameFor(null);
      refreshConversation();
    },
    onError: () => toast.error("Couldn't save that nickname."),
  });

  const toggleAdmin = useMutation({
    mutationFn: ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) =>
      makeAdmin
        ? conversationsApi.promoteAdmin(conversationId, userId)
        : conversationsApi.demoteAdmin(conversationId, userId),
    onSuccess: refreshConversation,
    onError: () => toast.error("Couldn't update that member's role."),
  });

  const leave = useMutation({
    mutationFn: () => conversationsApi.leave(conversationId),
    onSuccess: () => {
      onOpenChange(false);
      refreshConversation();
      router.push("/messages");
    },
    onError: (error) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(message ?? "Couldn't leave the group.");
    },
  });

  const addMember = useMutation({
    mutationFn: (userId: string) => conversationsApi.addMember(conversationId, userId),
    onSuccess: (result) => {
      setAddQuery("");
      if (result.pending) {
        toast.success("Request sent — waiting on an admin to approve it.");
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.joinRequests(conversationId),
        });
      } else {
        toast.success("Added to the group.");
        refreshConversation();
      }
    },
    onError: () => toast.error("Couldn't add that person."),
  });

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: queryKeys.users.search(debouncedAddQuery),
    queryFn: () => usersApi.search(debouncedAddQuery),
    enabled: open && debouncedAddQuery.length > 0,
  });
  const memberIds = new Set(conversation.participants.map((p) => p.id));
  const addCandidates = (searchResults ?? []).filter((u) => !memberIds.has(u.id));

  const { data: joinRequests } = useQuery({
    queryKey: queryKeys.conversations.joinRequests(conversationId),
    queryFn: () => conversationsApi.joinRequests(conversationId),
    enabled: open,
  });

  const acceptRequest = useMutation({
    mutationFn: (requestId: string) =>
      conversationsApi.acceptJoinRequest(conversationId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.joinRequests(conversationId),
      });
      refreshConversation();
      toast.success("Added to the group.");
    },
    onError: () => toast.error("Couldn't accept that request."),
  });

  const rejectRequest = useMutation({
    mutationFn: (requestId: string) =>
      conversationsApi.rejectJoinRequest(conversationId, requestId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.joinRequests(conversationId),
      }),
    onError: () => toast.error("Couldn't remove that request."),
  });

  const startEditingNickname = (person: UserSummary) => {
    setEditingNicknameFor(person.id);
    setNicknameDraft(conversation.nicknames[person.id] ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md gap-0 overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Group info</DialogTitle>
        </DialogHeader>

        {/* Name */}
        <div className="p-4">
          <label
            htmlFor="group-name"
            className="mb-1 block text-xs font-semibold uppercase text-muted-foreground"
          >
            Group name
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={conversationTitle(conversation, others)}
              maxLength={100}
            />
            <Button
              size="sm"
              disabled={
                rename.isPending ||
                !name.trim() ||
                name.trim() === conversation.name
              }
              onClick={() => rename.mutate(name.trim())}
            >
              Save
            </Button>
          </div>
        </div>

        {/* Members */}
        <div className="border-t border-border p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            {conversation.participants.length} members
          </p>
          <ul className="flex flex-col gap-1">
            {conversation.participants.map((person) => {
              const isMe = person.id === currentUser?.id;
              return (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-md px-1 py-1.5"
                >
                  <UserAvatar user={person} size="sm" />
                  <div className="min-w-0 flex-1">
                    {editingNicknameFor === person.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          setNickname.mutate({
                            userId: person.id,
                            nickname: nicknameDraft,
                          });
                        }}
                        className="flex items-center gap-1"
                      >
                        <Input
                          autoFocus
                          value={nicknameDraft}
                          onChange={(event) => setNicknameDraft(event.target.value)}
                          placeholder={person.username}
                          maxLength={50}
                          className="h-7 text-sm"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0"
                          disabled={setNickname.isPending}
                          aria-label="Save nickname"
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0"
                          onClick={() => setEditingNicknameFor(null)}
                          aria-label="Cancel"
                        >
                          <X className="size-4" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {isMe ? "You" : displayName(person, conversation.nicknames)}
                          {person.isAdmin && (
                            <Crown className="size-3.5 shrink-0 text-amber-500" />
                          )}
                        </p>
                        {!isMe && (
                          <p className="truncate text-xs text-muted-foreground">
                            @{person.username}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {!isMe && editingNicknameFor !== person.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 text-muted-foreground"
                      aria-label={`Set a nickname for ${person.username}`}
                      onClick={() => startEditingNickname(person)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}

                  {!isMe && isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 text-muted-foreground"
                      disabled={toggleAdmin.isPending}
                      aria-label={
                        person.isAdmin
                          ? `Remove admin from ${person.username}`
                          : `Make ${person.username} an admin`
                      }
                      onClick={() =>
                        toggleAdmin.mutate({
                          userId: person.id,
                          makeAdmin: !person.isAdmin,
                        })
                      }
                    >
                      {person.isAdmin ? (
                        <ShieldMinus className="size-3.5" />
                      ) : (
                        <ShieldPlus className="size-3.5" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Add member */}
        <div className="border-t border-border p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <UserPlus className="size-3.5" />
            Add people
          </p>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={addQuery}
              onChange={(event) => setAddQuery(event.target.value)}
              placeholder="Search people"
              className="rounded-full bg-muted pl-9"
            />
          </div>
          {isSearching && (
            <p className="px-1 py-2 text-xs text-muted-foreground">Searching…</p>
          )}
          {!isSearching && debouncedAddQuery && addCandidates.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">No one found.</p>
          )}
          {addCandidates.length > 0 && (
            <ul className="flex flex-col gap-1">
              {addCandidates.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-md px-1 py-1.5"
                >
                  <UserAvatar user={person} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {person.username}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={addMember.isPending}
                    onClick={() => addMember.mutate(person.id)}
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {/* Non-admins won't get a direct add above (the server files a
           * request instead — see `conversationsApi.addMember`), so the
           * pending queue below is where that request shows up either way. */}
          {!isAdmin && (
            <p className="mt-1 px-1 text-xs text-muted-foreground">
              You&apos;re not an admin — adding someone here sends a request
              instead of adding them right away.
            </p>
          )}
        </div>

        {/* Pending join requests */}
        {joinRequests && joinRequests.length > 0 && (
          <div className="border-t border-border p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Requests to add someone
            </p>
            <ul className="flex flex-col gap-2">
              {joinRequests.map((request: ConversationJoinRequest) => {
                const canResolve =
                  isAdmin || request.requestedBy.id === currentUser?.id;
                return (
                  <li
                    key={request.id}
                    className="flex items-center gap-3 rounded-md bg-muted/50 px-2 py-2"
                  >
                    <UserAvatar user={request.targetUser} size="sm" />
                    <p className="min-w-0 flex-1 text-xs">
                      <span className="font-semibold">
                        {request.requestedBy.username}
                      </span>{" "}
                      wants to add{" "}
                      <span className="font-semibold">
                        {request.targetUser.username}
                      </span>
                    </p>
                    {canResolve && (
                      <div className="flex shrink-0 items-center gap-1">
                        {isAdmin && (
                          <Button
                            size="icon"
                            className="size-7"
                            disabled={acceptRequest.isPending}
                            aria-label="Accept"
                            onClick={() => acceptRequest.mutate(request.id)}
                          >
                            <Check className="size-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="secondary"
                          className="size-7"
                          disabled={rejectRequest.isPending}
                          aria-label={isAdmin ? "Reject" : "Cancel request"}
                          onClick={() => rejectRequest.mutate(request.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Leave */}
        <div className="border-t border-border p-4">
          <Button
            variant="secondary"
            className="w-full text-destructive hover:text-destructive"
            disabled={leave.isPending}
            onClick={() => leave.mutate()}
          >
            <LogOut className="size-4" />
            Leave group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
