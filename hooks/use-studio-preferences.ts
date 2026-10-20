'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, parsePreferences, type StudioPreferences } from '@/lib/studio-preferences';

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function useStudioPreferences() {
  const [preferences, setPreferences] = useState<StudioPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const systemReducedMotion = useSyncExternalStore(subscribeToMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setPreferences(parsePreferences(localStorage.getItem(PREFERENCES_KEY)));
      } catch { /* Preferences still work when storage is unavailable. */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    audioEngine.setMuted(preferences.muted);
    audioEngine.setVolume(preferences.volume);
    audioEngine.setSoundEffectsEnabled(preferences.soundEffects);
    audioEngine.setHapticsEnabled(preferences.haptics);
    if (!ready) return;
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Best effort. */ }
  }, [preferences, ready]);

  const updatePreferences = useCallback((patch: Partial<StudioPreferences>) => {
    setPreferences(previous => ({ ...previous, ...patch }));
  }, []);

  const reducedMotion = preferences.motion === 'reduced' ||
    (preferences.motion === 'system' && systemReducedMotion);

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [reducedMotion]);

  return { preferences, updatePreferences, reducedMotion };
}
