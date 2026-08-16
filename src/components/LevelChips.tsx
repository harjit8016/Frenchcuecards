import React from 'react';
import { CEFRLevel } from '../types';
import { triggerHaptic } from '../utils/haptics';

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface LevelChipsProps {
  selectedLevel: CEFRLevel;
  onSelectLevel: (level: CEFRLevel) => void;
}

export const LevelChips: React.FC<LevelChipsProps> = ({
  selectedLevel,
  onSelectLevel,
}) => {
  const handleClick = (level: CEFRLevel) => {
    if (level !== selectedLevel) {
      triggerHaptic('selection');
      onSelectLevel(level);
    }
  };

  return (
    <nav
      aria-label="CEFR Proficiency Level"
      className="sticky top-0 z-30 w-full bg-[#00174D] border-b border-[#002B80] py-2 px-3 transition-colors"
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {CEFR_LEVELS.map((level) => {
          const isSelected = selectedLevel === level;
          return (
            <button
              key={level}
              id={`level-chip-${level.toLowerCase()}`}
              type="button"
              onClick={() => handleClick(level)}
              className={`flex-1 py-1.5 sm:py-2 px-1 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all outline-none flex items-center justify-center ${
                isSelected
                  ? 'bg-[#FF9933] text-[#00174D] border-2 border-[#FFD700] shadow-sm scale-[1.02] z-10'
                  : 'bg-[#002270] text-[#88B0FF] border border-[#0033A0] hover:text-white active:scale-95'
              }`}
              aria-pressed={isSelected}
            >
              <span className="font-black uppercase">{level}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

