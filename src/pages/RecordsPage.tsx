import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Library } from 'lucide-react';
import MedicalHistory from '../components/records/MedicalHistory.js';
import MedicalLibrary from '../components/records/MedicalLibrary.js';
import ConfirmationFAB from '../components/records/ConfirmationFAB.js';
import ConfirmationPanel from '../components/records/ConfirmationPanel.js';

interface RecordsPageProps {
  userId: string;
}

type Section = 'history' | 'library';

const RecordsPage: React.FC<RecordsPageProps> = ({ userId }) => {
  const [activeSection, setActiveSection] = useState<Section>('history');
  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);

  // Live pending count for badge
  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      where('status', '==', 'pending_confirmation')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userId]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-8">

        {/* Premium gradient header behind title */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/60 py-5 -mx-4 -mt-6 px-4 mb-6">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-slate-900">Medical Records</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your complete health history & documents</p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-blue-100/50 rounded-2xl flex items-center justify-center pointer-events-none">
            <ClipboardList className="w-8 h-8 text-blue-300" />
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-indigo-100/30 to-transparent pointer-events-none" />
        </div>

        {/* iOS-style Segmented Switcher */}
        <div className="bg-slate-100 p-1 rounded-2xl flex relative mb-6 shadow-inner">
          <motion.div
            className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm border border-slate-200/60"
            style={{
              width: 'calc(50% - 4px)',
            }}
            animate={{
              left: activeSection === 'history' ? '4px' : 'calc(50%)',
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
          <button
            onClick={() => setActiveSection('history')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold rounded-xl relative z-10 transition-colors ${
              activeSection === 'history' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Medical History
          </button>
          <button
            onClick={() => setActiveSection('library')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold rounded-xl relative z-10 transition-colors ${
              activeSection === 'library' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <Library className="w-4 h-4" />
            Medical Library
          </button>
        </div>

        {/* Section Content */}
        <AnimatePresence mode="wait">
          {activeSection === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <MedicalHistory userId={userId} />
            </motion.div>
          ) : (
            <motion.div
              key="library"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MedicalLibrary userId={userId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation FAB (only visible in History section) */}
      {activeSection === 'history' && (
        <ConfirmationFAB
          pendingCount={pendingRecords.length}
          onClick={() => setPanelOpen(true)}
        />
      )}

      {/* Slide-in Confirmation Panel */}
      <ConfirmationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        pendingRecords={pendingRecords}
        userId={userId}
      />
    </div>
  );
};

export default RecordsPage;
