import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  const toastInfo = useMemo(() => {
    if (!message) return null;
    
    let type: 'success' | 'error' | 'warning' | 'info' = 'info';
    let cleanMessage = message;
    let Icon = Info;
    let colorClass = "bg-slate-800 text-white";
    let iconColor = "text-blue-400";

    if (message.startsWith('✅')) {
      type = 'success';
      cleanMessage = message.replace('✅', '').trim();
      Icon = CheckCircle2;
      colorClass = "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-l-4 border-green-500";
      iconColor = "text-green-500";
    } else if (message.startsWith('❌')) {
      type = 'error';
      cleanMessage = message.replace('❌', '').trim();
      Icon = AlertCircle;
      colorClass = "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-l-4 border-red-500";
      iconColor = "text-red-500";
    } else if (message.startsWith('⚠️')) {
      type = 'warning';
      cleanMessage = message.replace('⚠️', '').trim();
      Icon = AlertTriangle;
      colorClass = "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-l-4 border-amber-500";
      iconColor = "text-amber-500";
    } else if (message.startsWith('⏳') || message.startsWith('ℹ️')) {
      type = 'info';
      cleanMessage = message.replace(/[⏳ℹ️]/, '').trim();
      Icon = Info;
      colorClass = "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-l-4 border-blue-500";
      iconColor = "text-blue-500";
    }

    return { type, cleanMessage, Icon, colorClass, iconColor };
  }, [message]);

  return (
    <AnimatePresence>
      {message && toastInfo && (
        <div className="fixed bottom-[90px] left-0 right-0 flex justify-center pointer-events-none z-[9999] px-4">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl min-w-[280px] max-w-full overflow-hidden",
              toastInfo.colorClass
            )}
          >
            <div className={cn("shrink-0", toastInfo.iconColor)}>
              <toastInfo.Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-sm font-bold leading-tight py-0.5">
              {toastInfo.cleanMessage}
            </div>
            <button 
              onClick={onClose}
              className="shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors opacity-40 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
