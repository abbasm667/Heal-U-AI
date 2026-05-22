import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, addDoc, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarCheck, CheckCircle, Clock, Stethoscope, Pill,
  ExternalLink, XCircle, ChevronDown, ChevronUp, MapPin, Activity
} from 'lucide-react';
import BookingSimulationOverlay from '../components/agents/BookingSimulationOverlay.js';
import { useDesktopLayout } from '../lib/environment.js';

interface FollowUpsPageProps {
  userId: string;
}

// Demo: 3 min for doctor, 2 min for medicine
const DOCTOR_FOLLOWUP_MS = 3 * 60 * 1000;
const MEDICINE_FOLLOWUP_MS = 2 * 60 * 1000;

const FollowUpsPage: React.FC<FollowUpsPageProps> = ({ userId }) => {
  const [activeRecords, setActiveRecords] = useState<any[]>([]);
  const [completedRecords, setCompletedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const isDesktop = useDesktopLayout();

  // New Simulation state
  const [activeBooking, setActiveBooking] = useState<{ type: 'doctor_visit' | 'medicine_order'; data: any } | null>(null);
  const [currentFollowUpRecord, setCurrentFollowUpRecord] = useState<any>(null);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      where('followedUp', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const due = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((r) => r.followUpDate && new Date(r.followUpDate).getTime() <= now);
      setActiveRecords(due);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      where('followedUp', '==', true)
    );
    const unsub = onSnapshot(q, (snap) => {
      const completed = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((r) => r.followUpDate);
      setCompletedRecords(completed.sort((a, b) => {
        const at = a.updatedAt?.toDate?.()?.getTime() ?? 0;
        const bt = b.updatedAt?.toDate?.()?.getTime() ?? 0;
        return bt - at;
      }));
    });
    return () => unsub();
  }, [userId]);

  const clearNotifications = useCallback(async (recordId: string) => {
    try {
      const notifSnap = await getDocs(
        query(
          collection(db, `users/${userId}/notifications`),
          where('recordId', '==', recordId)
        )
      );
      for (const notifDoc of notifSnap.docs) {
        await updateDoc(notifDoc.ref, { read: true });
      }
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  }, [userId]);

  const markFollowedUp = useCallback(async (record: any, completedDetails: string) => {
    await updateDoc(doc(db, `users/${userId}/medicalRecords`, record.id), {
      followedUp: true,
      completedDetails,
      updatedAt: serverTimestamp(),
    });
    await clearNotifications(record.id);
  }, [userId, clearNotifications]);

  const handleDismiss = useCallback(async (record: any) => {
    const isDoctor = record.type === 'doctor_visit';
    const details = isDoctor
      ? `Follow-up completed. No further action needed for ${record.targetName}.`
      : `Medication course for ${record.targetName} completed successfully.`;
    await markFollowedUp(record, details);
  }, [markFollowedUp]);

  const handleContinueFollowUp = useCallback((record: any) => {
    setCurrentFollowUpRecord(record);
    setActiveBooking({
      type: record.type,
      data: record.providerData || { 
        name: record.targetName, 
        store: 'Pharmacy', 
        speciality: 'Follow-up Consultation',
        hospital: 'Heal U Network'
      },
    });
  }, []);

  const handleBookingConfirm = async () => {
    if (!currentFollowUpRecord) return;
    const record = currentFollowUpRecord;
    
    const isDoctor = record.type === 'doctor_visit';
    const followUpMs = isDoctor ? DOCTOR_FOLLOWUP_MS : MEDICINE_FOLLOWUP_MS;
    const newFollowUpDate = new Date(Date.now() + followUpMs).toISOString();

    // Mark old record as complete
    await markFollowedUp(record, isDoctor
      ? `Follow-up appointment with ${record.targetName} booked successfully.`
      : `Reordered ${record.targetName} successfully.`
    );

    // Create new confirmed record for the follow up
    await addDoc(collection(db, `users/${userId}/medicalRecords`), {
      type: record.type,
      targetName: record.targetName,
      caseName: record.caseName || null,
      details: isDoctor
        ? `Follow-up appointment with ${record.targetName}`
        : `Reorder of ${record.targetName}`,
      status: 'Confirmed',
      followUpDate: newFollowUpDate,
      followedUp: false,
      providerData: record.providerData || null,
      createdAt: serverTimestamp(),
    });

    setActiveBooking(null);
    setCurrentFollowUpRecord(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-PK', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50">
      <div className={isDesktop ? "max-w-4xl mx-auto px-8 py-6 space-y-8" : "max-w-xl mx-auto px-5 pt-8 pb-16 space-y-8"}>

        {/* Premium Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm mb-4"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Care</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Your follow-ups & health tracking</p>
            </div>
          </div>
          {/* Subtle background glow */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        </motion.div>

        {/* Active Follow-Ups List */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-sm shadow-indigo-300" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Pending Actions {activeRecords.length > 0 && `(${activeRecords.length})`}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl h-40 animate-pulse border border-slate-100 shadow-sm" />
              ))}
            </div>
          ) : activeRecords.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-10 flex flex-col items-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.02)]"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-5"
              >
                <CalendarCheck className="w-10 h-10 text-indigo-400" />
              </motion.div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 tracking-tight">You're all caught up!</h3>
              <p className="text-sm text-slate-500 max-w-[250px] leading-relaxed">
                No active follow-ups right now. They'll automatically appear here when it's time to check in.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-5">
              <AnimatePresence>
                {activeRecords.map((record) => {
                  const isDoctor = record.type === 'doctor_visit';

                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
                    >
                      {/* Premium Header */}
                      <div className={`px-6 py-5 border-b border-slate-100/50 ${
                        isDoctor ? 'bg-gradient-to-r from-blue-50/80 to-transparent' : 'bg-gradient-to-r from-emerald-50/80 to-transparent'
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                            isDoctor ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {isDoctor ? <Stethoscope className="w-6 h-6" /> : <Pill className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                              isDoctor ? 'text-blue-500' : 'text-emerald-500'
                            }`}>
                              {isDoctor ? 'Specialist Follow-Up' : 'Medication Refill'}
                            </p>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">
                              {record.targetName}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="px-6 py-5">
                        <p className="text-[15px] text-slate-600 leading-relaxed mb-5">
                          {isDoctor
                            ? `It's time to check in on your previous appointment. Would you like to schedule a follow-up?`
                            : `Your medication supply might be running low. Do you need to reorder this medicine?`
                          }
                        </p>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleContinueFollowUp(record)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] ${
                              isDoctor
                                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {isDoctor ? 'Book Follow-Up' : 'Reorder Now'}
                          </button>
                          <button
                            onClick={() => handleDismiss(record)}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-[0.98]"
                          >
                            <XCircle className="w-4 h-4" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Completed Follow-Ups */}
        {completedRecords.length > 0 && (
          <div className="pt-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors mb-4 px-2"
            >
              {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Past History ({completedRecords.length})
            </button>
            <AnimatePresence>
              {showCompleted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {completedRecords.map((record, idx) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-white rounded-2xl border border-slate-200/60 p-4 flex items-start gap-4 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-slate-800 truncate">{record.targetName}</p>
                        <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                          {record.completedDetails || `Completed on ${formatDate(record.followUpDate)}`}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>

      <BookingSimulationOverlay
        activeBooking={activeBooking}
        onCancel={() => {
          setActiveBooking(null);
          setCurrentFollowUpRecord(null);
        }}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
};

export default FollowUpsPage;
