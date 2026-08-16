/**
 * Hardware Haptic Feedback helper
 * Uses Web Vibration API (navigator.vibrate) when supported on mobile devices.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning';

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'selection':
          navigator.vibrate(10); // subtle 10ms click
          break;
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'heavy':
          navigator.vibrate(50);
          break;
        case 'success':
          navigator.vibrate([20, 40, 30]); // double pulse
          break;
        case 'warning':
          navigator.vibrate([40, 50, 40]);
          break;
      }
    }
  } catch {
    // Graceful fallback on devices that block vibration without user interaction
  }
}
