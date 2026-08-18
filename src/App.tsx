/**
 * French Kiu — Vocabulary Flashcard PWA
 * Mobile-first French vocabulary learning with audio pronunciation and Punjabi translations
 * Styled in Khalsa Colors (Kesari #FF9933, Yellow #FFD700, Khalsa Navy #002270)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, ArrowRight, Sparkles, Bookmark } from 'lucide-react';
import { CEFRLevel, VocabularyWord, AppMode, WordCategory } from './types';
import { getFilteredWords, getAvailableCategoriesForLevel, getNextLevel, LEVEL_METADATA, VOCABULARY_DATA } from './data/vocabulary';
import { LevelChips } from './components/LevelChips';
import { CategoryChips } from './components/CategoryChips';
import { Flashcard } from './components/Flashcard';
import { ReelFeed } from './components/ReelFeed';
import { Header } from './components/Header';
import { AnalyticsModal } from './components/AnalyticsModal';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { speakFrench, stopSpeaking } from './utils/speech';
import { triggerHaptic } from './utils/haptics';
import { recordUserSession, trackEvent } from './utils/analytics';

export default function App() {
  const networkStatus = useNetworkStatus();
  const [mode, setMode] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem('french_kiu_mode');
      if (saved === 'flashcards' || saved === 'reels') return saved;
    } catch {
      // fallback
    }
    return 'reels'; // Default to Reels mode for new users
  });
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
  const [selectedCategory, setSelectedCategory] = useState<WordCategory>('all');
  
  // Single Source of Truth for active word position across both Reel and Deck layouts
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('french_kiu_audio_enabled');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // fallback
    }
    return true;
  });

  const handleToggleAutoPlay = useCallback((enabled?: boolean) => {
    setAutoPlayAudio((prev) => {
      const next = enabled !== undefined ? enabled : !prev;
      try {
        localStorage.setItem('french_kiu_audio_enabled', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Top-level tab visibility safeguard: stop all speech when user minimizes tab or locks phone
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopSpeaking();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleVisibility);
    window.addEventListener('blur', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleVisibility);
      window.removeEventListener('blur', handleVisibility);
    };
  }, []);

  // Saved / Bookmarked Words State (persisted in localStorage)
  const [savedWordsMap, setSavedWordsMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('french_kiu_saved_words');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return {};
  });
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Analytics & Record User Session
  useEffect(() => {
    recordUserSession(selectedLevel);
  }, []);

  // Auto-hide controls helper with generous interactive duration (10 seconds)
  const resetControlsTimeout = useCallback((durationMs: number = 10000) => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, durationMs);
  }, []);

  // Initial auto-hide with ample time on load (12 seconds)
  useEffect(() => {
    resetControlsTimeout(12000);
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Toggle Controls manually
  const handleToggleControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls((prev) => {
      const next = !prev;
      if (next) {
        // Give 12 seconds of open interaction time
        resetControlsTimeout(12000);
      }
      return next;
    });
  };

  // Toggle Save / Bookmark for any word
  const handleToggleSaveWord = useCallback((id: string) => {
    setSavedWordsMap((prev) => {
      const isSaving = !prev[id];
      const next = { ...prev, [id]: isSaving };
      if (!next[id]) {
        delete next[id];
      }
      try {
        localStorage.setItem('french_kiu_saved_words', JSON.stringify(next));
      } catch {
        // ignore
      }
      trackEvent('word_saved', { wordId: id, action: isSaving ? 'save' : 'unsave' });
      return next;
    });
  }, []);

  const savedCount = Object.keys(savedWordsMap).length;

  // Available categories for the currently selected level (hides empty categories)
  const availableCategories = getAvailableCategoriesForLevel(selectedLevel);

  // Get filtered deck of words based on level & category or saved filter
  const words: VocabularyWord[] = showSavedOnly
    ? VOCABULARY_DATA.filter((w) => Boolean(savedWordsMap[w.id]))
    : getFilteredWords(selectedLevel, selectedCategory);
  
  // Safe bounds checking
  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, words.length - 1));
  const currentCard: VocabularyWord | undefined = words[safeIndex];
  const nextCard: VocabularyWord | undefined = words[safeIndex + 1];

  // Toggle showSavedOnly filter
  const handleToggleShowSaved = () => {
    stopSpeaking();
    setShowSavedOnly((prev) => {
      const next = !prev;
      trackEvent('toggle_saved_filter', { showSaved: next });
      return next;
    });
    setCurrentIndex(0);
  };

  const handleClearSavedFilter = () => {
    stopSpeaking();
    setShowSavedOnly(false);
    setCurrentIndex(0);
  };

  // Level selector handler - resets deck and safely updates category
  const handleSelectLevel = (level: CEFRLevel) => {
    stopSpeaking();
    resetControlsTimeout(8000);
    setShowSavedOnly(false);
    setSelectedLevel(level);
    trackEvent('level_selected', { level });
    const newAvailable = getAvailableCategoriesForLevel(level);
    if (selectedCategory !== 'all' && !newAvailable.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
    setCurrentIndex(0);
  };

  // Category selector handler
  const handleSelectCategory = (cat: WordCategory) => {
    stopSpeaking();
    resetControlsTimeout(8000);
    setShowSavedOnly(false);
    setSelectedCategory(cat);
    trackEvent('category_selected', { category: cat, level: selectedLevel });
    setCurrentIndex(0);
  };

  // Endless Level Progression: Advance to next CEFR level (loops C2 -> A1)
  const handleNextLevel = useCallback(() => {
    triggerHaptic('success');
    stopSpeaking();
    setShowSavedOnly(false);
    const nextLvl = getNextLevel(selectedLevel);
    setSelectedLevel(nextLvl);
    setSelectedCategory('all');
    setCurrentIndex(0);
    trackEvent('level_advanced', { fromLevel: selectedLevel, toLevel: nextLvl });
  }, [selectedLevel]);

  // Mode Switcher (Deck <-> Reels) preserving the exact same word position
  const handleModeChange = (newMode: AppMode) => {
    stopSpeaking();
    setMode(newMode);
    trackEvent('mode_changed', { mode: newMode });
    try {
      localStorage.setItem('french_kiu_mode', newMode);
    } catch {
      // ignore
    }
  };

  // Flashcard Swipe Navigation with Endless Continuous Looping
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      stopSpeaking();
      trackEvent('card_swipe', {
        direction,
        level: selectedLevel,
        word: currentCard?.word || '',
      });
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= words.length) {
          if (!showSavedOnly) {
            handleNextLevel();
          }
          return 0;
        }
        return next;
      });
    },
    [words.length, handleNextLevel, showSavedOnly, selectedLevel, currentCard]
  );

  // Restart current level
  const handleRestartLevel = () => {
    triggerHaptic('selection');
    stopSpeaking();
    setCurrentIndex(0);
  };

  // Keyboard navigation for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'flashcards') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentIndex < words.length) {
            handleSwipe(e.key === 'ArrowRight' ? 'right' : 'left');
          }
        } else if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentCard) {
            speakFrench(currentCard.word);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentIndex, words.length, currentCard, handleSwipe]);

  return (
    <div className="h-[100dvh] w-screen bg-[#001438] text-white flex flex-col justify-between overflow-hidden selection:bg-[#FF9933] selection:text-white relative">
      {/* Network Connectivity & PWA Background Update Toast Banner */}
      <NetworkStatusBanner networkStatus={networkStatus} />

      {/* Top Header & Sticky Navigation (Compact, Zero-Wasted Space) */}
      <div 
        className="w-full shrink-0 z-30 flex flex-col"
        onMouseEnter={() => {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        }}
        onMouseLeave={() => {
          if (showControls) resetControlsTimeout(8000);
        }}
        onTouchStart={() => {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        }}
        onTouchEnd={() => {
          if (showControls) resetControlsTimeout(8000);
        }}
        onPointerDown={() => {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        }}
      >
        <Header
          mode={mode}
          onModeChange={handleModeChange}
          savedCount={savedCount}
          showSavedOnly={showSavedOnly}
          onToggleShowSaved={handleToggleShowSaved}
          showControls={showControls}
          onToggleControls={handleToggleControls}
          onOpenAnalytics={() => {
            stopSpeaking();
            setShowAnalyticsModal(true);
          }}
        />
        <AnimatePresence initial={false}>
          {!showSavedOnly && showControls && (
            <motion.div
              key="controls-collapsible-bar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden flex flex-col"
            >
              <LevelChips
                selectedLevel={selectedLevel}
                onSelectLevel={handleSelectLevel}
              />
              <CategoryChips
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
                availableCategories={availableCategories}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {showSavedOnly && (
          <div className="w-full max-w-md mx-auto px-3 py-1.5 flex items-center justify-between bg-[#001438] border-b border-[#0033A0]">
            <span className="text-xs font-black text-[#FFD700] flex items-center gap-1.5 font-gurmukhi">
              <Bookmark className="w-3.5 h-3.5 fill-[#FFD700]" />
              ਤੁਹਾਡੇ ਸੇਵ ਕੀਤੇ ਸ਼ਬਦ ({savedCount})
            </span>
            <button
              type="button"
              onClick={handleClearSavedFilter}
              className="text-[11px] font-bold text-[#FF9933] hover:underline"
            >
              ਸਾਰੇ ਸ਼ਬਦ ਦੇਖੋ ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Content Stage: Flashcard Deck OR Reels Feed (Fluidly Auto-Resizing) */}
      <main className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col justify-center items-center">
        {mode === 'reels' ? (
          /* ================= LAYOUT 2: INSTAGRAM REEL FEED ================= */
          <ReelFeed
            key={`reels-${showSavedOnly ? 'saved' : `${selectedLevel}-${selectedCategory}`}`}
            words={words}
            currentIndex={safeIndex}
            onIndexChange={(idx) => setCurrentIndex(idx)}
            selectedLevel={selectedLevel}
            onSelectLevel={handleSelectLevel}
            onNextLevel={handleNextLevel}
            autoPlayAudio={autoPlayAudio}
            onToggleAutoPlay={handleToggleAutoPlay}
            savedWordsMap={savedWordsMap}
            onToggleSaveWord={handleToggleSaveWord}
            showSavedOnly={showSavedOnly}
            onClearSavedFilter={handleClearSavedFilter}
          />
        ) : (
          /* ================= LAYOUT 1: KINDLE FLASHCARD DECK ================= */
          <div className="w-full h-full flex flex-col items-center justify-center p-2.5 sm:p-4 max-w-md mx-auto my-auto">
            {words.length === 0 ? (
              /* Empty state in Deck mode */
              <div className="w-full max-w-[365px] sm:max-w-[390px] min-h-[380px] rounded-3xl bg-white text-[#002270] border-2 border-[#FFD700] shadow-lg p-6 flex flex-col items-center justify-center text-center mx-auto">
                <div className="w-14 h-14 rounded-full bg-[#FF9933]/15 border-2 border-[#FFD700] flex items-center justify-center mb-3">
                  <Bookmark className="w-7 h-7 text-[#FF9933] stroke-[2.5]" />
                </div>
                <h3 className="text-xl font-black text-[#002270] font-brand mb-1">
                  ਕੋਈ ਸੇਵ ਕੀਤਾ ਸ਼ਬਦ ਨਹੀਂ
                </h3>
                <p className="text-xs text-slate-500 font-gurmukhi leading-relaxed mb-4">
                  ਕਿਸੇ ਵੀ ਕਾਰਡ ਦੇ 🔖 ਸੇਵ ਬਟਨ &apos;ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਸ਼ਬਦਾਂ ਨੂੰ ਇੱਥੇ ਸੇਵ ਕਰੋ।
                </p>
                <button
                  type="button"
                  onClick={handleClearSavedFilter}
                  className="px-4 py-2 rounded-xl bg-[#FF9933] text-[#00174D] font-black text-xs hover:bg-[#FFD700] transition-colors border border-[#FFD700] active:scale-95 shadow"
                >
                  ਸਾਰੇ ਸ਼ਬਦ ਦੇਖੋ (Browse All)
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {safeIndex < words.length && currentCard ? (
                  <Flashcard
                    key={`${showSavedOnly ? 'saved' : `${selectedLevel}-${selectedCategory}`}-${currentCard.id}`}
                    card={currentCard}
                    nextCard={nextCard}
                    onSwipe={handleSwipe}
                    autoPlayAudio={autoPlayAudio}
                    isSaved={Boolean(savedWordsMap[currentCard.id])}
                    onToggleSave={() => handleToggleSaveWord(currentCard.id)}
                  />
                ) : (
                  /* Level Completion Screen */
                  <motion.div
                    key="deck-completed"
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    className="w-full max-w-[365px] sm:max-w-[390px] min-h-[380px] rounded-3xl bg-white text-[#002270] border-2 border-[#FFD700] shadow-lg p-6 flex flex-col items-center justify-between text-center mx-auto"
                  >
                    <div className="w-full flex items-center justify-center pt-2">
                      <div className="w-13 h-13 rounded-full bg-[#FF9933]/15 border-2 border-[#FFD700] flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-[#FF9933] stroke-[2.5]" />
                      </div>
                    </div>

                    <div className="my-auto py-3">
                      <span className="text-xs font-black text-[#FF9933] uppercase tracking-widest block mb-1">
                        {selectedLevel} · {LEVEL_METADATA[selectedLevel].punjabiTitle}
                      </span>
                      <h2 className="text-2xl font-black text-[#002270] font-brand mb-1 leading-tight">
                        ਸ਼ਾਬਾਸ਼! Bravo !
                      </h2>
                      <p className="text-sm font-bold text-[#FF9933] font-gurmukhi mb-2">
                        ਤੁਸੀਂ ਇਸ ਪੱਧਰ ਦੇ ਸਾਰੇ ਸ਼ਬਦ ਪੂਰੇ ਕਰ ਲਏ ਹਨ।
                      </p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        You completed all {words.length} words in this section.
                      </p>
                    </div>

                    <div className="w-full space-y-2 pt-2">
                      <button
                        type="button"
                        id="btn-restart-level"
                        onClick={handleRestartLevel}
                        className="w-full py-3 px-4 rounded-2xl bg-[#002270] text-white font-extrabold text-xs sm:text-sm hover:bg-[#00174D] active:scale-98 transition-all flex items-center justify-center gap-2 border border-[#0033A0]"
                      >
                        <RotateCcw className="w-4 h-4 text-[#FFD700]" />
                        <span>ਦੁਬਾਰਾ ਦੁਹਰਾਓ (Review Again)</span>
                      </button>

                      <button
                        type="button"
                        id="btn-next-level"
                        onClick={handleNextLevel}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[#FF9933] text-[#00174D] font-black text-xs sm:text-sm hover:bg-[#FFD700] active:scale-98 transition-colors flex items-center justify-center gap-2 border border-[#FFD700]"
                      >
                        <span>ਅਗਲਾ ਪੱਧਰ (Next Level)</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        )}
      </main>

      {/* Bottom Swipe hint in Deck Mode */}
      {mode === 'flashcards' && words.length > 0 && (
        <footer className="w-full py-1.5 text-center text-[10px] sm:text-[11px] font-medium text-[#88B0FF]/70 flex items-center justify-center gap-2 shrink-0">
          <span>← ਅਗਲਾ ਸ਼ਬਦ ਦੇਖਣ ਲਈ ਸਵਾਈਪ ਕਰੋ (Swipe card) →</span>
        </footer>
      )}

      {/* Live Free Tier Analytics & Stats Modal */}
      <AnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
      />
    </div>
  );
}


