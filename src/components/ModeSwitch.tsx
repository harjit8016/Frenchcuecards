import React from 'react';
import { motion } from 'motion/react';
import { Layers, Film } from 'lucide-react';
import { AppMode } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface ModeSwitchProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ mode, onModeChange }) => {
  const handleSwitch = (newMode: AppMode) => {
    if (newMode !== mode) {
      triggerHaptic('selection');
      onModeChange(newMode);
    }
  };

  return (
    <div className="flex items-center p-1 bg-[#001F5C] rounded-full border border-[#0033A0]">
      <button
        id="mode-btn-reels"
        type="button"
        onClick={() => handleSwitch('reels')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-colors ${
          mode === 'reels'
            ? 'text-[#00174D]'
            : 'text-[#88B0FF] hover:text-white'
        }`}
      >
        {mode === 'reels' && (
          <motion.div
            layoutId="modeHighlight"
            className="absolute inset-0 rounded-full bg-[#FF9933] border border-[#FFD700]"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <Film className="w-3.5 h-3.5 relative z-10 stroke-[2.5]" />
        <span className="relative z-10 font-black">ਰੀਲਜ਼ · Reels</span>
      </button>

      <button
        id="mode-btn-flashcards"
        type="button"
        onClick={() => handleSwitch('flashcards')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-colors ${
          mode === 'flashcards'
            ? 'text-[#00174D]'
            : 'text-[#88B0FF] hover:text-white'
        }`}
      >
        {mode === 'flashcards' && (
          <motion.div
            layoutId="modeHighlight"
            className="absolute inset-0 rounded-full bg-[#FF9933] border border-[#FFD700]"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <Layers className="w-3.5 h-3.5 relative z-10 stroke-[2.5]" />
        <span className="relative z-10 font-black">ਕਾਰਡਜ਼ · Deck</span>
      </button>
    </div>
  );
};

