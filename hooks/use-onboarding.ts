'use client';

import { useCallback, useEffect, useState } from 'react';

export const ONBOARDING_KEY = 'wavelet_onboarding_v1';

export function useOnboarding(ready: boolean) {
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get('autostart') === '1') return;
      try { if (['completed', 'skipped'].includes(localStorage.getItem(ONBOARDING_KEY) || '')) return; } catch { /* The intro still works without storage. */ }
      setRun(previous => previous + 1);
      setOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [ready]);

  const replay = useCallback(() => {
    setReplaying(true);
    setRun(previous => previous + 1);
    setOpen(true);
  }, []);

  const dismiss = useCallback((completed: boolean) => {
    try { localStorage.setItem(ONBOARDING_KEY, completed ? 'completed' : 'skipped'); } catch { /* Best effort. */ }
    setOpen(false);
  }, []);

  return { open, run, replaying, replay, dismiss };
}
