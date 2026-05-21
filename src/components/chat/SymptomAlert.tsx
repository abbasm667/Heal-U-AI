import React from 'react';
import { AlertCircle, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';

interface SymptomAlertProps {
  pattern: string;
}

const SymptomAlert: React.FC<SymptomAlertProps> = ({ pattern }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm w-full max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 p-2 rounded-xl shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-heading font-bold text-amber-900 tracking-tight">Pattern Detected</h4>
          <p className="text-amber-800 text-sm mt-1 mb-3 leading-relaxed">
            {pattern}
          </p>
          {/* We do not implement a complex route here, just styling the alert per specs. The user said: With a "Find Specialist" action button. I'll add a dummy button that could theoretically trigger the doctor search. */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-amber-700 border border-amber-200 rounded-xl text-sm font-bold shadow-sm hover:bg-amber-100 transition-colors">
            <Stethoscope className="w-4 h-4" />
            Find Specialist
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SymptomAlert;
