import React from 'react';
import { cn } from '../lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, rightElement }) => {
  return (
    <header className="bg-linear-to-br from-primary-dark via-primary to-primary-light p-3 px-4 pb-3.5 sticky top-0 z-100 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="w-[38px] h-[38px] bg-white/15 rounded-xl flex items-center justify-center text-lg">
          🤝
        </div>
        <div className="font-serif text-sm font-bold text-white leading-tight">
          {title}
          {subtitle && <span className="block text-[10px] font-normal opacity-70 font-sans">{subtitle}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightElement}
      </div>
    </header>
  );
};
