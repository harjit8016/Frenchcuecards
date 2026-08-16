import React from 'react';
import { AppMode } from '../types';
import { ModeSwitch } from './ModeSwitch';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange }) => {
  return (
    <header className="w-full pt-2.5 pb-1 px-3 max-w-md mx-auto flex items-center justify-center">
      <ModeSwitch mode={mode} onModeChange={onModeChange} />
    </header>
  );
};
