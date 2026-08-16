import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Volume2, RotateCw } from 'lucide-react';
import { VocabularyWord } from '../types';
import { speakFrench, stopSpeaking } from '../utils/speech';
import { triggerHaptic } from '../utils/haptics';
import { LottieAudioAnimation } from './LottieAudioAnimation';

interface FlashcardProps {
  card: VocabularyWord;
  nextCard?: VocabularyWord;
  onSwipe: (direction: 'left' | 'right') => void;
  autoPlayAudio?: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  card,
  nextCard,
  onSwipe,
  autoPlayAudio = true,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Motion values for swipe drag
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-16, 0, 16]);
  const opacity = useTransform(x, [-240, -140, 0, 140, 240], [0.3, 0.95, 1, 0.95, 0.3]);

  // Peeking card transforms behind
  const nextCardScale = useTransform(x, [-200, 0, 200], [1, 0.95, 1]);
  const nextCardOpacity = useTransform(x, [-200, 0, 200], [0.95, 0.65, 0.95]);
  const nextCardY = useTransform(x, [-200, 0, 200], [0, 12, 0]);

  // Visual drag cues
  const leftCueOpacity = useTransform(x, [-120, -30, 0], [0.9, 0.4, 0]);
  const rightCueOpacity = useTransform(x, [0, 30, 120], [0, 0.4, 0.9]);

  // Auto-play audio on card change
  useEffect(() => {
    setIsFlipped(false);
    let isMounted = true;

    if (autoPlayAudio) {
      const timer = setTimeout(async () => {
        if (!isMounted) return;
        setIsPlayingAudio(true);
        await speakFrench(card.word, 0.85);
        if (isMounted) setIsPlayingAudio(false);
      }, 300);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopSpeaking();
      };
    }
  }, [card.id, autoPlayAudio]);

  const handlePlayWordAudio = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    setIsPlayingAudio(true);
    await speakFrench(card.word, 0.85);
    setIsPlayingAudio(false);
  };

  const handlePlaySentenceAudio = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setIsPlayingAudio(true);
    await speakFrench(card.example_fr, 0.85);
    setIsPlayingAudio(false);
  };

  const handleCardTap = () => {
    triggerHaptic('selection');
    setIsFlipped((prev) => !prev);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 80;
    const velocityThreshold = 350;

    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      triggerHaptic('medium');
      onSwipe('right');
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      triggerHaptic('medium');
      onSwipe('left');
    }
  };

  return (
    <div className="relative w-full max-w-[365px] sm:max-w-[390px] h-[92%] max-h-[530px] min-h-[400px] mx-auto flex items-center justify-center perspective-1000">
      {/* Background Peeking Card (Kindle-stack feel with flat colors) */}
      {nextCard && (
        <motion.div
          style={{
            scale: nextCardScale,
            opacity: nextCardOpacity,
            y: nextCardY,
          }}
          className="absolute inset-x-2 inset-y-0 rounded-3xl bg-white border border-[#0033A0] shadow-md pointer-events-none flex flex-col items-center justify-center p-6 text-center select-none"
        >
          <span className="text-3xl font-black text-[#002270]/40 font-brand">
            {nextCard.word}
          </span>
        </motion.div>
      )}

      {/* Active Interactive Top Card */}
      <motion.div
        id={`card-${card.id}`}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity }}
        initial={{ scale: 0.92, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0, transition: { duration: 0.18 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        onClick={handleCardTap}
        className="relative z-10 w-full h-full cursor-pointer touch-none select-none"
      >
        {/* Drag indicators */}
        <motion.div
          style={{ opacity: rightCueOpacity }}
          className="absolute -right-3 top-6 z-30 bg-[#FF9933] text-[#00174D] border-2 border-[#FFD700] px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase shadow-md rotate-12 pointer-events-none"
        >
          ਅਗਲਾ · Next
        </motion.div>

        <motion.div
          style={{ opacity: leftCueOpacity }}
          className="absolute -left-3 top-6 z-30 bg-[#FF9933] text-[#00174D] border-2 border-[#FFD700] px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase shadow-md -rotate-12 pointer-events-none"
        >
          ਅਗਲਾ · Next
        </motion.div>

        {/* 3D Flip Container */}
        <div
          className="w-full h-full relative transform-style-preserve-3d transition-transform duration-500 rounded-3xl"
          style={{
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ================= FRONT OF CARD ================= */}
          <div className="absolute inset-0 backface-hidden rounded-3xl bg-white border-2 border-[#FFD700] shadow-lg flex flex-col justify-between p-5 sm:p-6 overflow-hidden">
            {/* Top decorative accent bar */}
            <div className="w-full flex items-center justify-between border-b border-slate-200 pb-2.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#FF9933] text-[#00174D] text-[11px] font-black tracking-wider uppercase border border-[#FFD700]">
                  {card.level}
                </span>
                {card.part_of_speech && (
                  <span className="text-[11px] font-bold text-[#002270] bg-[#FF9933]/15 px-2.5 py-0.5 rounded-lg border border-[#FF9933]/40">
                    {card.part_of_speech}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF9933]">
                <span>ਪਲਟੋ · Flip</span>
                <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            {/* Center: French Word */}
            <div className="my-auto flex flex-col items-center justify-center text-center px-2 py-3">
              <motion.h1
                key={card.word}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="text-4xl sm:text-5xl font-black text-[#002270] tracking-tight leading-tight mb-1 font-brand break-words"
              >
                {card.word}
              </motion.h1>

              {card.phonetic && (
                <p className="text-sm font-bold text-[#FF9933] tracking-wide font-mono mt-1 mb-1">
                  /{card.phonetic}/
                </p>
              )}
            </div>

            {/* Bottom: Audio Speaker & Lottie Animation */}
            <div className="w-full flex flex-col items-center justify-center gap-2 pt-2 shrink-0">
              <div className="h-6 flex items-center justify-center">
                <LottieAudioAnimation isPlaying={isPlayingAudio} width={44} height={20} />
              </div>

              <button
                id="btn-play-french-audio"
                type="button"
                aria-label="Replay French audio pronunciation"
                onClick={handlePlayWordAudio}
                className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#FF9933] text-[#00174D] border-2 border-[#FFD700] active:scale-95 transition-transform"
              >
                <Volume2 className="w-6 h-6 stroke-[2.5] text-[#00174D] group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* ================= BACK OF CARD ================= */}
          <div
            className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-white border-2 border-[#FFD700] shadow-lg flex flex-col justify-between p-5 sm:p-6 overflow-hidden"
          >
            {/* Top Bar on Back */}
            <div className="w-full flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
              <span className="text-xs font-black text-[#002270] uppercase tracking-wider">
                {card.word} <span className="text-slate-500 font-bold">({card.level})</span>
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#FF9933]">
                <span>ਵਾਪਸ · Flip</span>
                <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            {/* Middle: Punjabi Meaning & Example Sentence */}
            <div className="my-auto flex flex-col items-center justify-center text-center px-1 py-1 gap-2.5 w-full">
              {/* Punjabi Meaning */}
              <div className="w-full bg-[#FF9933]/15 rounded-2xl p-3 sm:p-3.5 border border-[#FF9933]/40">
                <span className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest block mb-0.5">
                  ਪੰਜਾਬੀ ਅਰਥ · Punjabi Meaning
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#002270] font-gurmukhi leading-snug">
                  {card.meaning_pa}
                </h2>
              </div>

              {/* Example Sentence in French & Punjabi */}
              <div className="w-full bg-slate-50 rounded-2xl p-3 sm:p-3.5 border border-slate-200 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">
                    ਉਦਾਹਰਣ · Example
                  </span>
                  <button
                    id="btn-play-sentence-audio"
                    type="button"
                    onClick={handlePlaySentenceAudio}
                    aria-label="Listen to example sentence"
                    className="p-1 rounded-md bg-[#FF9933]/20 text-[#002270] hover:bg-[#FF9933] hover:text-[#00174D] transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-[#002270] italic leading-relaxed mb-1 font-brand">
                  &ldquo;{card.example_fr}&rdquo;
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-700 font-gurmukhi leading-relaxed border-t border-slate-200 pt-1">
                  {card.example_pa}
                </p>
              </div>
            </div>

            {/* Bottom Speaker Button */}
            <div className="w-full flex items-center justify-center pt-1 shrink-0">
              <button
                id="btn-replay-word-back"
                type="button"
                aria-label="Replay French audio pronunciation"
                onClick={handlePlayWordAudio}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF9933] text-[#00174D] border border-[#FFD700] text-xs font-black active:scale-95 transition-transform"
              >
                <Volume2 className="w-4 h-4 stroke-[2.5]" />
                <span>ਉਚਾਰਨ ਸੁਣੋ · Listen</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

