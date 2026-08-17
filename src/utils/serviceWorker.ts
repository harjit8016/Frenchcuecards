// Service Worker Registration and Lifecycle Manager for French Kiu PWA

export interface ServiceWorkerHooks {
  onUpdateAvailable?: () => void;
  onOnlineSync?: () => void;
  onOffline?: () => void;
}

let registrationInstance: ServiceWorkerRegistration | null = null;

export function registerServiceWorker(hooks?: ServiceWorkerHooks): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registrationInstance = registration;
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates on load
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available!
                console.log('[PWA] New content is available and will be used when all tabs are closed or reloaded.');
                hooks?.onUpdateAvailable?.();
              } else {
                // Content cached for offline use
                console.log('[PWA] Content is cached for offline use.');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });

    // Handle controller change (when new worker activates)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

/**
 * Check for updates manually in the background when connectivity resumes
 */
export async function checkForAppUpdates(): Promise<boolean> {
  if (!registrationInstance) return false;
  try {
    await registrationInstance.update();
    return true;
  } catch (err) {
    console.warn('[PWA] Failed to check for updates:', err);
    return false;
  }
}

/**
 * Force the waiting service worker to activate and reload the page
 */
export function applyUpdateAndReload(): void {
  if (registrationInstance && registrationInstance.waiting) {
    registrationInstance.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}
