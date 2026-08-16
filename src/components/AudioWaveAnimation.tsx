import React from 'react';
import { motion } from 'motion/react';

interface AudioWaveProps {
  isPlaying: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AudioWaveAnimation: React.FC<AudioWaveProps> = ({
  isPlaying,
  color = '#FF9933',
  size = 'md',
}) => {
  const barHeights = [14, 24, 32, 22, 12];
  const barWidth = size === 'sm' ? 'w-0.5' : size === 'lg' ? 'w-1.5' : 'w-1';
  const maxHeight = size === 'sm' ? 18 : size === 'lg' ? 36 : 26;

  return (
    <div className="flex items-center justify-center gap-1 h-8 px-2" aria-hidden="true">
      {barHeights.map((h, i) => {
        const targetHeight = (h / 32) * maxHeight;
        return (
          <motion.span
            key={i}
            className={`${barWidth} rounded-full`}
            style={{ backgroundColor: color }}
            initial={{ height: 4 }}
            animate={
              isPlaying
                ? {
                    height: [4, targetHeight, 6, targetHeight * 0.8, 4],
                    opacity: [0.7, 1, 0.8, 1, 0.7],
                  }
                : {
                    height: 4,
                    opacity: 0.35,
                  }
            }
            transition={
              isPlaying
                ? {
                    duration: 0.85,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }
                : {
                    duration: 0.3,
                  }
            }
          />
        );
      })}
    </div>
  );
};
