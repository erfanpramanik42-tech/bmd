import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
  noPadding?: boolean;
  position?: 'center' | 'top-right' | 'bottom';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'full';
  disableAnimation?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className, 
  hideHeader,
  noPadding,
  position = 'center',
  size = 'md',
  disableAnimation = false
}) => {
  const positionClasses = {
    'center': 'items-center justify-center p-4',
    'top-right': 'items-start justify-end pr-4 pt-18',
    'bottom': 'items-end justify-center'
  };

  const sizeClasses = {
    'xs': 'max-w-[240px]',
    'sm': 'max-w-[320px]',
    'md': 'max-w-[480px]',
    'lg': 'max-w-[600px]',
    'full': 'max-w-full'
  };

  const motionProps = disableAnimation ? {
    initial: { opacity: 1, scale: 1, x: 0, y: 0 },
    animate: { opacity: 1, scale: 1, x: 0, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0 }
  } : {
    initial: position === 'top-right' ? { opacity: 0, scale: 0.95, x: 10, y: -10 } : 
             position === 'bottom' ? { y: '100%' } : 
             { opacity: 0, scale: 0.95, y: 20 },
    animate: position === 'bottom' ? { y: 0 } : 
             { opacity: 1, scale: 1, x: 0, y: 0 },
    exit: position === 'top-right' ? { opacity: 0, scale: 0.95, x: 10, y: -10 } : 
          position === 'bottom' ? { y: '100%' } : 
          { opacity: 0, scale: 0.95, y: 20 },
    transition: { type: 'spring', damping: 25, stiffness: 250 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn("fixed inset-0 z-[500] flex", positionClasses[position])}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={disableAnimation ? { duration: 0 } : {}}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            {...motionProps}
            className={cn(
              'relative w-full bg-white shadow-2xl overflow-hidden max-h-[95vh] flex flex-col',
              position === 'bottom' ? 'rounded-t-[32px]' : 'rounded-[28px]',
              sizeClasses[size],
              className
            )}
          >
            {!hideHeader && (
              <div className="p-4 pb-0 shrink-0">
                <div className="w-10 h-1 bg-app-border/30 rounded-full mx-auto mb-4" />
                {title && (
                  <h2 className="font-serif text-base font-bold mb-4 flex items-center gap-2">
                    {title}
                  </h2>
                )}
              </div>
            )}
            <div className={cn("overflow-y-auto scrollbar-hide flex-1", !noPadding && "p-4 pt-0")}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
