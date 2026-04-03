import React from 'react';
import { cn } from '../lib/utils';
import { Home, Users, Wallet, Landmark, FileText, Settings, User } from 'lucide-react';

export type Page = 'dashboard' | 'members' | 'deposits' | 'loans' | 'reports' | 'settings' | 'mypage' | 'requests';

interface BottomNavProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  role: 'admin' | 'member' | 'super_admin';
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, onPageChange, role }) => {
  const isAdmin = role === 'admin' || role === 'super_admin';

  const navItems = isAdmin ? [
    { id: 'dashboard', icon: Home, label: 'হোম' },
    { id: 'members', icon: Users, label: 'সদস্য' },
    { id: 'deposits', icon: Wallet, label: 'জমা' },
    { id: 'loans', icon: Landmark, label: 'ঋণ' },
    { id: 'reports', icon: FileText, label: 'রিপোর্ট' },
    { id: 'requests', icon: FileText, label: 'অনুরোধ' },
    { id: 'settings', icon: Settings, label: 'সেটিং' },
  ] : [
    { id: 'dashboard', icon: Home, label: 'হোম' },
    { id: 'members', icon: Users, label: 'সদস্যরা' },
    { id: 'deposits', icon: Wallet, label: 'জমা' },
    { id: 'loans', icon: Landmark, label: 'ঋণ' },
    { id: 'mypage', icon: User, label: 'আমার' },
    { id: 'reports', icon: FileText, label: 'রিপোর্ট' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[68px] bg-white flex items-center border-t border-app-border z-200 shadow-[0_-4px_20px_rgba(26,107,60,0.08)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id as Page)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-medium transition-colors relative',
              isActive ? 'text-primary' : 'text-app-text-muted'
            )}
          >
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-md" />
            )}
            <Icon className={cn('w-[22px] h-[22px] transition-transform', isActive && 'scale-112')} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
