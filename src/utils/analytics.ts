import { doc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { getDb, initAnalytics } from '../lib/firebase';

const VISITOR_STORAGE_KEY = 'french_kiu_visitor_id';
const VISIT_COUNT_KEY = 'french_kiu_visit_count';
const LOCAL_SESSION_KEY = 'french_kiu_local_stats';

interface LocalStats {
  totalSessions: number;
  totalCardsStudied: number;
  totalAudioPlays: number;
  lastActive: string;
}

export const getLocalStats = (): LocalStats => {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    totalSessions: 0,
    totalCardsStudied: 0,
    totalAudioPlays: 0,
    lastActive: new Date().toISOString(),
  };
};

export const saveLocalStats = (stats: LocalStats) => {
  try {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
};

/**
 * Generate or retrieve persistent anonymous visitor ID
 */
export const getVisitorId = (): string => {
  try {
    let id = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id) {
      id = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'temp_anon_' + Math.random().toString(36).substring(2, 10);
  }
};

/**
 * Record a user session - sends to Firebase Google Analytics & Firestore
 */
export const recordUserSession = async (currentLevel: string = 'A1') => {
  try {
    const visitorId = getVisitorId();
    const isNewVisitor = !localStorage.getItem(VISIT_COUNT_KEY);

    let visits = 1;
    try {
      const storedVisits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
      visits = storedVisits + 1;
      localStorage.setItem(VISIT_COUNT_KEY, visits.toString());
    } catch {
      // ignore
    }

    // 1. Update offline local stats
    const local = getLocalStats();
    local.totalSessions += 1;
    local.lastActive = new Date().toISOString();
    saveLocalStats(local);

    // 2. Log to Firebase Google Analytics (GA4 - G-CZDXW6KL92)
    initAnalytics()
      .then((analytics) => {
        if (analytics) {
          logEvent(analytics, 'session_start', {
            visitor_id: visitorId,
            current_level: currentLevel,
            visit_count: visits,
          });
          logEvent(analytics, 'page_view', {
            page_title: 'French Vira Learn',
            page_location: window.location.href,
            page_path: window.location.pathname,
          });
        }
      })
      .catch(() => {});

    // 3. Persistent Firestore Visitor Profile (if Firestore enabled in project)
    try {
      const db = getDb();
      if (db) {
        const visitorRef = doc(db, 'visitors', visitorId);
        setDoc(
          visitorRef,
          {
            visitorId,
            lastSeen: serverTimestamp(),
            visitCount: visits,
            currentLevel,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
            language: typeof navigator !== 'undefined' ? navigator.language : '',
            ...(isNewVisitor ? { firstSeen: serverTimestamp() } : {}),
          },
          { merge: true }
        ).catch(() => {});

        // 4. Global App Metrics Counter
        const globalMetricRef = doc(db, 'app_metrics', 'global');
        updateDoc(globalMetricRef, {
          totalSessions: increment(1),
          ...(isNewVisitor ? { totalUniqueUsers: increment(1) } : {}),
          lastActivity: serverTimestamp(),
        }).catch(() => {
          setDoc(
            globalMetricRef,
            {
              totalSessions: 1,
              totalUniqueUsers: 1,
              totalAudioPlays: 0,
              totalCardsStudied: 0,
              lastActivity: serverTimestamp(),
            },
            { merge: true }
          ).catch(() => {});
        });
      }
    } catch {
      // Non-blocking fallback
    }
  } catch (err) {
    console.debug('Session analytics error:', err);
  }
};

/**
 * Track custom user actions (audio play, card swipe, level changed, word bookmarked)
 */
export const trackEvent = async (
  eventName: string,
  params: Record<string, string | number | boolean> = {}
) => {
  try {
    const visitorId = getVisitorId();

    // 1. Update local stats immediately
    const local = getLocalStats();
    if (eventName === 'audio_played') {
      local.totalAudioPlays += 1;
    } else if (eventName === 'card_swipe' || eventName === 'reel_scroll') {
      local.totalCardsStudied += 1;
    }
    local.lastActive = new Date().toISOString();
    saveLocalStats(local);

    // 2. Firebase Google Analytics (GA4 - G-CZDXW6KL92)
    initAnalytics()
      .then((analytics) => {
        if (analytics) {
          logEvent(analytics, eventName, {
            visitor_id: visitorId,
            ...params,
          });
        }
      })
      .catch(() => {});

    // 3. Firestore Event Log (Safe check)
    try {
      const db = getDb();
      if (db) {
        const eventsCol = collection(db, 'analytics_events');
        addDoc(eventsCol, {
          visitorId,
          eventName,
          params,
          timestamp: serverTimestamp(),
        }).catch(() => {});

        const globalMetricRef = doc(db, 'app_metrics', 'global');
        if (eventName === 'audio_played') {
          updateDoc(globalMetricRef, { totalAudioPlays: increment(1) }).catch(() => {});
        } else if (eventName === 'card_swipe' || eventName === 'reel_scroll') {
          updateDoc(globalMetricRef, { totalCardsStudied: increment(1) }).catch(() => {});
        }
      }
    } catch {
      // Non-blocking fallback
    }
  } catch (err) {
    console.debug('Event tracking error:', err);
  }
};
