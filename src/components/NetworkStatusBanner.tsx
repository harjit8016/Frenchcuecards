import React from 'react';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NetworkStatusState } from '../hooks/useNetworkStatus';

interface NetworkStatusBannerProps {
  networkStatus: NetworkStatusState;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ networkStatus }) => {
  const { isOnline, showOnlineBanner, isUpdateAvailable, dismissOnlineBanner, applyUpdate } = networkStatus;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-3 pointer-events-none">
      <AnimatePresence mode="sync">
        {/* 1. Offline Notification Bar */}
        {!isOnline && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto w-full py-2 px-3.5 rounded-2xl bg-[#00174D]/95 text-white border border-[#FF9933] shadow-xl flex items-center justify-between gap-2 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs font-bold font-gurmukhi text-amber-300">
              <WifiOff className="w-4 h-4 text-[#FF9933] shrink-0 stroke-[2.5]" />
              <span>ਤੁਸੀਂ ਆਫ਼ਲਾਈਨ ਹੋ (Offline Mode) · ਸਾਰੇ ਸ਼ਬਦ ਉਪਲਬਧ ਹਨ</span>
            </div>
          </motion.div>
        )}

        {/* 2. Reconnected Online Synchronized Banner */}
        {isOnline && showOnlineBanner && (
          <motion.div
            key="online-banner"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto w-full py-2 px-3.5 rounded-2xl bg-emerald-950/95 text-white border border-emerald-500 shadow-xl flex items-center justify-between gap-2 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs font-bold font-gurmukhi text-emerald-300">
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
              <span>ਵਾਪਸ ਔਨਲਾਈਨ! ਨਵੀਂ ਜਾਣਕਾਰੀ ਸਿੰਕ ਹੋ ਗਈ ਹੈ (Connected)</span>
            </div>
            <button
              type="button"
              onClick={dismissOnlineBanner}
              className="p-1 text-emerald-400 hover:text-white transition-colors"
              title="ਬੰਦ ਕਰੋ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* 3. New PWA Version Available Banner */}
        {isOnline && isUpdateAvailable && (
          <motion.div
            key="update-banner"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto w-full py-2.5 px-3.5 rounded-2xl bg-[#00174D]/95 text-white border border-[#FFD700] shadow-2xl flex items-center justify-between gap-2 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs font-black font-gurmukhi text-[#FFD700]">
              <RefreshCw className="w-4 h-4 text-[#FF9933] shrink-0 animate-spin" />
              <span>ਨਵਾਂ ਅੱਪਡੇਟ ਉਪਲਬਧ ਹੈ! (New Version)</span>
            </div>
            <button
              type="button"
              onClick={applyUpdate}
              className="px-2.5 py-1 rounded-lg bg-[#FF9933] text-[#00174D] text-[11px] font-black hover:bg-[#FFD700] transition-colors border border-[#FFD700] active:scale-95 shadow shrink-0"
            >
              ਰਿਫ੍ਰੈਸ਼ (Reload)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
