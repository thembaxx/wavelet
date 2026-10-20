'use client';

import React, { useState } from 'react';
import {
  SpotifyLogo,
  AppleLogo,
  CheckCircle,
  Disc,
  Waveform,
} from '@phosphor-icons/react';
import {
  type SongTrack,
  type SongMoodProfile,
  type ThemeMode,
  buildStreamingLinks,
} from '@/lib/game-rules';
import { audioEngine } from '@/lib/audio-engine';

interface AppleMusicCoverCardProps {
  song: SongTrack;
  mood: SongMoodProfile;
  themeMode: ThemeMode;
  isRevealed: boolean;
  isPlaying: boolean;
  compact?: boolean;
  artistHintText?: string | null;
  onSaveTrack?: (provider: 'spotify' | 'apple', song: SongTrack) => void;
}

export const AppleMusicCoverCard: React.FC<AppleMusicCoverCardProps> = ({
  song,
  mood,
  themeMode,
  isRevealed,
  isPlaying,
  compact = false,
  artistHintText,
  onSaveTrack,
}) => {
  const [imgError, setImgError] = useState(false);
  const [savedSpotify, setSavedSpotify] = useState(false);
  const [savedApple, setSavedApple] = useState(false);

  const isLight = themeMode === 'light';
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
      className={`relative overflow-hidden rounded-[22px] border transition-all duration-300 ${
        isLight
          ? 'border-[#E3DCD0] bg-[#FAF7F0]/95 text-[#231C18] shadow-[0_8px_24px_rgba(35,28,24,0.06)]'
          : 'border-[#38BDF8]/20 bg-[#091826]/90 text-[#F0F9FF] shadow-2xl'
      } ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      {/* Dynamic Apple Music-style Fluid Mood Aura */}
      <div
        className={`pointer-events-none absolute -inset-8 transition-transform duration-700 ${
          isLight ? 'opacity-20' : 'opacity-30'
        }`}
        style={{
          background: `radial-gradient(circle at 25% 25%, ${mood.primaryHex} 0%, transparent 55%), radial-gradient(circle at 80% 75%, ${mood.secondaryHex} 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${mood.accentHex} 0%, transparent 65%)`,
          transform: isPlaying ? 'scale(1.12) rotate(6deg)' : 'scale(1) rotate(0deg)',
        }}
      />

      <div className="relative z-10 flex items-center gap-3">
        {/* Squircle Animated Album Cover Container */}
        <div
          className={`relative shrink-0 overflow-hidden rounded-[16px] border shadow-md transition-transform duration-500 ${
            isLight ? 'border-[#DCD4C6]' : 'border-[#38BDF8]/25'
          } ${compact ? 'h-14 w-14' : 'h-18 w-18'} ${
            isPlaying ? 'scale-[1.04]' : 'scale-100'
          }`}
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
            <div className="flex h-full w-full flex-col items-center justify-center p-1.5 text-center text-white">
              <Disc
                weight="duotone"
                className={`h-7 w-7 ${isPlaying ? 'animate-spin' : ''}`}
              />
              {!isRevealed && (
                <span className="mt-0.5 text-[9px] font-bold tracking-wider uppercase opacity-95">
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
                'linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 48%, rgba(0,0,0,0.22) 100%)',
            }}
          />
        </div>

        {/* Song Metadata or Mystery Rhythm Prompt */}
        <div className="min-w-0 flex-1">
          {isRevealed ? (
            <>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap overflow-hidden ${
                  isLight ? 'text-[#6E6259]' : 'text-sky-200/75'
                }`}
              >
                <span className="shrink-0">{song.genre}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums shrink-0">{song.releaseYear}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{mood.label}</span>
              </div>
              <h3
                className={`truncate text-sm font-extrabold tracking-tight ${
                  isLight ? 'text-[#231C18]' : 'text-white'
                }`}
              >
                {song.title}
              </h3>
              <p
                className={`truncate text-xs font-semibold ${
                  isLight ? 'text-[#574C44]' : 'text-sky-100/85'
                }`}
              >
                {song.artist} —{' '}
                <span className={isLight ? 'text-[#85776C]' : 'text-sky-200/60'}>
                  {song.album}
                </span>
              </p>
            </>
          ) : (
            <>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-bold ${
                  isLight ? 'text-[#5C5046]' : 'text-sky-200/80'
                }`}
              >
                <Waveform
                  weight="bold"
                  className="h-3.5 w-3.5"
                  style={{ color: mood.primaryHex }}
                />
                <span>{mood.label}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{mood.bpm} BPM</span>
              </div>
              <h3
                className={`mt-0.5 truncate text-sm font-extrabold tracking-tight ${
                  isLight ? 'text-[#231C18]' : 'text-white'
                }`}
              >
                {artistHintText ? artistHintText : 'Listen & Guess the Track'}
              </h3>
              <p
                className={`truncate text-xs font-medium ${
                  isLight ? 'text-[#6E6259]' : 'text-sky-200/70'
                }`}
              >
                Era: {song.decade} · Genre: {song.genre}
              </p>
            </>
          )}

          {/* Direct Spotify & Apple Music Save / Open Actions when revealed */}
          {isRevealed && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <a
                href={links.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleSave('spotify')}
                className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'bg-[#1DB954]/15 text-[#117a37] border border-[#1DB954]/30 hover:bg-[#1DB954]/25'
                    : 'bg-[#1DB954]/20 text-[#1ED760] border border-[#1DB954]/40 hover:bg-[#1DB954]/30'
                }`}
              >
                {savedSpotify ? (
                  <CheckCircle weight="fill" className="h-3.5 w-3.5" />
                ) : (
                  <SpotifyLogo weight="fill" className="h-3.5 w-3.5" />
                )}
                <span>{savedSpotify ? 'Added to Spotify' : 'Spotify'}</span>
              </a>

              <a
                href={links.appleMusicUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleSave('apple')}
                className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'bg-[#FA243C]/12 text-[#c81428] border border-[#FA243C]/25 hover:bg-[#FA243C]/20'
                    : 'bg-[#FA243C]/20 text-[#FF4D62] border border-[#FA243C]/40 hover:bg-[#FA243C]/30'
                }`}
              >
                {savedApple ? (
                  <CheckCircle weight="fill" className="h-3.5 w-3.5" />
                ) : (
                  <AppleLogo weight="fill" className="h-3.5 w-3.5" />
                )}
                <span>{savedApple ? 'Saved to Apple' : 'Apple Music'}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
