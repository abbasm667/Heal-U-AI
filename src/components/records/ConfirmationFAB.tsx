import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, X } from 'lucide-react';

interface ConfirmationFABProps {
  pendingCount: number;
  onClick: () => void;
}

const ConfirmationFAB: React.FC<ConfirmationFABProps> = ({ pendingCount, onClick }) => {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
    >
      <ClipboardCheck className="w-6 h-6" />
      {pendingCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
        >
          {pendingCount > 9 ? '9+' : pendingCount}
        </motion.span>
      )}
    </motion.button>
  );
};

export default ConfirmationFAB;
