import React, { useState } from 'react';
import {
  ExternalLink,
  Instagram,
  Sparkles,
  Share2,
  Check,
  ChevronDown,
  Volume2,
  GraduationCap,
  ArrowRight,
  Globe
} from 'lucide-react';
import { TeacherAdCard as TeacherAdCardType } from '../types';
import { speakPunjabi, stopSpeaking } from '../utils/speech';
import { triggerHaptic } from '../utils/haptics';

interface TeacherAdCardProps {
  ad: TeacherAdCardType;
  index: number;
  totalCards: number;
  onNext?: () => void;
  isReelMode?: boolean;
}

export const TeacherAdCard: React.FC<TeacherAdCardProps> = ({
  ad,
  index,
  totalCards,
  onNext,
  isReelMode = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleOpenLink = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('success');
    window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    const shareText = `🇫🇷 ਫ੍ਰੈਂਚ ਸਿੱਖਣ ਲਈ ਇੰਸਟਾਗ੍ਰਾਮ ਅਤੇ ਆਫੀਸ਼ੀਅਲ ਪ੍ਰੋਫਾਈਲ ਨਾਲ ਜੁੜੋ:\n${ad.linkUrl}\n\nFrench Kiu`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handlePlayAdVoice = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    stopSpeaking();
    setIsPlayingAudio(true);
    const speechText = 'ਰੋਜ਼ਾਨਾ ਫ੍ਰੈਂਚ ਸਿੱਖਣ ਲਈ, ਹੇਠਾਂ ਦਿੱਤੇ ਲਿੰਕ ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਸਾਡੇ ਇੰਸਟਾਗ੍ਰਾਮ ਪ੍ਰੋਫਾਈਲ ਨਾਲ ਜੁੜੋ।';
    await speakPunjabi(speechText, 1.0);
    setIsPlayingAudio(false);
  };

  return (
    <div className="relative w-full max-w-[370px] sm:max-w-[395px] h-[94%] max-h-[560px] min-h-[400px] rounded-3xl bg-white text-[#002270] border-2 border-[#FFD700] p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-xl select-none">
      {/* Top Header info */}
      <div className="w-full flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#FF9933] to-[#FFD700] text-[#00174D] text-[11px] font-black tracking-wider uppercase border border-[#FFD700] flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3 stroke-[2.5]" />
            <span>ਅਧਿਆਪਕ ਲਿੰਕ · Official</span>
          </span>
          <span className="text-[10px] font-bold text-[#002270] bg-[#FF9933]/15 px-2 py-0.5 rounded-lg border border-[#FF9933]/40">
            Instagram & Linktree
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-500 font-mono">
            {index + 1} / {totalCards}
          </span>
        </div>
      </div>

      {/* Main Body Stage */}
      <div className="my-auto flex flex-col items-center text-center space-y-3 py-1 w-full">
        {/* Profile Avatar / Badge with Instagram Ring */}
        <div className="relative cursor-pointer group" onClick={handleOpenLink}>
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-[3px] bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] shadow-md transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center p-1 border-2 border-white">
              <Instagram className="w-8 h-8 text-[#d62976] stroke-[2.2]" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-[#002270] text-[#FFD700] rounded-full p-1 border border-[#FFD700] shadow-sm">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        </div>

        {/* Headline & Subtitle */}
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-black text-[#002270] font-brand tracking-tight leading-snug">
            {ad.title_pa}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-[#FF9933] font-gurmukhi">
            {ad.subtitle_pa}
          </p>
          <p className="text-[11px] text-slate-500 italic">
            &ldquo;{ad.title_fr}&rdquo;
          </p>
        </div>

        {/* Rich Link Preview Card */}
        <div
          onClick={handleOpenLink}
          className="w-full rounded-2xl bg-gradient-to-br from-slate-50 to-[#FF9933]/10 border-2 border-[#FFD700] p-3 sm:p-3.5 transition-all hover:border-[#FF9933] hover:shadow-md cursor-pointer text-left group"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Instagram className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-[#002270] flex items-center gap-1">
                  <span>Instagram & Linktree</span>
                  <Globe className="w-3 h-3 text-slate-400" />
                </p>
                <p className="text-[11px] font-bold text-slate-500 font-mono">
                  tr.ee/K-4YaRv6EA
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#FF9933] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          <p className="text-xs font-semibold text-slate-700 font-gurmukhi leading-relaxed mb-2.5">
            {ad.bio_pa}
          </p>

          {/* Direct CTA Button */}
          <button
            type="button"
            onClick={handleOpenLink}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#d62976] via-[#e6683c] to-[#f09433] text-white font-black text-xs sm:text-sm hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Instagram className="w-4 h-4" />
            <span>ਇੰਸਟਾਗ੍ਰਾਮ ਪ੍ਰੋਫਾਈਲ ਖੋਲ੍ਹੋ (Visit Profile)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="w-full flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-medium shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePlayAdVoice}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all active:scale-95 ${
              isPlayingAudio
                ? 'bg-[#FF9933] text-[#00174D] border-[#FFD700]'
                : 'bg-slate-100 text-[#002270] border-slate-300 hover:bg-slate-200'
            }`}
            title="Listen in Punjabi"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>ਸੁਣੋ 🔊</span>
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            className="p-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#002270] border border-slate-300 active:scale-95 flex items-center gap-1 text-[11px] font-bold"
            title="Share Profile Link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700">ਕਾਪੀ ਹੋ ਗਿਆ!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>ਸ਼ੇਅਰ</span>
              </>
            )}
          </button>
        </div>

        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002270] text-[#FFD700] font-black text-xs hover:bg-[#00174D] transition-colors border border-[#0033A0] active:scale-95 shadow-sm"
          >
            <span>ਅਗਲਾ ਸ਼ਬਦ</span>
            {isReelMode ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
