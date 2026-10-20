'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const updating = useRef(false);

  useEffect(() => {
    let disposed = false;
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const sync = () => {
      setIsOnline(navigator.onLine);
      setIsInstalled(previous => previous || displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
      setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      setCanFullscreen(document.fullscreenEnabled === true);
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const timer = window.setTimeout(sync, 0);
    const onInstallPrompt = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as BeforeInstallPromptEvent); };
    const onInstalled = () => { setIsInstalled(true); setDeferredPrompt(null); setAppStatus('Wavelet is ready on your home screen.'); };
    const onController = () => { if (updating.current) window.location.reload(); };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    displayMode.addEventListener('change', sync);
    document.addEventListener('fullscreenchange', sync);
    navigator.serviceWorker?.addEventListener('controllerchange', onController);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(async current => {
        if (disposed) return;
        registration.current = current;
        if (current.waiting) setUpdateAvailable(true);
        current.addEventListener('updatefound', () => {
          const installing = current.installing;
          installing?.addEventListener('statechange', () => {
            if (!disposed && installing.state === 'installed' && navigator.serviceWorker.controller) setUpdateAvailable(true);
          });
        });
        await navigator.serviceWorker.ready;
        if (!disposed) setOfflineReady(true);
      }).catch(() => { if (!disposed) setAppStatus('Offline setup is unavailable in this browser. Online play still works.'); });
    }
    return () => {
      disposed = true; clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt); window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline);
      displayMode.removeEventListener('change', sync); document.removeEventListener('fullscreenchange', sync);
      navigator.serviceWorker?.removeEventListener('controllerchange', onController);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') { setIsInstalled(true); return true; }
      setAppStatus('You can install Wavelet later from your browser menu.');
    } catch { setAppStatus('Use your browser menu to install Wavelet.'); }
    return false;
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    const waiting = registration.current?.waiting;
    if (!waiting) return;
    updating.current = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setAppStatus('Fullscreen is unavailable here. Install Wavelet for a dedicated app window.'); }
  }, []);

  return { isInstallable: Boolean(deferredPrompt), isInstalled, isIOS, isOnline, install, offlineReady, updateAvailable, applyUpdate, isFullscreen, canFullscreen, toggleFullscreen, appStatus };
}
