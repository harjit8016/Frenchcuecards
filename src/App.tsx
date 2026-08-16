/**
 * French Kiu — Vocabulary Flashcard PWA
 * Mobile-first French vocabulary learning with audio pronunciation and Punjabi translations
 * Styled in Khalsa Colors (Kesari #FF9933, Yellow #FFD700, Khalsa Navy #002270)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import { CEFRLevel, VocabularyWord, AppMode, WordCategory } from './types';
import { getFilteredWords, LEVEL_METADATA } from './data/vocabulary';
import { LevelChips } from './components/LevelChips';
import { CategoryChips } from './components/CategoryChips';
import { Flashcard } from './components/Flashcard';
import { ReelFeed } from './components/ReelFeed';
import { Header } from './components/Header';
import { speakFrench, stopSpeaking } from './utils/speech';
import { triggerHaptic } from './utils/haptics';

export default function App() {
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
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);

  // Get filtered deck of words based on level & category
  const words: VocabularyWord[] = getFilteredWords(selectedLevel, selectedCategory);
  
  // Safe bounds checking
  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, words.length - 1));
  const currentCard: VocabularyWord | undefined = words[safeIndex];
  const nextCard: VocabularyWord | undefined = words[safeIndex + 1];

  // Level selector handler - resets deck
  const handleSelectLevel = (level: CEFRLevel) => {
    stopSpeaking();
    setSelectedLevel(level);
    setCurrentIndex(0);
  };

  // Category selector handler
  const handleSelectCategory = (cat: WordCategory) => {
    stopSpeaking();
    setSelectedCategory(cat);
    setCurrentIndex(0);
  };

  // Mode Switcher (Deck <-> Reels) preserving the exact same word position
  const handleModeChange = (newMode: AppMode) => {
    stopSpeaking();
    setMode(newMode);
    try {
      localStorage.setItem('french_kiu_mode', newMode);
    } catch {
      // ignore
    }
  };

  // Flashcard Swipe Navigation
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      stopSpeaking();
      setCurrentIndex((prev) => {
        const next = prev + 1;
        return next;
      });
    },
    []
  );

  // Restart current level
  const handleRestartLevel = () => {
    triggerHaptic('selection');
    stopSpeaking();
    setCurrentIndex(0);
  };

  // Move to next CEFR level
  const handleNextLevel = () => {
    triggerHaptic('success');
    const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const nextIdx = (levels.indexOf(selectedLevel) + 1) % levels.length;
    handleSelectLevel(levels[nextIdx]);
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
    <div className="h-[100dvh] w-screen bg-[#001438] text-white flex flex-col justify-between overflow-hidden selection:bg-[#FF9933] selection:text-white">
      {/* Top Header & Sticky Navigation (Compact, Zero-Wasted Space) */}
      <div className="w-full shrink-0 z-30 flex flex-col">
        <Header
          mode={mode}
          onModeChange={handleModeChange}
        />
        <LevelChips
          selectedLevel={selectedLevel}
          onSelectLevel={handleSelectLevel}
        />
        <CategoryChips
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />
      </div>

      {/* Main Content Stage: Flashcard Deck OR Reels Feed (Fluidly Auto-Resizing) */}
      <main className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col justify-center items-center">
        {mode === 'reels' ? (
          /* ================= LAYOUT 2: INSTAGRAM REEL FEED ================= */
          <ReelFeed
            key={`reels-${selectedLevel}-${selectedCategory}`}
            words={words}
            currentIndex={safeIndex}
            onIndexChange={(idx) => setCurrentIndex(idx)}
            selectedLevel={selectedLevel}
            onSelectLevel={handleSelectLevel}
            autoPlayAudio={autoPlayAudio}
            onToggleAutoPlay={(enabled) => {
              if (enabled !== undefined) {
                setAutoPlayAudio(enabled);
              } else {
                setAutoPlayAudio((prev) => !prev);
              }
            }}
          />
        ) : (
          /* ================= LAYOUT 1: KINDLE FLASHCARD DECK ================= */
          <div className="w-full h-full flex flex-col items-center justify-center p-2.5 sm:p-4 max-w-md mx-auto my-auto">
            <AnimatePresence mode="wait">
              {safeIndex < words.length && currentCard ? (
                <Flashcard
                  key={`${selectedLevel}-${selectedCategory}-${currentCard.id}`}
                  card={currentCard}
                  nextCard={nextCard}
                  onSwipe={handleSwipe}
                  autoPlayAudio={autoPlayAudio}
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
          </div>
        )}
      </main>

      {/* Bottom Swipe hint in Deck Mode */}
      {mode === 'flashcards' && (
        <footer className="w-full py-1.5 text-center text-[10px] sm:text-[11px] font-medium text-[#88B0FF]/70 flex items-center justify-center gap-2 shrink-0">
          <span>← ਅਗਲਾ ਸ਼ਬਦ ਦੇਖਣ ਲਈ ਸਵਾਈਪ ਕਰੋ (Swipe card) →</span>
        </footer>
      )}
    </div>
  );
}

