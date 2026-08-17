import { useState, useEffect, useCallback } from 'react';
import { checkForAppUpdates, applyUpdateAndReload, registerServiceWorker } from '../utils/serviceWorker';
import { triggerHaptic } from '../utils/haptics';

export interface NetworkStatusState {
  isOnline: boolean;
  wasOffline: boolean;
  isUpdateAvailable: boolean;
  showOnlineBanner: boolean;
  dismissOnlineBanner: () => void;
  applyUpdate: () => void;
}

export function useNetworkStatus(): NetworkStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [showOnlineBanner, setShowOnlineBanner] = useState<boolean>(false);

  // Apply update and reload
  const applyUpdate = useCallback(() => {
    triggerHaptic('success');
    applyUpdateAndReload();
  }, []);

  const dismissOnlineBanner = useCallback(() => {
    setShowOnlineBanner(false);
  }, []);

  useEffect(() => {
    // Register Service Worker with update hooks
    registerServiceWorker({
      onUpdateAvailable: () => {
        setIsUpdateAvailable(true);
        triggerHaptic('success');
      },
    });

    const handleOnline = async () => {
      setIsOnline(true);
      triggerHaptic('success');

      // If previously offline, show reconnection banner and check for latest app updates
      setShowOnlineBanner(true);
      
      // Auto-hide online banner after 4 seconds
      const timer = setTimeout(() => {
        setShowOnlineBanner(false);
      }, 4000);

      // Check for background updates from server
      await checkForAppUpdates();

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowOnlineBanner(false);
      triggerHaptic('warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    wasOffline,
    isUpdateAvailable,
    showOnlineBanner,
    dismissOnlineBanner,
    applyUpdate,
  };
}
