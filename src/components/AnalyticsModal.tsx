import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart3, Users, Play, BookOpen, Clock, Activity, RefreshCw } from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getDb } from '../lib/firebase';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppMetrics {
  totalSessions: number;
  totalUniqueUsers: number;
  totalCardsStudied: number;
  totalAudioPlays: number;
  lastActivity?: any;
}

interface VisitorRecord {
  id: string;
  currentLevel?: string;
  visitCount?: number;
  lastSeen?: any;
  screen?: string;
}

interface EventRecord {
  id: string;
  eventName: string;
  params?: any;
  timestamp?: any;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AppMetrics | null>(null);
  const [recentVisitors, setRecentVisitors] = useState<VisitorRecord[]>([]);
  const [recentEvents, setRecentEvents] = useState<EventRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'visitors'>('overview');

  const fetchStats = async () => {
    setLoading(true);
    const db = getDb();

    if (!db) {
      // Local fallback when Firestore is not provisioned or offline
      try {
        const raw = localStorage.getItem('french_kiu_local_stats');
        if (raw) {
          const parsed = JSON.parse(raw);
          setMetrics({
            totalSessions: parsed.totalSessions || 1,
            totalUniqueUsers: 1,
            totalCardsStudied: parsed.totalCardsStudied || 0,
            totalAudioPlays: parsed.totalAudioPlays || 0,
          });
        } else {
          setMetrics({
            totalSessions: 1,
            totalUniqueUsers: 1,
            totalCardsStudied: 0,
            totalAudioPlays: 0,
          });
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Global App Metrics
      const metricDoc = await getDoc(doc(db, 'app_metrics', 'global'));
      if (metricDoc.exists()) {
        setMetrics(metricDoc.data() as AppMetrics);
      } else {
        setMetrics({
          totalSessions: 1,
          totalUniqueUsers: 1,
          totalCardsStudied: 0,
          totalAudioPlays: 0,
        });
      }

      // 2. Fetch Recent Visitors
      try {
        const visitorsQ = query(
          collection(db, 'visitors'),
          orderBy('lastSeen', 'desc'),
          limit(10)
        );
        const visitorsSnap = await getDocs(visitorsQ);
        const vList: VisitorRecord[] = [];
        visitorsSnap.forEach((d) => {
          vList.push({ id: d.id, ...d.data() } as VisitorRecord);
        });
        setRecentVisitors(vList);
      } catch (err) {
        console.debug('Visitor fetch:', err);
      }

      // 3. Fetch Recent Events
      try {
        const eventsQ = query(
          collection(db, 'analytics_events'),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const eventsSnap = await getDocs(eventsQ);
        const eList: EventRecord[] = [];
        eventsSnap.forEach((d) => {
          eList.push({ id: d.id, ...d.data() } as EventRecord);
        });
        setRecentEvents(eList);
      } catch (err) {
        console.debug('Events fetch:', err);
      }
    } catch (error) {
      console.debug('Analytics fetch fallback:', error);
      try {
        const raw = localStorage.getItem('french_kiu_local_stats');
        if (raw) {
          const parsed = JSON.parse(raw);
          setMetrics({
            totalSessions: parsed.totalSessions || 1,
            totalUniqueUsers: 1,
            totalCardsStudied: parsed.totalCardsStudied || 0,
            totalAudioPlays: parsed.totalAudioPlays || 0,
          });
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const formatTime = (ts: any) => {
    if (!ts) return 'ਹੁਣੇ (Just now)';
    try {
      if (ts.toDate) {
        return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (ts.seconds) {
        return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'ਹੁਣੇ';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#000E2E]/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-[#00174D] border-2 border-[#0033A0] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#002270] border-b border-[#0033A0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF9933]/20 border border-[#FF9933]/40 flex items-center justify-center text-[#FF9933]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    ਲਾਈਵ ਐਨਾਲਿਟਿਕਸ
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Live Free Tier
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#88B0FF] font-medium">Real-time usage from Firestore</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchStats}
                  disabled={loading}
                  className="p-2 rounded-xl text-[#88B0FF] hover:text-white hover:bg-[#0033A0]/60 active:scale-95 transition-all"
                  title="ਰਿਫ੍ਰੈਸ਼ (Refresh)"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-[#88B0FF] hover:text-white hover:bg-[#0033A0]/60 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 pt-3 flex gap-2 border-b border-[#002B7A] bg-[#00174D]">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                  activeTab === 'overview'
                    ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                    : 'text-[#88B0FF] hover:text-white'
                }`}
              >
                ਓਵਰਵਿਊ (Overview)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('visitors')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                  activeTab === 'visitors'
                    ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                    : 'text-[#88B0FF] hover:text-white'
                }`}
              >
                ਸਿੱਖਣ ਵਾਲੇ ({recentVisitors.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                  activeTab === 'events'
                    ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                    : 'text-[#88B0FF] hover:text-white'
                }`}
              >
                ਲਾਈਵ ਐਕਟੀਵਿਟੀ ({recentEvents.length})
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  {/* 4 Big Stat Cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#002270]/90 border border-[#0033A0] rounded-2xl p-3">
                      <div className="flex items-center justify-between text-[#88B0FF] mb-1">
                        <span className="text-[11px] font-bold">ਕੁੱਲ ਸੈਸ਼ਨ</span>
                        <Activity className="w-3.5 h-3.5 text-[#FF9933]" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono">
                        {loading ? '...' : (metrics?.totalSessions ?? 1)}
                      </div>
                      <div className="text-[10px] text-[#88B0FF]/80">Total Visits</div>
                    </div>

                    <div className="bg-[#002270]/90 border border-[#0033A0] rounded-2xl p-3">
                      <div className="flex items-center justify-between text-[#88B0FF] mb-1">
                        <span className="text-[11px] font-bold">ਵਿਲੱਖਣ ਯੂਜ਼ਰ</span>
                        <Users className="w-3.5 h-3.5 text-[#FFD700]" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono">
                        {loading ? '...' : (metrics?.totalUniqueUsers ?? 1)}
                      </div>
                      <div className="text-[10px] text-[#88B0FF]/80">Unique Learners</div>
                    </div>

                    <div className="bg-[#002270]/90 border border-[#0033A0] rounded-2xl p-3">
                      <div className="flex items-center justify-between text-[#88B0FF] mb-1">
                        <span className="text-[11px] font-bold">ਸ਼ਬਦ ਪੜ੍ਹੇ</span>
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono">
                        {loading ? '...' : (metrics?.totalCardsStudied ?? 0)}
                      </div>
                      <div className="text-[10px] text-[#88B0FF]/80">Words Studied</div>
                    </div>

                    <div className="bg-[#002270]/90 border border-[#0033A0] rounded-2xl p-3">
                      <div className="flex items-center justify-between text-[#88B0FF] mb-1">
                        <span className="text-[11px] font-bold">ਆਡੀਓ ਸੁਣੀ</span>
                        <Play className="w-3.5 h-3.5 text-sky-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono">
                        {loading ? '...' : (metrics?.totalAudioPlays ?? 0)}
                      </div>
                      <div className="text-[10px] text-[#88B0FF]/80">Pronunciations Played</div>
                    </div>
                  </div>

                  {/* Firestore Direct Database Note */}
                  <div className="bg-[#002270]/60 border border-[#0033A0]/80 rounded-2xl p-3 space-y-1.5">
                    <div className="text-xs font-bold text-[#FFD700] flex items-center gap-1.5">
                      <span>💡 100% ਮੁਫ਼ਤ Firestore ਸਟੋਰੇਜ (Free Tier)</span>
                    </div>
                    <p className="text-[11px] text-[#C4D9FF] leading-relaxed">
                      ਤੁਹਾਡੇ ਸਾਰੇ ਯੂਜ਼ਰ ਸਟੈਟਸ ਫਾਇਰਬੇਸ ਦੇ <b className="text-white">Firestore Database</b> ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਸਟੋਰ ਹੋ ਰਹੇ ਹਨ (ਬਿਨਾਂ ਕਿਸੇ ਪੇਡ ਗੂਗਲ ਐਨਾਲਿਟਿਕਸ ਦੇ)।
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'visitors' && (
                <div className="space-y-2">
                  {recentVisitors.length === 0 ? (
                    <div className="text-center py-8 text-[#88B0FF] text-xs">
                      ਕੋਈ ਵਿਜ਼ਿਟਰ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ
                    </div>
                  ) : (
                    recentVisitors.map((v, i) => (
                      <div
                        key={v.id || i}
                        className="bg-[#002270]/80 border border-[#0033A0] rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#00174D] border border-[#0033A0] flex items-center justify-center text-xs font-bold text-[#FFD700]">
                            #{i + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>ਯੂਜ਼ਰ {v.id.substring(0, 8)}...</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/40 font-mono">
                                {v.currentLevel || 'A1'}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#88B0FF]">
                              ਸੈਸ਼ਨ ਗਿਣਤੀ: {v.visitCount || 1} • ਸਕ੍ਰੀਨ: {v.screen || 'ਮੋਬਾਈਲ'}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-[#88B0FF] flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-70" />
                          {formatTime(v.lastSeen)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="space-y-2">
                  {recentEvents.length === 0 ? (
                    <div className="text-center py-8 text-[#88B0FF] text-xs">
                      ਕੋਈ ਐਕਟੀਵਿਟੀ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲੀ
                    </div>
                  ) : (
                    recentEvents.map((e, i) => (
                      <div
                        key={e.id || i}
                        className="bg-[#002270]/80 border border-[#0033A0] rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                          <div>
                            <div className="font-bold text-white capitalize">
                              {e.eventName.replace(/_/g, ' ')}
                            </div>
                            {e.params && (
                              <div className="text-[10px] text-[#88B0FF] font-mono">
                                {Object.entries(e.params)
                                  .map(([k, val]) => `${k}: ${val}`)
                                  .join(' | ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#88B0FF]">{formatTime(e.timestamp)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#002270] border-t border-[#0033A0] text-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-[#0033A0] hover:bg-[#0044CC] text-white text-xs font-black transition-all active:scale-95"
              >
                ਬੰਦ ਕਰੋ (Close)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
