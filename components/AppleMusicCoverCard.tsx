'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
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
  snippetProgress?: number;
  snippetDuration?: number;
  compact?: boolean;
  artistHintText?: string | null;
  onSaveTrack?: (provider: 'spotify' | 'apple', song: SongTrack) => void;
  onReplaySnippet?: () => void;
}

const WAVEFORM_BARS = [
  0.34, 0.72, 0.45, 0.88, 0.56, 0.32, 0.65, 0.94, 0.48, 0.76, 0.38, 0.62,
  0.85, 0.52, 0.96, 0.44, 0.68, 0.36, 0.78, 0.58, 0.9, 0.42, 0.64, 0.82,
  0.46, 0.7, 0.35, 0.86, 0.54, 0.74, 0.4, 0.6,
];

export const AppleMusicCoverCard: React.FC<AppleMusicCoverCardProps> = ({
  song,
  mood,
  themeMode,
  isRevealed,
  isPlaying,
  snippetProgress = 0,
  snippetDuration = 5,
  compact = false,
  artistHintText,
  onSaveTrack,
  onReplaySnippet,
}) => {
  const [imgError, setImgError] = useState(false);
  const [savedSpotify, setSavedSpotify] = useState(false);
  const [savedApple, setSavedApple] = useState(false);

  const isLight = themeMode === 'light';
  const links = buildStreamingLinks(song);
  const showArt = isRevealed && Boolean(song.artworkUrl) && !imgError;

  const elapsedFormatted = useMemo(() => {
    const sec = Math.min(snippetDuration, Math.round(snippetProgress * snippetDuration));
    return `00:${String(sec).padStart(2, '0')}`;
  }, [snippetProgress, snippetDuration]);

  const totalFormatted = useMemo(() => {
    return `00:${String(snippetDuration).padStart(2, '0')}`;
  }, [snippetDuration]);

  const handleSave = (provider: 'spotify' | 'apple') => {
    audioEngine.playUiTick(1.25, 'success');
    if (provider === 'spotify') {
      setSavedSpotify(true);
    } else {
      setSavedApple(true);
    }
    onSaveTrack?.(provider, song);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-[24px] border transition-colors duration-300 ${
        isRevealed
          ? isLight
            ? 'border-[#000000]/12 bg-[#EDFF8C] text-[#000000]'
            : 'border-[#EDFF8C]/35 bg-[#141A17] text-[#FFFFFF]'
          : isLight
          ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000] shadow-[0_8px_24px_rgba(0,0,0,0.04)]'
          : 'border-white/12 bg-[#12161D] text-[#FFFFFF] shadow-xl'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="relative z-10 flex items-center gap-3">
        {/* Geometric Cover Art Frame (Inspired by IMG_5813 & IMG_5810) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            audioEngine.playUiTick(1.1, 'medium');
            onReplaySnippet?.();
          }}
          aria-label="Replay song snippet"
          className={`relative shrink-0 overflow-hidden rounded-[18px] border transition-transform ${
            isLight ? 'border-[#000000]/10' : 'border-white/15'
          } ${compact ? 'h-14 w-14' : 'h-16 w-16'}`}
          style={{
            background: showArt
              ? '#000000'
              : `linear-gradient(135deg, ${mood.primaryHex}, #000000)`,
          }}
        >
          {showArt ? (
            <img
              src={song.artworkUrl}
              alt={`${song.title} by ${song.artist} cover art`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className={`h-full w-full object-cover transition-transform duration-500 ${
                isPlaying ? 'scale-108' : 'scale-100'
              }`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-white">
              <Disc
                weight="duotone"
                className={`h-7 w-7 ${isPlaying ? 'animate-spin' : ''}`}
                style={{ color: '#EDFF8C' }}
              />
            </div>
          )}
        </motion.button>

        {/* Clean Unboxed Metadata & Track Title (Zero-Pill Discipline) */}
        <div className="min-w-0 flex-1">
          {isRevealed ? (
            <>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap overflow-hidden ${
                  isLight ? 'text-[#000000]/65' : 'text-white/65'
                }`}
              >
                <span className="shrink-0">{song.genre}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums shrink-0">{song.releaseYear}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{song.album}</span>
              </div>
              <h3 className="truncate text-sm font-bold tracking-tight">
                {song.title}
              </h3>
              <p
                className={`truncate text-xs font-medium ${
                  isLight ? 'text-[#000000]/80' : 'text-white/80'
                }`}
              >
                {song.artist}
              </p>
            </>
          ) : (
            <>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap overflow-hidden ${
                  isLight ? 'text-[#309F92]' : 'text-[#EDFF8C]'
                }`}
              >
                <Waveform weight="bold" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{mood.label}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums shrink-0">{song.decade}</span>
              </div>
              <h3 className="mt-0.5 truncate text-sm font-bold tracking-tight">
                {artistHintText ? artistHintText : 'Listen & Guess the Track'}
              </h3>
              <p
                className={`truncate text-xs ${
                  isLight ? 'text-[#000000]/60' : 'text-white/60'
                }`}
              >
                {song.genre} · {snippetDuration}s Snippet Cut
              </p>
            </>
          )}
        </div>

        {/* Signature Solid Black Circular Badge (Inspired directly by "83" / "90" in IMG_5847!) */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums ${
            isRevealed && isLight
              ? 'bg-[#000000] text-[#EDFF8C]'
              : isLight
              ? 'bg-[#000000] text-[#FFFFFF]'
              : 'bg-[#EDFF8C] text-[#000000]'
          }`}
          title="Track Tempo (BPM)"
        >
          {mood.bpm}
        </div>
      </div>

      {/* Interactive Vertical-Bar Waveform Scrubber (Inspired directly by IMG_5813 & IMG_5816!) */}
      <div className="mt-2.5">
        <div
          onClick={() => {
            audioEngine.playUiTick(1.15, 'light');
            onReplaySnippet?.();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onReplaySnippet?.();
            }
          }}
          aria-label="Audio snippet waveform progress"
          className="flex h-6 w-full cursor-pointer items-end justify-between gap-[3px] px-0.5"
        >
          {WAVEFORM_BARS.map((heightRatio, idx) => {
            const barProgress = idx / (WAVEFORM_BARS.length - 1);
            const isPlayed = isPlaying ? barProgress <= snippetProgress : false;
            const animatedHeight = isPlaying
              ? Math.max(0.22, Math.min(1, heightRatio * (0.75 + 0.25 * Math.sin(idx * 1.3 + snippetProgress * 18))))
              : heightRatio * 0.72;

            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isPlayed
                    ? isRevealed && isLight
                      ? 'bg-[#000000]'
                      : 'bg-[#309F92]'
                    : isRevealed && isLight
                    ? 'bg-[#000000]/22'
                    : isLight
                    ? 'bg-[#D1D1D1]'
                    : 'bg-white/20'
                }`}
                style={{
                  height: `${Math.round(animatedHeight * 22)}px`,
                }}
              />
            );
          })}
        </div>

        <div
          className={`mt-1 flex items-center justify-between font-mono text-[10px] font-medium tabular-nums ${
            isRevealed && isLight
              ? 'text-[#000000]/70'
              : isLight
              ? 'text-[#000000]/55'
              : 'text-white/55'
          }`}
        >
          <span>{elapsedFormatted}</span>
          <span>{isPlaying ? 'Spinning Vinyl Cut' : 'Tap waveform to replay'}</span>
          <span>{totalFormatted}</span>
        </div>
      </div>

      {/* Direct Spotify & Apple Music Save / Open Actions when revealed */}
      {isRevealed && (
        <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
          <motion.a
            whileTap={{ scale: 0.96 }}
            href={links.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleSave('spotify')}
            className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#000000] px-3 py-1.5 text-xs font-bold text-[#FFFFFF] transition-transform whitespace-nowrap"
          >
            {savedSpotify ? (
              <CheckCircle weight="fill" className="h-3.5 w-3.5 text-[#EDFF8C]" />
            ) : (
              <SpotifyLogo weight="fill" className="h-3.5 w-3.5 text-[#1DB954]" />
            )}
            <span>{savedSpotify ? 'Saved to Spotify' : 'Add to Spotify'}</span>
          </motion.a>

          <motion.a
            whileTap={{ scale: 0.96 }}
            href={links.appleMusicUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleSave('apple')}
            className={`inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-transform whitespace-nowrap ${
              isLight
                ? 'border-[#000000]/20 bg-[#FFFFFF] text-[#000000]'
                : 'border-white/20 bg-white/10 text-[#FFFFFF]'
            }`}
          >
            {savedApple ? (
              <CheckCircle weight="fill" className="h-3.5 w-3.5 text-[#309F92]" />
            ) : (
              <AppleLogo weight="fill" className="h-3.5 w-3.5 text-[#FA243C]" />
            )}
            <span>{savedApple ? 'Saved to Apple' : 'Apple Music'}</span>
          </motion.a>
        </div>
      )}
    </motion.div>
  );
};
