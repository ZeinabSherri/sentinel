"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertStripProps {
  failCount: number;
}

export function AlertStrip({ failCount }: AlertStripProps) {
  if (failCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-900/90 border-t border-red-800 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-200">
            <span className="font-mono font-bold text-red-400">{failCount}</span>
            {" "}FAIL output{failCount !== 1 ? "s" : ""} in the last hour require attention
          </span>
        </div>
        <Link href="/outputs?status=FAIL">
          <Button size="sm" className="bg-red-500 hover:bg-red-400 text-white text-xs">
            Review now →
          </Button>
        </Link>
      </div>
    </div>
  );
}
