'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, parsePreferences, type StudioPreferences } from '@/lib/studio-preferences';

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function subscribeToColorScheme(onChange: () => void) {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function useStudioPreferences() {
  const [preferences, setPreferences] = useState<StudioPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const systemReducedMotion = useSyncExternalStore(subscribeToMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => true);
  const systemDark = useSyncExternalStore(subscribeToColorScheme,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches, () => false);
  const resolvedTheme = preferences.theme === 'system' ? systemDark ? 'dark' : 'light' : preferences.theme;

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
    if (!ready) return;
    audioEngine.setMuted(preferences.muted);
    audioEngine.setVolume(preferences.volume);
    audioEngine.setSoundEffectsEnabled(preferences.soundEffects);
    audioEngine.setHapticsEnabled(preferences.haptics);
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Best effort. */ }
  }, [preferences, ready]);

  useEffect(() => {
    if (!ready) return;
    const color = resolvedTheme === 'dark' ? '#102721' : '#f7f8f2';
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
    document.body.dataset.theme = resolvedTheme;
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => { meta.setAttribute('content', color); meta.removeAttribute('media'); });
  }, [resolvedTheme, ready]);

  const updatePreferences = useCallback((patch: Partial<StudioPreferences>) => {
    setPreferences(previous => ({ ...previous, ...patch }));
  }, []);

  const reducedMotion = preferences.motion === 'reduced' ||
    (preferences.motion === 'system' && systemReducedMotion);

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [reducedMotion]);

  return { preferences, updatePreferences, reducedMotion, resolvedTheme, ready };
}
