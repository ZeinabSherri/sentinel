"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

interface TopBarProps {
  orgName?: string;
  userEmail?: string;
}

export function TopBar({ orgName, userEmail }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">Org:</span>
        <span className="text-sm font-medium text-zinc-200">{orgName ?? "—"}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <User className="h-3.5 w-3.5" />
          {userEmail}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-zinc-500 hover:text-zinc-100"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
