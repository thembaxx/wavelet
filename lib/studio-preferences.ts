export type MotionPreference = 'system' | 'full' | 'reduced';

export interface StudioPreferences {
  theme: 'light' | 'dark';
  muted: boolean;
  soundEffects: boolean;
  haptics: boolean;
  volume: number;
  motion: MotionPreference;
  compactCanvas: boolean;
  danceVideo: boolean;
}

export const PREFERENCES_KEY = 'wavelet_studio_preferences_v1';
export const DEFAULT_PREFERENCES: StudioPreferences = {
  theme: 'light',
  muted: false,
  soundEffects: true,
  haptics: true,
  volume: 0.7,
  motion: 'system',
  compactCanvas: false,
  danceVideo: false,
};

export function parsePreferences(raw: string | null): StudioPreferences {
  try {
    const saved: unknown = JSON.parse(raw || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...DEFAULT_PREFERENCES };
    const value = saved as Record<string, unknown>;
    return {
      theme: value.theme === 'dark' ? 'dark' : 'light',
      muted: typeof value.muted === 'boolean' ? value.muted : DEFAULT_PREFERENCES.muted,
      soundEffects: typeof value.soundEffects === 'boolean' ? value.soundEffects : DEFAULT_PREFERENCES.soundEffects,
      haptics: typeof value.haptics === 'boolean' ? value.haptics : DEFAULT_PREFERENCES.haptics,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume)
        ? Math.min(1, Math.max(0, value.volume)) : DEFAULT_PREFERENCES.volume,
      motion: value.motion === 'full' || value.motion === 'reduced' ? value.motion : 'system',
      compactCanvas: typeof value.compactCanvas === 'boolean' ? value.compactCanvas : DEFAULT_PREFERENCES.compactCanvas,
      danceVideo: typeof value.danceVideo === 'boolean' ? value.danceVideo : DEFAULT_PREFERENCES.danceVideo,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
