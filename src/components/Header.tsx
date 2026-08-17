import React from 'react';
import { AppMode } from '../types';
import { ModeSwitch } from './ModeSwitch';
import { Bookmark, SlidersHorizontal, ChevronUp } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  savedCount: number;
  showSavedOnly: boolean;
  onToggleShowSaved: () => void;
  showControls: boolean;
  onToggleControls: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  savedCount,
  showSavedOnly,
  onToggleShowSaved,
  showControls,
  onToggleControls,
}) => {
  return (
    <header className="w-full pt-2 pb-1 px-3 max-w-md mx-auto flex items-center justify-between gap-1.5 select-none">
      <ModeSwitch mode={mode} onModeChange={onModeChange} />

      <div className="flex items-center gap-1.5">
        {/* Toggle Controls (Auto-hideable navigation bar) */}
        {!showSavedOnly && (
          <button
            type="button"
            id="btn-toggle-controls"
            onClick={() => {
              triggerHaptic('selection');
              onToggleControls();
            }}
            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border active:scale-95 transition-colors ${
              showControls
                ? 'bg-[#002270] text-[#FFD700] border-[#FFD700]/40'
                : 'bg-[#002270] text-[#88B0FF] border-[#0033A0] hover:text-white hover:border-[#88B0FF]/40'
            }`}
            title={showControls ? 'ਕੰਟਰੋਲ ਛੁਪਾਓ (Hide Controls)' : 'ਕੰਟਰੋਲ ਦਿਖਾਓ (Show Controls)'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span className="font-gurmukhi">ਕੰਟਰੋਲ</span>
            <ChevronUp
              className={`w-3 h-3 transition-transform duration-200 opacity-80 ${
                showControls ? 'rotate-0' : 'rotate-180'
              }`}
            />
          </button>
        )}

        {/* Bookmark / Saved words quick filter button */}
        <button
          type="button"
          id="btn-filter-saved-words"
          onClick={() => {
            triggerHaptic('selection');
            onToggleShowSaved();
          }}
          className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] sm:text-xs transition-all flex items-center gap-1.5 border active:scale-95 shadow-sm ${
            showSavedOnly
              ? 'bg-[#FF9933] text-[#00174D] border-[#FFD700] ring-2 ring-[#FF9933]/50'
              : 'bg-[#002270] text-[#88B0FF] border-[#0033A0] hover:text-white hover:border-[#FF9933]/50'
          }`}
          title={showSavedOnly ? 'ਸਾਰੇ ਸ਼ਬਦ ਦੇਖੋ' : 'ਸੇਵ ਕੀਤੇ ਸ਼ਬਦ ਦੇਖੋ'}
        >
          <Bookmark
            className={`w-3.5 h-3.5 ${
              showSavedOnly || savedCount > 0 ? 'fill-current' : ''
            }`}
          />
          <span className="font-gurmukhi">ਸੇਵ</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              showSavedOnly
                ? 'bg-[#00174D] text-[#FFD700]'
                : 'bg-[#00174D]/80 text-[#88B0FF]'
            }`}
          >
            {savedCount}
          </span>
        </button>
      </div>
    </header>
  );
};


