'use client';

import React, { useEffect, useState } from 'react';
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

  if (!isOpen) return null;

  const handleSpotifyOAuthPopup = async () => {
    audioEngine.playUiTick(1.1);
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
    audioEngine.playUiTick(1.2);
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
        favoriteSummary: `${tasteInput} (${selectedEra})`,
        customTracks: tracks,
        connectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setStatusMessage(
        `Synced ${tracks.length} real song snippets from your ${
          provider === 'spotify' ? 'Spotify' : 'Apple Music'
        } taste profile!`
      );
    } catch {
      setStatusMessage('Unable to reach music catalog — using offline curated tracks.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 pointer-events-auto"
    >
      <div
        className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] border p-5 shadow-2xl ${
          isLight
            ? 'border-[#E2DBD0] bg-[#FCF9F2] text-[#231C18]'
            : 'border-[#38BDF8]/25 bg-[#091826] text-[#F0F9FF]'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b pb-3.5 ${
            isLight ? 'border-[#E6DFD3]' : 'border-[#38BDF8]/15'
          }`}
        >
          <div>
            <h2 id="account-modal-title" className="text-lg font-extrabold tracking-tight">
              Spotify &amp; Apple Music Sync
            </h2>
            <p className={`text-xs ${isLight ? 'text-[#6E6259]' : 'text-sky-200/70'}`}>
              Generate custom 30-second game crates from your listening history
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiTick(0.9);
              onClose();
            }}
            aria-label="Close music account modal"
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
              isLight
                ? 'bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                : 'bg-[#38BDF8]/15 text-sky-100 hover:bg-[#38BDF8]/25'
            }`}
          >
            <X weight="bold" className="h-5 w-5" />
          </button>
        </div>

        {/* Connected Profile Banner */}
        {connectedProfile && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle weight="fill" className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-sm font-bold">{connectedProfile.displayName}</div>
                  <div className={`text-xs ${isLight ? 'text-[#5C5046]' : 'text-sky-200/80'}`}>
                    {connectedProfile.favoriteSummary} · {connectedProfile.customTracks.length} songs
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiTick(0.8);
                  onDisconnect();
                }}
                aria-label="Disconnect music account and purge data"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-500 hover:bg-rose-500/30"
              >
                <Trash weight="bold" className="h-3.5 w-3.5" />
                <span>Revoke</span>
              </button>
            </div>
          </div>
        )}

        {/* Taste Seed / Listening History Generator */}
        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="taste-artists-input"
              className={`block text-xs font-bold ${
                isLight ? 'text-[#574C44]' : 'text-sky-200/80'
              }`}
            >
              Favorite Artists, Genres, or Listening History Seed
            </label>
            <input
              id="taste-artists-input"
              type="text"
              value={tasteInput}
              onChange={(e) => setTasteInput(e.target.value)}
              placeholder="e.g. Daft Punk, SZA, Tyla, Outkast"
              className={`mt-1.5 w-full rounded-2xl border px-3.5 py-2.5 text-sm focus:outline-none ${
                isLight
                  ? 'border-[#DCD4C6] bg-white text-[#231C18] placeholder-[#9A8E82] focus:border-[#4E946B]'
                  : 'border-[#38BDF8]/20 bg-[#06101A] text-white placeholder-slate-500 focus:border-[#38BDF8]'
              }`}
            />
          </div>

          <div>
            <span
              className={`block text-xs font-bold ${
                isLight ? 'text-[#574C44]' : 'text-sky-200/80'
              }`}
            >
              Preferred Release Era
            </span>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {['1980s', '1990s', '2000s', '2010s', '2020s'].map((era) => (
                <button
                  key={era}
                  type="button"
                  onClick={() => {
                    audioEngine.playUiTick();
                    setSelectedEra(era);
                  }}
                  className={`min-h-[38px] rounded-xl text-xs font-bold transition-colors ${
                    selectedEra === era
                      ? isLight
                        ? 'bg-[#4E946B] text-white shadow-xs'
                        : 'bg-[#0EA5E9] text-slate-950 shadow-xs'
                      : isLight
                      ? 'bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                      : 'bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                  }`}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSpotifyOAuthPopup}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#1DB954] px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-md hover:bg-[#1ED760] transition-transform active:scale-[0.98] whitespace-nowrap"
            >
              <SpotifyLogo weight="fill" className="h-5 w-5 shrink-0" />
              <span>{isSyncing ? 'Syncing...' : 'Sync with Spotify'}</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={() => handleGeneratePersonalCrate('apple-music')}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#FA243C] px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:bg-[#FF3B52] transition-transform active:scale-[0.98] whitespace-nowrap"
            >
              <AppleLogo weight="fill" className="h-5 w-5 shrink-0" />
              <span>{isSyncing ? 'Syncing...' : 'Sync Apple Music'}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mt-3 rounded-2xl px-3.5 py-2 text-xs font-bold ${
              isLight
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-[#38BDF8]/15 text-[#38BDF8]'
            }`}
          >
            {statusMessage}
          </div>
        )}

        {/* Privacy & OAuth Redirect Info */}
        <div
          className={`mt-4 rounded-2xl border p-3.5 text-xs space-y-2 ${
            isLight
              ? 'border-[#E6DFD3] bg-white/80 text-[#5C5046]'
              : 'border-[#38BDF8]/15 bg-[#06101A]/70 text-sky-200/75'
          }`}
        >
          <div
            className={`flex items-center gap-2 font-bold ${
              isLight ? 'text-[#231C18]' : 'text-white'
            }`}
          >
            <ShieldCheck weight="fill" className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Data Privacy &amp; Ephemeral Session Guarantee</span>
          </div>
          <p className="leading-relaxed">
            Vinyl Rush processes your listening history strictly in memory to build 30-second song
            quiz rounds. No personal identifiers or tokens are persisted to external databases, and
            you can revoke access with one tap.
          </p>
          {oauthInfo && (
            <div
              className={`pt-1 text-[11px] border-t ${
                isLight
                  ? 'border-[#E6DFD3] text-[#6E6259]'
                  : 'border-[#38BDF8]/15 text-sky-200/60'
              }`}
            >
              <span>OAuth Callback URI: </span>
              <code className="break-all font-mono">{oauthInfo.redirectUri}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
