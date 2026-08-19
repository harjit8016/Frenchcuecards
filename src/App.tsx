/**
 * French Vira — Vocabulary Flashcard PWA
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
        resetControlsTimeout(12000);
      }
      return next;
    });
  };

  // Toggle Save / Bookmark for any word
  const handleToggleSaveWord = useCallback((id: string) => {
    setSavedWordsMap((prev) => {
      const isCurrentlySaved = Boolean(prev[id]);
      const next = { ...prev };
      if (isCurrentlySaved) {
        delete next[id];
      } else {
        next[id] = true;
      }
      try {
        localStorage.setItem('french_kiu_saved_words', JSON.stringify(next));
      } catch {
        // ignore
      }
      trackEvent(isCurrentlySaved ? 'word_unbookmarked' : 'word_bookmarked', { word_id: id });
      return next;
    });
  }, []);

  // Get words based on level, category, and saved-filter
  const getDisplayWords = useCallback(() => {
    if (showSavedOnly) {
      return VOCABULARY_DATA.filter((w) => Boolean(savedWordsMap[w.id]));
    }
    return getFilteredWords(selectedLevel, selectedCategory);
  }, [selectedLevel, selectedCategory, showSavedOnly, savedWordsMap]);

  const words = getDisplayWords();
  const availableCategories = getAvailableCategoriesForLevel(selectedLevel);
  const savedCount = Object.keys(savedWordsMap).length;

  // Keep currentIndex bounded to valid range
  const safeIndex = words.length === 0 ? 0 : Math.min(currentIndex, Math.max(0, words.length - 1));
  const currentCard = words[safeIndex] as VocabularyWord | undefined;
  const nextCard = safeIndex + 1 < words.length ? words[safeIndex + 1] : undefined;

  // Change Level
  const handleSelectLevel = (level: CEFRLevel) => {
    if (level === selectedLevel && !showSavedOnly) return;
    stopSpeaking();
    setSelectedLevel(level);
    setSelectedCategory('all');
    setShowSavedOnly(false);
    setCurrentIndex(0);
    resetControlsTimeout(10000);
    trackEvent('level_changed', { level });
  };

  // Change Category
  const handleSelectCategory = (category: WordCategory) => {
    if (category === selectedCategory && !showSavedOnly) return;
    stopSpeaking();
    setSelectedCategory(category);
    setShowSavedOnly(false);
    setCurrentIndex(0);
    resetControlsTimeout(10000);
    trackEvent('category_changed', { category });
  };

  // Switch between Reels mode and Flashcard Deck mode
  const handleModeChange = (newMode: AppMode) => {
    if (newMode === mode) return;
    stopSpeaking();
    setMode(newMode);
    try {
      localStorage.setItem('french_kiu_mode', newMode);
    } catch {
      // ignore
    }
    resetControlsTimeout(10000);
    trackEvent('mode_switched', { mode: newMode });
  };

  // Toggle show only saved words
  const handleToggleShowSaved = () => {
    stopSpeaking();
    setShowSavedOnly((prev) => !prev);
    setCurrentIndex(0);
    resetControlsTimeout(10000);
  };

  const handleClearSavedFilter = () => {
    stopSpeaking();
    setShowSavedOnly(false);
    setCurrentIndex(0);
    resetControlsTimeout(10000);
  };

  // Flashcard Deck Swipe Handler
  const handleSwipe = (direction: 'left' | 'right') => {
    stopSpeaking();
    if (safeIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      trackEvent('card_swipe', {
        direction,
        word_id: currentCard?.id || '',
        level: selectedLevel,
      });
    } else {
      // Completed level
      setCurrentIndex(words.length);
      trackEvent('level_completed', { level: selectedLevel });
    }
  };

  // Advance to Next Level (after finishing all words in current level)
  const handleNextLevel = () => {
    stopSpeaking();
    triggerHaptic('success');
    const nextLvl = getNextLevel(selectedLevel);
    setSelectedLevel(nextLvl);
    setSelectedCategory('all');
    setShowSavedOnly(false);
    setCurrentIndex(0);
    resetControlsTimeout(12000);
    trackEvent('level_promoted', { next_level: nextLvl });
  };

  // Restart Current Level
  const handleRestartLevel = () => {
    stopSpeaking();
    triggerHaptic('medium');
    setCurrentIndex(0);
    resetControlsTimeout(10000);
    trackEvent('level_restarted', { level: selectedLevel });
  };

  return (
    <div className="relative w-full h-[100dvh] max-h-screen bg-[#002270] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Network Status Banner */}
      <NetworkStatusBanner networkStatus={networkStatus} />

      {/* Auto-Hideable Top Bar & Controls Container (Responsive Sizing) */}
      <div
        className="w-full shrink-0 z-40 bg-[#002270] shadow-md border-b border-[#0033A0]/60 transition-all duration-300"
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
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between bg-[#001438] border-b border-[#0033A0]">
            <span className="text-xs sm:text-sm font-black text-[#FFD700] flex items-center gap-1.5 font-gurmukhi">
              <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#FFD700]" />
              ਤੁਹਾਡੇ ਸੇਵ ਕੀਤੇ ਸ਼ਬਦ ({savedCount})
            </span>
            <button
              type="button"
              onClick={handleClearSavedFilter}
              className="text-[11px] sm:text-xs font-bold text-[#FF9933] hover:underline"
            >
              ਸਾਰੇ ਸ਼ਬਦ ਦੇਖੋ ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Content Stage: Flashcard Deck OR Reels Feed (Fluidly Resizing to any screen size) */}
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
          <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 max-w-md sm:max-w-lg md:max-w-xl mx-auto my-auto">
            {words.length === 0 ? (
              /* Empty state in Deck mode */
              <div className="w-full max-w-[360px] sm:max-w-[420px] md:max-w-[460px] min-h-[340px] max-h-[540px] rounded-3xl bg-white text-[#002270] border-2 border-[#FFD700] shadow-lg p-6 flex flex-col items-center justify-center text-center mx-auto">
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
                  className="px-4 py-2 rounded-xl bg-[#FF9933] text-[#00174D] font-black text-xs sm:text-sm hover:bg-[#FFD700] transition-colors border border-[#FFD700] active:scale-95 shadow"
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
                    className="w-full max-w-[360px] sm:max-w-[420px] md:max-w-[460px] min-h-[340px] max-h-[560px] rounded-3xl bg-white text-[#002270] border-2 border-[#FFD700] shadow-lg p-6 flex flex-col items-center justify-between text-center mx-auto overflow-y-auto"
                  >
                    <div className="w-full flex items-center justify-center pt-2">
                      <div className="w-13 h-13 rounded-full bg-[#FF9933]/15 border-2 border-[#FFD700] flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-[#FF9933] stroke-[2.5]" />
                      </div>
                    </div>

                    <div className="my-auto py-3">
                      <span className="text-xs sm:text-sm font-black text-[#FF9933] uppercase tracking-widest block mb-1">
                        {selectedLevel} · {LEVEL_METADATA[selectedLevel].punjabiTitle}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-[#002270] font-brand mb-1 leading-tight">
                        ਸ਼ਾਬਾਸ਼! Bravo !
                      </h2>
                      <p className="text-sm sm:text-base font-bold text-[#FF9933] font-gurmukhi mb-2">
                        ਤੁਸੀਂ ਇਸ ਪੱਧਰ ਦੇ ਸਾਰੇ ਸ਼ਬਦ ਪੂਰੇ ਕਰ ਲਏ ਹਨ।
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
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
        <footer className="w-full py-1 text-center text-[10px] sm:text-[11px] font-medium text-[#88B0FF]/70 flex items-center justify-center gap-2 shrink-0">
          <span>← ਅਗਲਾ ਸ਼ਬਦ ਦੇਖਣ ਲਈ ਸਵਾਈਪ ਕਰੋ (Swipe card) →</span>
        </footer>
      )}
    </div>
  );
}
