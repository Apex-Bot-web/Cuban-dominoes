import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === '1',
  );

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function install() {
    if (!deferredPrompt) return;
    void deferredPrompt.prompt().then(() =>
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') setInstalled(true);
        setDeferredPrompt(null);
      }),
    );
  }

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1');
    setDismissed(true);
  }

  // Show the banner only when the browser offers the prompt and user hasn't dismissed
  const showBanner = !!deferredPrompt && !installed && !dismissed;

  return { showBanner, install, dismiss };
}
