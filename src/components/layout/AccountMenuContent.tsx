"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Dropdown content shared by the sidebar and the profile page's own-profile
 * menu: switch between any account that's ever been logged into on this
 * browser, add a new one, or log out. Render inside a `<DropdownMenu>` /
 * `<DropdownMenuTrigger>` pair.
 */
export function AccountMenuContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const accounts = useAccountsStore((state) => state.accounts);

  const otherAccounts = accounts.filter((a) => a.user.id !== currentUser?.id);

  const switchTo = (account: (typeof accounts)[number]) => {
    setAuth(account);
    queryClient.clear();
    router.push("/feed");
  };

  const addAccount = () => {
    logout();
    queryClient.clear();
    router.push("/login");
  };

  return (
    <DropdownMenuContent align="end" className="w-64">
      {otherAccounts.length > 0 && (
        <>
          <DropdownMenuLabel>Switch account</DropdownMenuLabel>
          {otherAccounts.map((account) => (
            <DropdownMenuItem
              key={account.user.id}
              onClick={() => switchTo(account)}
            >
              <UserAvatar user={account.user} size="xs" />
              <span className="truncate">{account.user.username}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
        </>
      )}

      <DropdownMenuItem onClick={() => router.push("/settings")}>
        <Settings className="size-4" />
        Settings
      </DropdownMenuItem>

      <DropdownMenuItem onClick={addAccount}>
        <Plus className="size-4" />
        Add account
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
