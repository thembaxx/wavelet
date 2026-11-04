"use client";

import Link from "next/link";
import { UsersThree } from "@phosphor-icons/react";

export function MultiplayerEntry() {
  return (
    <Link
      href="/multiplayer"
      className="setup-multiplayer-link squircle"
      aria-label="Play Wavelet with friends"
    >
      <UsersThree size={19} weight="regular" /> <span>Friends</span>
    </Link>
  );
}
