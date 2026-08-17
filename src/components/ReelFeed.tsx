import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Repeat,
  Bookmark,
  Share2,
  Check,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { VocabularyWord, CEFRLevel } from '../types';
import {
  playTeacherLesson,
  speakFrench,
  speakPunjabi,
  stopSpeaking,
  cleanPunjabiSpeechText,
  TeacherStep,
} from '../utils/speech';
import { triggerHaptic } from '../utils/haptics';
import { LottieAudioAnimation } from './LottieAudioAnimation';
import { getNextLevel } from '../data/vocabulary';

interface ReelFeedProps {
  words: VocabularyWord[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  selectedLevel: CEFRLevel;
  onSelectLevel: (level: CEFRLevel) => void;
  onNextLevel?: () => void;
  autoPlayAudio: boolean;
  onToggleAutoPlay?: (enabled?: boolean) => void;
  savedWordsMap?: Record<string, boolean>;
  onToggleSaveWord?: (id: string) => void;
  showSavedOnly?: boolean;
  onClearSavedFilter?: () => void;
}

type PlaybackSpeed = 1.0 | 0.75 | 0.5;

export const ReelFeed: React.FC<ReelFeedProps> = ({
  words,
  currentIndex,
  onIndexChange,
  selectedLevel,
  onSelectLevel,
  onNextLevel,
  autoPlayAudio,
  onToggleAutoPlay,
  savedWordsMap,
  onToggleSaveWord,
  showSavedOnly = false,
  onClearSavedFilter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(currentIndex || 0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(0.75);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [teacherStep, setTeacherStep] = useState<TeacherStep>('idle');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Keep refs for asynchronous loop cycle tracking
  const activeIndexRef = useRef<number>(currentIndex || 0);
  activeIndexRef.current = activeIndex;
  const isLoopingRef = useRef<boolean>(true);
  isLoopingRef.current = isLooping;
  const speedRef = useRef<PlaybackSpeed>(0.75);
  speedRef.current = speed;
  const isAutoPlayRef = useRef<boolean>(autoPlayAudio);
  isAutoPlayRef.current = autoPlayAudio;
  const scrollTimeoutRef = useRef<number | null>(null);
  const interruptTimeoutRef = useRef<number | null>(null);
  const interruptionIdRef = useRef<number>(0);
  const loopActiveRef = useRef<boolean>(false);

  // Run teacher narration loop for a given word index
  const startTeacherLoopForIndex = useCallback(
    async (index: number) => {
      // Clear pending interrupt resumes
      if (interruptTimeoutRef.current) {
        clearTimeout(interruptTimeoutRef.current);
        interruptTimeoutRef.current = null;
      }
      stopSpeaking();
      const currentWord = words[index];
      if (!currentWord) return;

      loopActiveRef.current = true;
      setIsNarrating(true);

      const runIteration = async (): Promise<boolean> => {
        if (activeIndexRef.current !== index || !loopActiveRef.current) return false;

        const completed = await playTeacherLesson({
          word: currentWord.word,
          meaning_pa: currentWord.meaning_pa,
          example_fr: currentWord.example_fr,
          example_pa: currentWord.example_pa,
          rate: speedRef.current,
          onStepChange: (step) => {
            if (activeIndexRef.current === index && loopActiveRef.current) {
              setTeacherStep(step);
            }
          },
        });

        return completed;
      };

      // Loop execution
      while (activeIndexRef.current === index && loopActiveRef.current) {
        const finished = await runIteration();
        if (!finished || activeIndexRef.current !== index || !loopActiveRef.current) break;

        if (!isLoopingRef.current) {
          setIsNarrating(false);
          setTeacherStep('idle');
          loopActiveRef.current = false;
          break;
        }

        // Natural pause between repetition loops
        setTeacherStep('idle');
        await new Promise((r) => setTimeout(r, 1400));
        if (activeIndexRef.current !== index || !isLoopingRef.current || !loopActiveRef.current) break;
      }

      if (activeIndexRef.current === index && loopActiveRef.current) {
        setIsNarrating(false);
        setTeacherStep('idle');
        loopActiveRef.current = false;
      }
    },
    [words]
  );

  // Scroll to active index programmatically
  const scrollToIndex = useCallback((idx: number, smooth: boolean = true) => {
    const container = containerRef.current;
    if (!container) return;
    const items = container.querySelectorAll('.reel-item');
    const target = items[idx] as HTMLElement;
    if (target) {
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Sync with initial currentIndex when entering ReelFeed
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < words.length) {
      setActiveIndex(currentIndex);
      activeIndexRef.current = currentIndex;
      // Scroll to position without animation on first layout mount
      scrollToIndex(currentIndex, false);
    }
  }, [currentIndex, words.length, scrollToIndex]);

  // Scroll detection & auto-play with 500ms (half-second) pause
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      const items = Array.from(container.querySelectorAll('.reel-item')) as HTMLElement[];
      let closestIdx = 0;
      let minDistance = Infinity;

      items.forEach((item, idx) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const dist = Math.abs(containerCenter - itemCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      if (closestIdx !== activeIndexRef.current && minDistance < containerRect.height * 0.45) {
        // Stop any current utterance immediately
        if (interruptTimeoutRef.current) {
          clearTimeout(interruptTimeoutRef.current);
          interruptTimeoutRef.current = null;
        }
        loopActiveRef.current = false;
        stopSpeaking();
        setIsNarrating(false);
        setTeacherStep('idle');

        triggerHaptic('selection');
        setActiveIndex(closestIdx);
        activeIndexRef.current = closestIdx;
        onIndexChange(closestIdx);

        // Half a second (500ms) pause when scrolling to next/prev card
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => {
          if (isAutoPlayRef.current) {
            startTeacherLoopForIndex(closestIdx);
          }
        }, 500);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial play on mount if auto-play is enabled
    if (isAutoPlayRef.current && words.length > 0) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        startTeacherLoopForIndex(activeIndexRef.current);
      }, 400);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (interruptTimeoutRef.current) clearTimeout(interruptTimeoutRef.current);
      loopActiveRef.current = false;
      stopSpeaking();
    };
  }, [words, startTeacherLoopForIndex, onIndexChange]);

  // Master Play / Pause / Mute toggle for Teacher Audio
  const handleToggleNarrator = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    if (interruptTimeoutRef.current) clearTimeout(interruptTimeoutRef.current);

    triggerHaptic('medium');

    if (isNarrating) {
      // User tapped to MUTE / STOP
      loopActiveRef.current = false;
      stopSpeaking();
      setIsNarrating(false);
      setTeacherStep('idle');
      if (onToggleAutoPlay) {
        onToggleAutoPlay(false);
      }
    } else {
      // User tapped to PLAY / UNMUTE
      if (onToggleAutoPlay) {
        onToggleAutoPlay(true);
      }
      startTeacherLoopForIndex(index);
    }
  };

  // Cycle speed (1.0x -> 0.75x -> 0.5x)
  const handleCycleSpeed = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('selection');
    const nextSpeed: PlaybackSpeed =
      speed === 1.0 ? 0.75 : speed === 0.75 ? 0.5 : 1.0;
    setSpeed(nextSpeed);
    speedRef.current = nextSpeed;

    // If currently playing, restart immediately at the new French speed
    if (isNarrating) {
      if (interruptTimeoutRef.current) clearTimeout(interruptTimeoutRef.current);
      loopActiveRef.current = false;
      stopSpeaking();
      startTeacherLoopForIndex(activeIndexRef.current);
    }
  };

  // Toggle Loop Mode
  const handleToggleLoop = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('selection');
    setIsLooping((prev) => {
      const next = !prev;
      isLoopingRef.current = next;
      if (next && !isNarrating) {
        startTeacherLoopForIndex(activeIndexRef.current);
      }
      return next;
    });
  };

  // Toggle Mastered/Learned/Saved
  const handleToggleMastered = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('success');
    if (onToggleSaveWord) {
      onToggleSaveWord(id);
    }
  };

  // Share / Copy word
  const handleShare = async (word: VocabularyWord, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    const textToShare = `🇫🇷 ${word.word} (${word.level}) - ${word.meaning_pa}\n"${word.example_fr}"\n${word.example_pa}\n\nFrench Kiu`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textToShare);
      setCopiedId(word.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // User Section Tap Interruption:
  // 1. Immediately interrupts current speaker utterance
  // 2. Speaks the clicked section with highlighted visual step
  // 3. Waits half a second (500ms) after speech finishes
  // 4. If audio is still unmuted, automatically resumes full teacher loop
  const handleSectionClick = async (
    section: 'word_fr' | 'meaning_pa' | 'example',
    word: VocabularyWord,
    cardIndex: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    triggerHaptic('light');

    // Clear any pending timeouts
    if (interruptTimeoutRef.current) {
      clearTimeout(interruptTimeoutRef.current);
      interruptTimeoutRef.current = null;
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    // Stop currently playing loop or utterance immediately
    loopActiveRef.current = false;
    stopSpeaking();

    const interruptionId = ++interruptionIdRef.current;
    setIsNarrating(true);

    if (section === 'word_fr') {
      setTeacherStep('word_fr');
      await speakFrench(word.word, speedRef.current);
    } else if (section === 'meaning_pa') {
      setTeacherStep('meaning_pa');
      const cleanMeaning = cleanPunjabiSpeechText(word.meaning_pa);
      await speakPunjabi(`ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, ${cleanMeaning}`, 1.0);
    } else if (section === 'example') {
      setTeacherStep('example_fr');
      await speakFrench(word.example_fr, speedRef.current);
      if (
        interruptionId === interruptionIdRef.current &&
        activeIndexRef.current === cardIndex
      ) {
        setTeacherStep('example_pa');
        const cleanEx = cleanPunjabiSpeechText(word.example_pa);
        await speakPunjabi(`ਮਤਲਬ, ${cleanEx}`, 1.0);
      }
    }

    // If still on the same card and no newer interruption took over
    if (
      interruptionId === interruptionIdRef.current &&
      activeIndexRef.current === cardIndex
    ) {
      setTeacherStep('idle');

      // Half-second (500ms) pause before auto-restarting the speaker if unmuted
      if (isAutoPlayRef.current) {
        interruptTimeoutRef.current = window.setTimeout(() => {
          if (
            interruptionId === interruptionIdRef.current &&
            activeIndexRef.current === cardIndex &&
            isAutoPlayRef.current
          ) {
            startTeacherLoopForIndex(cardIndex);
          }
        }, 500);
      } else {
        setIsNarrating(false);
      }
    }
  };

  if (words.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white bg-[#001438] max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-full bg-[#FF9933]/20 border-2 border-[#FFD700] flex items-center justify-center mb-3">
          <Bookmark className="w-7 h-7 text-[#FF9933] stroke-[2.5]" />
        </div>
        <h3 className="text-lg font-black text-white font-brand mb-1">
          {showSavedOnly ? 'ਕੋਈ ਸੇਵ ਕੀਤਾ ਸ਼ਬਦ ਨਹੀਂ' : 'ਇਸ ਕੈਟੇਗਰੀ ਵਿੱਚ ਕੋਈ ਸ਼ਬਦ ਨਹੀਂ'}
        </h3>
        <p className="text-xs text-slate-300 font-gurmukhi leading-relaxed mb-4">
          {showSavedOnly
            ? 'ਕਿਸੇ ਵੀ ਕਾਰਡ ਦੇ 🔖 "ਸੇਵ" ਬਟਨ \'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਸ਼ਬਦਾਂ ਨੂੰ ਇੱਥੇ ਸੇਵ ਕਰੋ।'
            : 'ਕਿਰਪਾ ਕਰਕੇ ਕੋਈ ਹੋਰ ਕੈਟੇਗਰੀ ਜਾਂ ਪੱਧਰ ਚੁਣੋ।'}
        </p>
        {showSavedOnly && onClearSavedFilter && (
          <button
            type="button"
            onClick={onClearSavedFilter}
            className="px-4 py-2 rounded-xl bg-[#FF9933] text-[#00174D] font-black text-xs hover:bg-[#FFD700] transition-colors border border-[#FFD700] active:scale-95 shadow"
          >
            ਸਾਰੇ ਸ਼ਬਦ ਦੇਖੋ (Browse All Words)
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full max-w-md mx-auto overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-[#001438] border-x border-[#0033A0] shadow-2xl overscroll-contain touch-pan-y"
    >
      {words.map((word, index) => {
        const isMastered = savedWordsMap ? Boolean(savedWordsMap[word.id]) : false;
        const isActive = activeIndex === index;
        const currentStep = isActive ? teacherStep : 'idle';

        return (
          <section
            key={word.id}
            data-index={index}
            data-word-id={word.id}
            className="reel-item relative w-full h-full snap-start snap-always flex flex-col justify-center items-center p-2.5 sm:p-3.5 select-none bg-[#001438] overflow-hidden"
          >
            {/* FLAT SOLID WHITE CARD CONTAINER */}
            <div className="relative w-full max-w-[370px] sm:max-w-[395px] h-[94%] max-h-[560px] min-h-[400px] rounded-3xl bg-white text-[#002270] border-2 border-[#FFD700] p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-lg">
              {/* Card Header Info Bar */}
              <div className="w-full flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#FF9933] text-[#00174D] text-[11px] font-black tracking-wider uppercase border border-[#FFD700]">
                    {word.level}
                  </span>
                  {word.part_of_speech && (
                    <span className="text-[11px] font-bold text-[#002270] bg-[#FF9933]/15 px-2.5 py-0.5 rounded-lg border border-[#FF9933]/40">
                      {word.part_of_speech}
                    </span>
                  )}
                </div>

                {/* Progress counter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500 font-mono">
                    {index + 1} / {words.length}
                  </span>
                </div>
              </div>

              {/* MAIN CONTENT STAGE (CLICKABLE SECTIONS WITH AUTO-INTERRUPTION & 500MS RESUME) */}
              <div className="my-auto flex flex-col justify-center space-y-2.5 sm:space-y-3 py-1 w-full pr-14 sm:pr-16">
                {/* 1. French Word Section */}
                <div
                  onClick={(e) => handleSectionClick('word_fr', word, index, e)}
                  title="ਕਲਿੱਕ ਕਰਕੇ ਫ੍ਰੈਂਚ ਸ਼ਬਦ ਸੁਣੋ"
                  className={`p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer border active:scale-[0.99] ${
                    currentStep === 'word_fr'
                      ? 'bg-[#FF9933]/20 border-[#FF9933] ring-2 ring-[#FF9933]/60 scale-[1.01]'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black text-[#0033A0] uppercase tracking-widest block">
                      🇫🇷 ਫ੍ਰੈਂਚ ਸ਼ਬਦ · French Word
                    </span>
                    <span className="text-[9px] font-bold text-[#00174D] bg-[#FF9933]/30 px-1.5 py-0.5 rounded">
                      ਸੁਣੋ 🔊
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-[#002270] font-brand tracking-tight leading-tight">
                    {word.word}
                  </h2>
                  {word.phonetic && (
                    <p className="text-xs sm:text-sm font-bold text-[#FF9933] tracking-wide font-mono mt-0.5">
                      /{word.phonetic}/
                    </p>
                  )}
                </div>

                {/* 2. Punjabi Meaning Section (Flat solid Kesari box) */}
                <div
                  onClick={(e) => handleSectionClick('meaning_pa', word, index, e)}
                  title="ਕਲਿੱਕ ਕਰਕੇ ਪੰਜਾਬੀ ਅਰਥ ਸੁਣੋ"
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                    currentStep === 'meaning_pa'
                      ? 'bg-[#FF9933]/30 border-[#FF9933] ring-2 ring-[#FF9933] scale-[1.01]'
                      : 'bg-[#FF9933]/10 border-[#FF9933]/40 hover:bg-[#FF9933]/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#FF9933] stroke-[2.5]" />
                      <span>ਪੰਜਾਬੀ ਅਰਥ · Punjabi Meaning</span>
                    </span>
                    <span className="text-[9px] font-bold text-[#00174D] bg-[#FF9933] px-1.5 py-0.5 rounded">
                      ਸੁਣੋ 🔊
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-[#002270] font-gurmukhi leading-snug tracking-tight">
                    {word.meaning_pa}
                  </p>
                </div>

                {/* 3. Example Sentence Box (French + Punjabi) */}
                <div
                  onClick={(e) => handleSectionClick('example', word, index, e)}
                  title="ਕਲਿੱਕ ਕਰਕੇ ਉਦਾਹਰਣ ਵਾਕ ਸੁਣੋ"
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                    currentStep === 'example_fr' || currentStep === 'example_pa'
                      ? 'bg-slate-100 border-[#0033A0] ring-2 ring-[#0033A0] scale-[1.01]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">
                      ਉਦਾਹਰਣ · Example
                    </span>
                    <span className="text-[9px] font-bold text-[#00174D] bg-[#FF9933] px-1.5 py-0.5 rounded">
                      ਸੁਣੋ 🔊
                    </span>
                  </div>

                  <p
                    className={`text-sm sm:text-base font-bold italic leading-relaxed mb-1.5 font-brand transition-colors ${
                      currentStep === 'example_fr'
                        ? 'text-[#002270] underline decoration-[#FF9933] decoration-2'
                        : 'text-slate-800'
                    }`}
                  >
                    &ldquo;{word.example_fr}&rdquo;
                  </p>

                  <p
                    className={`text-sm sm:text-base font-semibold font-gurmukhi leading-relaxed border-t border-slate-200 pt-1.5 transition-colors ${
                      currentStep === 'example_pa'
                        ? 'text-[#002270] font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    {word.example_pa}
                  </p>
                </div>
              </div>

              {/* CARD FOOTER: Next / Prev buttons */}
              <div className="w-full flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-medium shrink-0">
                <span className="text-[10px] text-slate-500 font-bold">
                  {isLooping ? '🔁 ਲੂਪ ਚਾਲੂ' : '⏹️ 1 ਵਾਰ ਬੋਲਣਾ'}
                </span>

                <div className="flex items-center gap-1.5">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        scrollToIndex(index - 1);
                      }}
                      className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 active:scale-95"
                      title="ਪਿਛਲਾ ਸ਼ਬਦ"
                    >
                      <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}

                  {index < words.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        scrollToIndex(index + 1);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF9933] text-[#00174D] font-black text-[11px] hover:bg-[#FFD700] transition-colors border border-[#FFD700] active:scale-95 shadow-sm"
                      title="ਅਗਲਾ ਸ਼ਬਦ"
                    >
                      <span>ਅਗਲਾ ਸ਼ਬਦ</span>
                      <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('success');
                        if (onNextLevel) onNextLevel();
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FF9933] text-[#00174D] font-black text-[11px] hover:bg-[#FFD700] transition-colors border border-[#FFD700] active:scale-95 shadow-sm"
                    >
                      <span>ਅਗਲਾ ਪੱਧਰ ({getNextLevel(selectedLevel)})</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>

              {/* FLOATING ACTION CONTROL BAR (INSIDE RIGHT EDGE OF CARD) */}
              <aside className="absolute right-2 sm:right-3 bottom-12 sm:bottom-14 z-20 flex flex-col items-center gap-2 select-none">
                {/* 1. Master Teacher Audio (Play / Pause / Pulsing Ring) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    id={`btn-narrate-${word.id}`}
                    aria-label={isNarrating && isActive ? 'Mute teacher commentary' : 'Play teacher commentary'}
                    onClick={(e) => handleToggleNarrator(index, e)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all active:scale-90 flex items-center justify-center shadow-sm ${
                      isNarrating && isActive
                        ? 'bg-[#FF9933] border-[#FFD700] text-[#00174D] ring-2 ring-[#FF9933]'
                        : 'bg-white border-[#FF9933] text-[#002270] hover:bg-[#FF9933] hover:text-[#00174D]'
                    }`}
                    title={isNarrating && isActive ? 'ਬੰਦ ਕਰੋ' : 'ਸੁਣੋ'}
                  >
                    {isNarrating && isActive ? (
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    ) : (
                      <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                    )}
                  </button>
                  <span className="text-[9px] font-black text-[#002270] mt-0.5">
                    {isNarrating && isActive ? 'ਬੰਦ ਕਰੋ' : 'ਸੁਣੋ'}
                  </span>
                </div>

                {/* 2. Continuous Loop Toggle */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Toggle Continuous Loop"
                    onClick={(e) => handleToggleLoop(e)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all active:scale-90 flex items-center justify-center shadow-sm ${
                      isLooping
                        ? 'bg-[#002270] border-[#002270] text-[#FFD700]'
                        : 'bg-white border-slate-300 text-slate-400 hover:text-[#002270]'
                    }`}
                    title={isLooping ? 'ਲੂਪ ਬੰਦ ਕਰੋ' : 'ਵਾਰ-ਵਾਰ ਸੁਣੋ'}
                  >
                    <Repeat className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5">
                    {isLooping ? 'ਲੂਪ' : '1 ਵਾਰ'}
                  </span>
                </div>

                {/* 3. French Speed Control (1.0x / 0.75x / 0.5x) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Change French Pronunciation Speed"
                    onClick={(e) => handleCycleSpeed(e)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-[#FF9933] text-[#002270] hover:bg-[#FF9933]/15 transition-all active:scale-90 flex items-center justify-center font-black text-[10px] shadow-sm"
                    title="ਫ੍ਰੈਂਚ ਬੋਲਣ ਦੀ ਰਫ਼ਤਾਰ (1x, 0.75x, 0.5x)"
                  >
                    <span>{speed}x</span>
                  </button>
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5">
                    ਫ੍ਰੈਂਚ
                  </span>
                </div>

                {/* 4. Bookmark / Mastered Button */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Mark Word as Mastered"
                    onClick={(e) => handleToggleMastered(word.id, e)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all active:scale-90 flex items-center justify-center shadow-sm ${
                      isMastered
                        ? 'bg-[#FF9933] border-[#FF9933] text-[#00174D]'
                        : 'bg-white border-slate-300 text-slate-400 hover:text-[#FF9933]'
                    }`}
                    title={isMastered ? 'ਯਾਦ ਹੋ ਗਿਆ' : 'ਸੇਵ ਕਰੋ'}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${isMastered ? 'fill-[#00174D]' : ''}`}
                    />
                  </button>
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5">
                    {isMastered ? 'ਯਾਦ' : 'ਸੇਵ'}
                  </span>
                </div>

                {/* 5. Share / Copy */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Copy word details"
                    onClick={(e) => handleShare(word, e)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-[#002270] transition-all active:scale-90 flex items-center justify-center shadow-sm"
                    title="ਸ਼ੇਅਰ ਕਰੋ"
                  >
                    {copiedId === word.id ? (
                      <Check className="w-3.5 h-3.5 text-green-600 stroke-[3]" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5">
                    {copiedId === word.id ? 'ਕਾਪੀ!' : 'ਸ਼ੇਅਰ'}
                  </span>
                </div>
              </aside>
            </div>
          </section>
        );
      })}
    </div>
  );
};
