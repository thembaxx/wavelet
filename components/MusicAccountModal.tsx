"use client";

import { StudioDialog } from "./StudioDialog";
import type { SongTrack } from "@/lib/game-rules";
import type { ThemeMode } from "@/lib/game-rules";

export interface ConnectedMusicProfile {
  provider: "spotify" | "apple-music";
  displayName: string;
  favoriteSummary: string;
  customTracks: SongTrack[];
  connectedAt: string;
}

interface MusicAccountModalProps {
  isOpen: boolean;
  themeMode: ThemeMode;
  reducedMotion?: boolean;
  onClose: () => void;
  connectedProfile: ConnectedMusicProfile | null;
  onConnectSuccess: (profile: ConnectedMusicProfile) => void;
  onDisconnect: () => void;
}

export function MusicAccountModal({
  isOpen,
  reducedMotion = false,
  onClose,
  connectedProfile,
  onDisconnect,
}: MusicAccountModalProps) {
  return (
    <StudioDialog
      open={isOpen}
      onClose={onClose}
      labelledBy="account-modal-title"
      reducedMotion={reducedMotion}
    >
      <div className="space-y-4 p-6">
        <h2 id="account-modal-title" className="text-xl font-bold">
          Real music, no account needed
        </h2>
        <p className="text-sm leading-relaxed">
          Commercial song previews are available in solo play. Choose Commercial Mix or search for
          an artist under Your music. No Spotify or Apple Music sign-in is needed.
        </p>
        <p className="text-sm text-muted-foreground">
          Personal library syncing and full-track playback are not connected. Offline originals
          remain available when you don’t have an internet connection.
        </p>
        {connectedProfile && (
          <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm"
            onClick={onDisconnect}
          >
            Disconnect old music profile
          </button>
        )}
        <button
          type="button"
          className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
          onClick={onClose}
        >
          Back to Wavelet
        </button>
      </div>
    </StudioDialog>
  );
}
