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
  GraduationCap
} from 'lucide-react';
import { VocabularyWord, CEFRLevel } from '../types';
import {
  playTeacherLesson,
  speakFrench,
  speakPunjabi,
  stopSpeaking,
  TeacherStep,
} from '../utils/speech';
import { triggerHaptic } from '../utils/haptics';
import { LottieAudioAnimation } from './LottieAudioAnimation';

interface ReelFeedProps {
  words: VocabularyWord[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  selectedLevel: CEFRLevel;
  onSelectLevel: (level: CEFRLevel) => void;
  autoPlayAudio: boolean;
  onToggleAutoPlay?: (enabled?: boolean) => void;
}

type PlaybackSpeed = 1.0 | 0.75 | 0.5;

export const ReelFeed: React.FC<ReelFeedProps> = ({
  words,
  currentIndex,
  onIndexChange,
  autoPlayAudio,
  onToggleAutoPlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(currentIndex || 0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(0.75);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [teacherStep, setTeacherStep] = useState<TeacherStep>('idle');
  const [masteredMap, setMasteredMap] = useState<Record<string, boolean>>({});
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
  const loopActiveRef = useRef<boolean>(false);

  // Run teacher narration loop for a given word index
  const startTeacherLoopForIndex = useCallback(
    async (index: number) => {
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

      if (activeIndexRef.current === index) {
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
      loopActiveRef.current = false;
      stopSpeaking();
    };
  }, [words, startTeacherLoopForIndex, onIndexChange]);

  // Master Play / Pause / Mute toggle for Teacher Audio
  const handleToggleNarrator = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

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

  // Toggle Mastered/Learned
  const handleToggleMastered = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('success');
    setMasteredMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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

  // Touch triggers for individual elements
  const handleSpeakSingleWord = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    loopActiveRef.current = false;
    stopSpeaking();
    setIsNarrating(false);
    setTeacherStep('word_fr');
    speakFrench(word, speedRef.current).then(() => setTeacherStep('idle'));
  };

  const handleSpeakSingleMeaning = (meaning: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    loopActiveRef.current = false;
    stopSpeaking();
    setIsNarrating(false);
    setTeacherStep('meaning_pa');
    speakPunjabi(`ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, ${meaning}`, 1.0).then(() =>
      setTeacherStep('idle')
    );
  };

  const handleSpeakSingleSentence = (
    sentenceFr: string,
    sentencePa: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    triggerHaptic('light');
    loopActiveRef.current = false;
    stopSpeaking();
    setIsNarrating(false);
    setTeacherStep('example_fr');
    speakFrench(sentenceFr, speedRef.current).then(async () => {
      setTeacherStep('example_pa');
      await speakPunjabi(`ਮਤਲਬ, ${sentencePa}`, 1.0);
      setTeacherStep('idle');
    });
  };

  if (words.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white bg-[#001438]">
        <p className="text-base font-bold font-gurmukhi text-[#FFD700]">
          ਇਸ ਕੈਟੇਗਰੀ ਵਿੱਚ ਕੋਈ ਸ਼ਬਦ ਨਹੀਂ ਮਿਲਿਆ।
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full max-w-md mx-auto overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-[#001438] border-x border-[#0033A0] shadow-2xl overscroll-contain touch-pan-y"
    >
      {words.map((word, index) => {
        const isMastered = !!masteredMap[word.id];
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

                {/* Progress pill + Lottie Live Audio Badge */}
                <div className="flex items-center gap-2">
                  {isActive && isNarrating && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-[#00174D] bg-[#FF9933] px-2 py-0.5 rounded-lg border border-[#FFD700]">
                      <GraduationCap className="w-3 h-3 text-[#00174D] stroke-[2.5]" />
                      <span>ਬੋਲ ਰਿਹਾ ਹੈ</span>
                      <LottieAudioAnimation isPlaying={true} width={28} height={14} />
                    </div>
                  )}
                  <span className="text-xs font-black text-slate-500 font-mono">
                    {index + 1} / {words.length}
                  </span>
                </div>
              </div>

              {/* MAIN CONTENT STAGE (BIGGER FONTS & INSTANT VISIBILITY) */}
              <div className="my-auto flex flex-col justify-center space-y-2.5 sm:space-y-3 py-1 w-full pr-14 sm:pr-16">
                {/* 1. French Word Section */}
                <div
                  onClick={(e) => handleSpeakSingleWord(word.word, e)}
                  className={`p-2.5 sm:p-3 rounded-2xl transition-colors cursor-pointer border ${
                    currentStep === 'word_fr'
                      ? 'bg-[#FF9933]/20 border-[#FF9933] scale-[1.01]'
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-black text-[#0033A0] uppercase tracking-widest block mb-0.5">
                    🇫🇷 ਫ੍ਰੈਂਚ ਸ਼ਬਦ · French Word
                  </span>
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
                  onClick={(e) => handleSpeakSingleMeaning(word.meaning_pa, e)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                    currentStep === 'meaning_pa'
                      ? 'bg-[#FF9933]/25 border-[#FF9933] ring-2 ring-[#FF9933] scale-[1.01]'
                      : 'bg-[#FF9933]/10 border-[#FF9933]/40 hover:bg-[#FF9933]/15'
                  }`}
                >
                  <span className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3 text-[#FF9933] stroke-[2.5]" />
                    <span>ਪੰਜਾਬੀ ਅਰਥ · Punjabi Meaning</span>
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-[#002270] font-gurmukhi leading-snug tracking-tight">
                    {word.meaning_pa}
                  </p>
                </div>

                {/* 3. Example Sentence Box (French + Punjabi) */}
                <div
                  onClick={(e) =>
                    handleSpeakSingleSentence(
                      word.example_fr,
                      word.example_pa,
                      e
                    )
                  }
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-colors cursor-pointer ${
                    currentStep === 'example_fr' || currentStep === 'example_pa'
                      ? 'bg-slate-100 border-[#0033A0] ring-2 ring-[#0033A0]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
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
                    className={`text-xs sm:text-sm font-bold italic leading-relaxed mb-1 font-brand transition-colors ${
                      currentStep === 'example_fr'
                        ? 'text-[#002270] underline decoration-[#FF9933] decoration-2'
                        : 'text-slate-800'
                    }`}
                  >
                    &ldquo;{word.example_fr}&rdquo;
                  </p>

                  <p
                    className={`text-xs sm:text-sm font-semibold font-gurmukhi leading-relaxed border-t border-slate-200 pt-1 transition-colors ${
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
                      onClick={() => scrollToIndex(index - 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#002270] border border-slate-300 active:scale-95"
                      title="Previous"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {index < words.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => scrollToIndex(index + 1)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF9933] text-[#00174D] font-black text-[11px] hover:bg-[#FFD700] transition-colors border border-[#FFD700] active:scale-95 shadow-sm"
                    >
                      <span>ਅਗਲਾ ਸ਼ਬਦ</span>
                      <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  ) : (
                    <span className="text-[#FF9933] font-bold text-xs">
                      ਆਖਰੀ ਸ਼ਬਦ ✨
                    </span>
                  )}
                </div>
              </div>

              {/* FLOATING ACTION CONTROL BAR (VERTICAL RIGHT SIDEBAR) */}
              <aside className="absolute right-2 sm:right-3 bottom-10 sm:bottom-12 z-20 flex flex-col items-center gap-2">
                {/* 1. Master Teacher Audio (Play / Pause / Pulsing Ring) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    id={`btn-narrate-${word.id}`}
                    aria-label="Teacher Audio Narrator"
                    onClick={(e) => handleToggleNarrator(index, e)}
                    className={`relative w-10 h-10 rounded-full border-2 transition-all active:scale-90 flex items-center justify-center ${
                      isNarrating && isActive
                        ? 'bg-[#FF9933] border-[#FFD700] text-[#00174D] ring-2 ring-[#FF9933]'
                        : 'bg-white border-[#FF9933] text-[#002270] hover:bg-[#FF9933] hover:text-[#00174D]'
                    }`}
                  >
                    {isNarrating && isActive ? (
                      <Volume2 className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <VolumeX className="w-5 h-5 stroke-[2]" />
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
                    className={`w-9 h-9 rounded-full border transition-all active:scale-90 flex items-center justify-center ${
                      isLooping
                        ? 'bg-[#002270] border-[#002270] text-[#FFD700]'
                        : 'bg-white border-slate-300 text-slate-400 hover:text-[#002270]'
                    }`}
                  >
                    <Repeat className="w-4 h-4 stroke-[2]" />
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
                    className="w-9 h-9 rounded-full bg-white border border-[#FF9933] text-[#002270] hover:bg-[#FF9933]/15 transition-all active:scale-90 flex items-center justify-center font-black text-[10px]"
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
                    className={`w-9 h-9 rounded-full border transition-all active:scale-90 flex items-center justify-center ${
                      isMastered
                        ? 'bg-[#FF9933] border-[#FF9933] text-[#00174D]'
                        : 'bg-white border-slate-300 text-slate-400 hover:text-[#FF9933]'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isMastered ? 'fill-[#00174D]' : ''}`}
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
                    className="w-9 h-9 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-[#002270] transition-all active:scale-90 flex items-center justify-center"
                  >
                    {copiedId === word.id ? (
                      <Check className="w-4 h-4 text-green-600 stroke-[3]" />
                    ) : (
                      <Share2 className="w-4 h-4" />
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
