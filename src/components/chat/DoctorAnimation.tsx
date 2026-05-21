import React from 'react';
import { motion } from 'motion/react';
import { Stethoscope } from 'lucide-react';

const DoctorAnimation: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 mt-4 mx-auto w-full max-w-sm shadow-clinical">
      <div className="relative w-32 h-32 flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 mb-6">
        
        {/* Wobbling Stethoscope */}
        <motion.div
          animate={{ rotate: [-5, 0, 5, 0, -5], scale: [1, 1.05, 1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="z-10 bg-white p-3 rounded-full shadow-sm"
        >
          <Stethoscope className="w-8 h-8 text-blue-600" />
        </motion.div>

        {/* Floating Clipboard */}
        <motion.div
          animate={{ x: [-10, 10, -10], y: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute -right-4 -top-2 bg-white rounded-xl shadow-clinical border border-slate-200 w-16 h-20 p-2 flex flex-col gap-1.5"
        >
          <div className="h-1 w-4 bg-slate-300 rounded-full mx-auto mb-1" />
          <motion.div animate={{ width: ['40%', '100%', '40%'] }} transition={{ repeat: Infinity, duration: 2 }} className="h-1 bg-slate-200 rounded-full" />
          <motion.div animate={{ width: ['80%', '60%', '80%'] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="h-1 bg-slate-200 rounded-full" />
          <motion.div animate={{ width: ['50%', '90%', '50%'] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.4 }} className="h-1 bg-slate-200 rounded-full" />
        </motion.div>
      </div>

      <motion.p
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="font-heading font-bold text-slate-900 text-lg tracking-tight select-none"
      >
        Heal U is analyzing your case...
      </motion.p>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1 select-none">Connecting with medical knowledge base</p>
    </div>
  );
};

export default DoctorAnimation;
