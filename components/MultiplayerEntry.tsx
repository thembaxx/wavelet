"use client";

import Link from "next/link";
import { UsersThree } from "@phosphor-icons/react";

export function MultiplayerEntry() {
  return (
    <Link
      href="/multiplayer"
      className="fixed bottom-5 right-5 z-30 inline-flex min-h-12 items-center gap-2 rounded-full border border-[#EDFF8C]/60 bg-[#101c1b] px-5 py-3 text-sm font-bold text-[#EDFF8C] shadow-[0_8px_32px_rgba(0,0,0,.45)] transition hover:scale-[1.03] hover:bg-[#20332e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EDFF8C]"
      aria-label="Play Wavelet with friends"
    >
      <UsersThree size={19} weight="fill" /> Play with friends
    </Link>
  );
}
