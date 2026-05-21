import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Check, Stethoscope, Pill } from 'lucide-react';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';

interface ConfirmationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRecords: any[];
  userId: string;
}

const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  isOpen, onClose, pendingRecords, userId,
}) => {
  const handleConfirm = async (recordId: string, type: string, confirmed: boolean) => {
    if (confirmed) {
      // ── Follow-up Timing ──────────────────────────────────────────────────
      // TEMPORARY FOR DEMO/TESTING — change back to production values before launch:
      //   Doctor:   Original = 28 days  →  Testing = 3 minutes
      //   Medicine: Original = 6 days   →  Testing = 2 minutes
      const DOCTOR_FOLLOWUP_MS   = 3 * 60 * 1000;  // 3 min  (prod: 28 * 24 * 60 * 60 * 1000)
      const MEDICINE_FOLLOWUP_MS = 2 * 60 * 1000;  // 2 min  (prod: 6  * 24 * 60 * 60 * 1000)

      const followUpDate = new Date(
        Date.now() + (type === 'doctor_visit' ? DOCTOR_FOLLOWUP_MS : MEDICINE_FOLLOWUP_MS)
      );
      console.log(`[ConfirmationPanel] Confirming ${type}. Follow-up scheduled at:`, followUpDate.toISOString());
      await updateDoc(doc(db, `users/${userId}/medicalRecords`, recordId), {
        status: type === 'doctor_visit' ? 'Scheduled' : 'Processing',
        confirmedByUser: true,
        followUpDate: followUpDate.toISOString(),
        followedUp: false,
      });
    } else {
      await deleteDoc(doc(db, `users/${userId}/medicalRecords`, recordId));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Slide-in panel from left */}
          <motion.div
            initial={{ x: -340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Pending Confirmations</h3>
                <p className="text-xs text-slate-400 mt-0.5">{pendingRecords.length} action{pendingRecords.length !== 1 ? 's' : ''} needed</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {pendingRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No pending confirmations.</p>
                </div>
              ) : (
                pendingRecords.map((record) => {
                  const isDoctor = record.type === 'doctor_visit';
                  const details = record.providerData || {};
                  return (
                    <motion.div
                      key={record.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-amber-50 rounded-2xl p-4 border border-amber-200/70"
                    >
                      {/* Question */}
                      <div className="flex items-center gap-2 mb-3">
                        <HelpCircle className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                        <p className="text-xs font-bold text-amber-800">
                          {isDoctor ? 'Did you book this appointment?' : 'Did you order this medicine?'}
                        </p>
                      </div>

                      {/* Info card */}
                      <div className="bg-white rounded-xl p-3 mb-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1.5 rounded-lg ${isDoctor ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                            {isDoctor
                              ? <Stethoscope className="w-4 h-4 text-blue-600" />
                              : <Pill className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">{record.targetName}</h4>
                        </div>
                        <p className="text-xs text-slate-500">{record.details}</p>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirm(record.id, record.type, true)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Yes
                        </button>
                        <button
                          onClick={() => handleConfirm(record.id, record.type, false)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-200"
                        >
                          No
                        </button>
                        <button
                          className="flex-1 py-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          Later 🕐
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationPanel;
