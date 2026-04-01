import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-[84px] left-1/2 -translate-x-1/2 bg-app-text text-white px-5 py-3 rounded-[26px] text-sm font-semibold z-[9000] whitespace-nowrap max-w-[90%] shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
