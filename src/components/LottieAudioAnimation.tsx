import React, { useEffect } from 'react';
import { useLottie } from 'lottie-react';

// Lightweight vector Lottie JSON for audio sound waves
const soundWaveLottieJson = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 120,
  h: 60,
  nm: 'Audio Waves',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Bar 1',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [25, 30, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 30, 100], h: 1 },
            { t: 15, s: [100, 90, 100], h: 1 },
            { t: 30, s: [100, 45, 100], h: 1 },
            { t: 45, s: [100, 100, 100], h: 1 },
            { t: 60, s: [100, 30, 100], h: 1 },
          ],
        },
      },
      shapes: [
        {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [8, 40] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 4 },
          nm: 'Rectangle',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [1, 0.6, 0.2, 1] }, // #FF9933
          o: { a: 0, k: 100 },
          nm: 'Fill',
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Bar 2',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [45, 30, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 75, 100], h: 1 },
            { t: 15, s: [100, 35, 100], h: 1 },
            { t: 30, s: [100, 100, 100], h: 1 },
            { t: 45, s: [100, 40, 100], h: 1 },
            { t: 60, s: [100, 75, 100], h: 1 },
          ],
        },
      },
      shapes: [
        {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [8, 44] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 4 },
          nm: 'Rectangle',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [1, 0.84, 0, 1] }, // #FFD700
          o: { a: 0, k: 100 },
          nm: 'Fill',
        },
      ],
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'Bar 3',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [65, 30, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 100], h: 1 },
            { t: 15, s: [100, 40, 100], h: 1 },
            { t: 30, s: [100, 85, 100], h: 1 },
            { t: 45, s: [100, 30, 100], h: 1 },
            { t: 60, s: [100, 100, 100], h: 1 },
          ],
        },
      },
      shapes: [
        {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [8, 48] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 4 },
          nm: 'Rectangle',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [1, 0.6, 0.2, 1] }, // #FF9933
          o: { a: 0, k: 100 },
          nm: 'Fill',
        },
      ],
    },
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: 'Bar 4',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [85, 30, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 40, 100], h: 1 },
            { t: 15, s: [100, 95, 100], h: 1 },
            { t: 30, s: [100, 50, 100], h: 1 },
            { t: 45, s: [100, 85, 100], h: 1 },
            { t: 60, s: [100, 40, 100], h: 1 },
          ],
        },
      },
      shapes: [
        {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [8, 38] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 4 },
          nm: 'Rectangle',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [1, 0.84, 0, 1] }, // #FFD700
          o: { a: 0, k: 100 },
          nm: 'Fill',
        },
      ],
    },
  ],
};

interface LottieAudioProps {
  isPlaying: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export const LottieAudioAnimation: React.FC<LottieAudioProps> = ({
  isPlaying,
  className = '',
  width = 64,
  height = 32,
}) => {
  const options = {
    animationData: soundWaveLottieJson,
    loop: true,
    autoplay: isPlaying,
    style: { width: '100%', height: '100%' },
  };

  const lottieInstance = (useLottie as any)(options, { width: '100%', height: '100%' });
  const View = lottieInstance?.View ?? null;

  useEffect(() => {
    if (lottieInstance) {
      if (isPlaying) {
        lottieInstance.play?.();
      } else {
        lottieInstance.pause?.();
      }
    }
  }, [isPlaying, lottieInstance]);

  return (
    <div
      style={{ width, height }}
      className={`flex items-center justify-center overflow-hidden ${className}`}
    >
      {isPlaying ? (
        View
      ) : (
        <div className="flex items-center justify-center gap-1.5 h-full opacity-35">
          <span className="w-1.5 h-1.5 bg-[#FF9933] rounded-full" />
          <span className="w-1.5 h-1.5 bg-[#FFD700] rounded-full" />
          <span className="w-1.5 h-1.5 bg-[#FF9933] rounded-full" />
          <span className="w-1.5 h-1.5 bg-[#FFD700] rounded-full" />
        </div>
      )}
    </div>
  );
};

