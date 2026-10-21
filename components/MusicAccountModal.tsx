'use client';

import { StudioDialog } from './StudioDialog';
import type { SongTrack } from '@/lib/game-rules';
import type { ThemeMode } from '@/lib/game-rules';

export interface ConnectedMusicProfile {
  provider: 'spotify' | 'apple-music';
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
  isOpen, reducedMotion = false, onClose, connectedProfile, onDisconnect,
}: MusicAccountModalProps) {
  return (
    <StudioDialog open={isOpen} onClose={onClose} labelledBy="account-modal-title" reducedMotion={reducedMotion}>
      <div className="space-y-4 p-6">
        <h2 id="account-modal-title" className="text-xl font-bold">Music account connections are paused</h2>
        <p className="text-sm leading-relaxed">
          Wavelet is free and currently plays only its own original, procedurally generated music.
          Spotify and Apple Music do not grant automatic permission to use their tracks in a
          name-that-tune game, even with a paid listener subscription.
        </p>
        <p className="text-sm text-muted-foreground">
          Try the free Original Studio Mix or choose a Wavelet studio project.
          Music connections will return only after rights are confirmed in writing.
        </p>
        {connectedProfile && (
          <button type="button" className="rounded-xl border px-4 py-2 text-sm" onClick={onDisconnect}>
            Disconnect old music profile
          </button>
        )}
        <button type="button" className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground" onClick={onClose}>
          Back to Wavelet
        </button>
      </div>
    </StudioDialog>
  );
}
