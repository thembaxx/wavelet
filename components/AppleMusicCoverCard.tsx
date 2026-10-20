'use client';

import React, { useState } from 'react';
import {
  MusicNotes,
  SpotifyLogo,
  AppleLogo,
  CheckCircle,
  Disc,
  Waveform,
} from '@phosphor-icons/react';
import {
  type SongTrack,
  type SongMoodProfile,
  buildStreamingLinks,
} from '@/lib/game-rules';
import { audioEngine } from '@/lib/audio-engine';

interface AppleMusicCoverCardProps {
  song: SongTrack;
  mood: SongMoodProfile;
  isRevealed: boolean;
  isPlaying: boolean;
  compact?: boolean;
  onSaveTrack?: (provider: 'spotify' | 'apple', song: SongTrack) => void;
}

export const AppleMusicCoverCard: React.FC<AppleMusicCoverCardProps> = ({
  song,
  mood,
  isRevealed,
  isPlaying,
  compact = false,
  onSaveTrack,
}) => {
  const [imgError, setImgError] = useState(false);
  const [savedSpotify, setSavedSpotify] = useState(false);
  const [savedApple, setSavedApple] = useState(false);

  const links = buildStreamingLinks(song);
  const showArt = isRevealed && Boolean(song.artworkUrl) && !imgError;

  const handleSave = (provider: 'spotify' | 'apple') => {
    audioEngine.playUiTick(1.25);
    if (provider === 'spotify') {
      setSavedSpotify(true);
    } else {
      setSavedApple(true);
    }
    onSaveTrack?.(provider, song);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/15 bg-[#120d1d]/90 shadow-2xl transition-all duration-300 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {/* Dynamic Apple Music-style Fluid Mood Aura */}
      <div
        className="pointer-events-none absolute -inset-8 opacity-35 transition-transform duration-700"
        style={{
          background: `radial-gradient(circle at 25% 25%, ${mood.primaryHex} 0%, transparent 55%), radial-gradient(circle at 80% 75%, ${mood.secondaryHex} 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${mood.accentHex} 0%, transparent 65%)`,
          transform: isPlaying ? 'scale(1.12) rotate(6deg)' : 'scale(1) rotate(0deg)',
        }}
      />

      <div className="relative z-10 flex items-center gap-3.5">
        {/* Squircle Animated Album Cover Container */}
        <div
          className={`relative shrink-0 overflow-hidden rounded-[20px] border border-white/20 shadow-lg transition-transform duration-500 ${
            compact ? 'h-16 w-16' : 'h-20 w-20'
          } ${isPlaying ? 'scale-[1.04]' : 'scale-100'}`}
          style={{
            background: `linear-gradient(135deg, ${mood.primaryHex}, ${mood.secondaryHex})`,
          }}
        >
          {showArt ? (
            <img
              src={song.artworkUrl}
              alt={`${song.title} by ${song.artist} cover art`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className={`h-full w-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-110' : 'scale-100'
              }`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-white">
              <Disc
                weight="duotone"
                className={`h-9 w-9 ${isPlaying ? 'animate-spin' : ''}`}
              />
              {!isRevealed && (
                <span className="mt-0.5 text-[10px] font-semibold tracking-wider uppercase opacity-90">
                  Mystery
                </span>
              )}
            </div>
          )}

          {/* Subtle Apple Music animated sheen overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 48%, rgba(0,0,0,0.35) 100%)',
            }}
          />
        </div>

        {/* Song Metadata or Mystery Rhythm Prompt */}
        <div className="min-w-0 flex-1">
          {isRevealed ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="truncate">{song.genre}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{song.releaseYear}</span>
                <span aria-hidden="true">·</span>
                <span>{mood.label}</span>
              </div>
              <h3 className="mt-0.5 truncate text-base font-bold tracking-tight text-white">
                {song.title}
              </h3>
              <p className="truncate text-sm font-medium text-slate-200">
                {song.artist} — <span className="text-slate-400">{song.album}</span>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Waveform weight="bold" className="h-3.5 w-3.5 text-[#00F5D4]" />
                <span>{mood.label}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{mood.bpm} BPM</span>
              </div>
              <h3 className="mt-0.5 truncate text-base font-bold tracking-tight text-white">
                Listen &amp; Guess the Track
              </h3>
              <p className="truncate text-xs text-slate-300">
                Era: {song.decade} · Category: {song.genre}
              </p>
            </>
          )}

          {/* Direct Spotify & Apple Music Save / Open Actions when revealed */}
          {isRevealed && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <a
                href={links.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleSave('spotify')}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-[#1DB954]/20 px-3 py-1 text-xs font-semibold text-[#1ED760] border border-[#1DB954]/40 hover:bg-[#1DB954]/30 transition-colors whitespace-nowrap shrink-0"
              >
                {savedSpotify ? (
                  <CheckCircle weight="fill" className="h-4 w-4" />
                ) : (
                  <SpotifyLogo weight="fill" className="h-4 w-4" />
                )}
                <span>{savedSpotify ? 'Added to Spotify Crate' : 'Add to Spotify'}</span>
              </a>

              <a
                href={links.appleMusicUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleSave('apple')}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-[#FA243C]/20 px-3 py-1 text-xs font-semibold text-[#FF4D62] border border-[#FA243C]/40 hover:bg-[#FA243C]/30 transition-colors whitespace-nowrap shrink-0"
              >
                {savedApple ? (
                  <CheckCircle weight="fill" className="h-4 w-4" />
                ) : (
                  <AppleLogo weight="fill" className="h-4 w-4" />
                )}
                <span>{savedApple ? 'Saved to Apple Music' : 'Apple Music'}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
