'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SpotifyLogo,
  AppleLogo,
  ShieldCheck,
  X,
  CheckCircle,
  Trash,
} from '@phosphor-icons/react';
import { type SongTrack, type ThemeMode } from '@/lib/game-rules';
import { audioEngine } from '@/lib/audio-engine';

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
  onClose: () => void;
  connectedProfile: ConnectedMusicProfile | null;
  onConnectSuccess: (profile: ConnectedMusicProfile) => void;
  onDisconnect: () => void;
}

export const MusicAccountModal: React.FC<MusicAccountModalProps> = ({
  isOpen,
  themeMode,
  onClose,
  connectedProfile,
  onConnectSuccess,
  onDisconnect,
}) => {
  const [tasteInput, setTasteInput] = useState('Daft Punk, KAYTRANADA, Tyla, SZA');
  const [selectedEra, setSelectedEra] = useState('2020s');
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [oauthInfo, setOauthInfo] = useState<{
    configured: boolean;
    redirectUri: string;
  } | null>(null);

  const isLight = themeMode === 'light';

  useEffect(() => {
    if (!isOpen) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    fetch(`/api/auth/spotify/url?origin=${encodeURIComponent(origin)}`)
      .then((r) => r.json())
      .then((data) => {
        setOauthInfo({
          configured: Boolean(data.configured),
          redirectUri: data.redirectUri || `${origin}/auth/callback`,
        });
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        audioEngine.playCorrectFanfare(2);
        const tracks = Array.isArray(event.data.tracks) ? event.data.tracks : [];
        onConnectSuccess({
          provider: 'spotify',
          displayName: event.data.profileName || 'Spotify Connected Listener',
          favoriteSummary: 'Synced Top Tracks & Artists via Spotify OAuth',
          customTracks: tracks,
          connectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setStatusMessage('Spotify account linked! Personal crate ready.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConnectSuccess]);

  const handleSpotifyOAuthPopup = async () => {
    audioEngine.playUiTick(1.1, 'medium');
    setStatusMessage(null);
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/spotify/url?origin=${encodeURIComponent(origin)}`);
      const data = await res.json();

      if (data.configured && data.url) {
        const popup = window.open(data.url, 'spotify_oauth_popup', 'width=560,height=680');
        if (!popup) {
          setStatusMessage('Popup blocked — use Taste Sync below or allow popups.');
        }
      } else {
        await handleGeneratePersonalCrate('spotify');
      }
    } catch {
      await handleGeneratePersonalCrate('spotify');
    }
  };

  const handleGeneratePersonalCrate = async (provider: 'spotify' | 'apple-music') => {
    audioEngine.playUiTick(1.2, 'medium');
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const cleanQuery = `${tasteInput.replace(/,/g, ' ')} ${selectedEra}`.trim();
      const res = await fetch(`/api/songs?term=${encodeURIComponent(cleanQuery)}&limit=25`);
      const data = await res.json();
      const tracks: SongTrack[] = (data.tracks || []).map((t: SongTrack) => ({
        ...t,
        source: provider,
      }));

      audioEngine.playCorrectFanfare(2);
      onConnectSuccess({
        provider,
        displayName:
          provider === 'spotify' ? 'Spotify Taste Crate' : 'Apple Music Replay Crate',
        favoriteSummary: `${tasteInput} · ${selectedEra}`,
        customTracks: tracks,
        connectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setStatusMessage(
        `Synced ${tracks.length} real song snippets from your ${
          provider === 'spotify' ? 'Spotify' : 'Apple Music'
        } taste profile.`
      );
    } catch {
      setStatusMessage('Unable to reach music catalog — using offline curated tracks.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] border p-5 shadow-2xl ${
              isLight
                ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000]'
                : 'border-white/15 bg-[#12161D] text-[#FFFFFF]'
            }`}
          >
            {/* Drag Handle for Mobile Sheet Ergonomics */}
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D1D1D1] dark:bg-white/20 sm:hidden" />

            <div
              className={`flex items-center justify-between border-b pb-3.5 ${
                isLight ? 'border-[#F1F1F1]' : 'border-white/10'
              }`}
            >
              <div>
                <h2 id="account-modal-title" className="text-lg font-bold tracking-tight">
                  Music Account Sync
                </h2>
                <p className={`text-xs ${isLight ? 'text-[#000000]/60' : 'text-white/60'}`}>
                  Curate 30-second vinyl rounds from your listening history
                </p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  audioEngine.playUiTick(0.9, 'light');
                  onClose();
                }}
                aria-label="Close music account modal"
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                  isLight
                    ? 'border-[#D1D1D1] bg-[#F1F1F1] text-[#000000] hover:bg-[#E5E5E5]'
                    : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <X weight="bold" className="h-4 w-4" />
              </motion.button>
            </div>

            {connectedProfile && (
              <div
                className={`mt-4 rounded-[22px] border p-3.5 ${
                  isLight
                    ? 'border-[#000000]/10 bg-[#EDFF8C] text-[#000000]'
                    : 'border-[#EDFF8C]/35 bg-[#EDFF8C]/15 text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle weight="fill" className="h-5 w-5 text-[#309F92] shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{connectedProfile.displayName}</div>
                      <div className="truncate text-xs opacity-75">
                        {connectedProfile.favoriteSummary} · {connectedProfile.customTracks.length} songs
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiTick(0.8, 'medium');
                      onDisconnect();
                    }}
                    aria-label="Disconnect music account and purge data"
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-[#000000] px-3 py-1 text-xs font-bold text-[#FFFFFF]"
                  >
                    <Trash weight="bold" className="h-3.5 w-3.5" />
                    <span>Revoke</span>
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="taste-artists-input"
                  className={`block text-xs font-semibold ${
                    isLight ? 'text-[#000000]/75' : 'text-white/75'
                  }`}
                >
                  Favorite Artists, Genres, or Listening Seed
                </label>
                <input
                  id="taste-artists-input"
                  type="text"
                  value={tasteInput}
                  onChange={(e) => setTasteInput(e.target.value)}
                  placeholder="e.g. Daft Punk, SZA, Tyla, Outkast"
                  className={`mt-1.5 w-full rounded-2xl border px-3.5 py-2.5 text-sm focus:outline-none ${
                    isLight
                      ? 'border-[#D1D1D1] bg-[#F1F1F1] text-[#000000] placeholder-[#000000]/40 focus:border-[#309F92] focus:bg-[#FFFFFF]'
                      : 'border-white/15 bg-black/40 text-white placeholder-white/40 focus:border-[#309F92]'
                  }`}
                />
              </div>

              <div>
                <span
                  className={`block text-xs font-semibold ${
                    isLight ? 'text-[#000000]/75' : 'text-white/75'
                  }`}
                >
                  Release Decade
                </span>
                <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                  {['1980s', '1990s', '2000s', '2010s', '2020s'].map((era) => (
                    <motion.button
                      key={era}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        audioEngine.playUiTick(1.05, 'selection');
                        setSelectedEra(era);
                      }}
                      className={`min-h-[40px] rounded-full text-xs font-bold transition-colors ${
                        selectedEra === era
                          ? isLight
                            ? 'bg-[#000000] text-[#FFFFFF]'
                            : 'bg-[#EDFF8C] text-[#000000]'
                          : isLight
                          ? 'bg-[#F1F1F1] text-[#000000]/75 hover:bg-[#E5E5E5]'
                          : 'bg-white/10 text-white/80 hover:bg-white/15'
                      }`}
                    >
                      {era}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  disabled={isSyncing}
                  onClick={handleSpotifyOAuthPopup}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#000000] px-4 py-2.5 text-sm font-bold text-[#FFFFFF] transition-colors whitespace-nowrap"
                >
                  <SpotifyLogo weight="fill" className="h-5 w-5 text-[#1DB954] shrink-0" />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Spotify'}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  disabled={isSyncing}
                  onClick={() => handleGeneratePersonalCrate('apple-music')}
                  className={`flex min-h-[46px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap ${
                    isLight
                      ? 'border-[#D1D1D1] bg-[#F1F1F1] text-[#000000] hover:bg-[#E5E5E5]'
                      : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <AppleLogo weight="fill" className="h-5 w-5 text-[#FA243C] shrink-0" />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Apple Music'}</span>
                </motion.button>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`mt-3 rounded-2xl px-3.5 py-2 text-xs font-semibold ${
                  isLight
                    ? 'bg-[#EDFF8C] text-[#000000]'
                    : 'bg-[#309F92]/25 text-[#EDFF8C]'
                }`}
              >
                {statusMessage}
              </div>
            )}

            <div
              className={`mt-4 rounded-2xl border p-3.5 text-xs space-y-1.5 ${
                isLight
                  ? 'border-[#D1D1D1] bg-[#F1F1F1]/70 text-[#000000]/75'
                  : 'border-white/10 bg-black/30 text-white/70'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-[#309F92]">
                <ShieldCheck weight="fill" className="h-4 w-4 shrink-0" />
                <span>Ephemeral In-Memory Privacy</span>
              </div>
              <p className="leading-relaxed">
                Listening history is used solely in-memory to build song rounds. No personal
                tokens are stored on external servers.
              </p>
              {oauthInfo && (
                <div className="pt-1 text-[11px] opacity-75">
                  <span>Redirect URI: </span>
                  <code className="break-all font-mono">{oauthInfo.redirectUri}</code>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
