import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Pill, Phone, Hospital, Clock } from 'lucide-react';

interface MedicalHistoryProps {
  userId: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'doctor_visit': return <Stethoscope className="w-5 h-5 text-blue-600" />;
    case 'medicine_order': return <Pill className="w-5 h-5 text-emerald-600" />;
    case 'emergency': return <Phone className="w-5 h-5 text-red-600" />;
    default: return <Hospital className="w-5 h-5 text-slate-600" />;
  }
};

const getIconBg = (type: string) => {
  switch (type) {
    case 'doctor_visit': return 'bg-blue-100';
    case 'medicine_order': return 'bg-emerald-100';
    case 'emergency': return 'bg-red-100';
    default: return 'bg-slate-100';
  }
};

/** FIX 3: Build a clean one-line description with no status badges */
const getCardTitle = (record: any): string => {
  const pd = record.providerData || {};
  switch (record.type) {
    case 'doctor_visit': {
      const name = record.targetName || pd.name || 'Doctor';
      return `Appointment with Dr. ${name.replace(/^Dr\.?\s*/i, '')}`;
    }
    case 'medicine_order': {
      const medicine = record.targetName || pd.name || 'Medicine';
      const store = pd.store || 'Pharmacy';
      return `Ordered ${medicine} from ${store}`;
    }
    case 'emergency': {
      const service = record.targetName || 'Ambulance Service';
      return `Emergency — ${service}`;
    }
    default:
      return record.targetName || 'Medical Record';
  }
};

const getCardDescription = (record: any): string => {
  const pd = record.providerData || {};
  switch (record.type) {
    case 'doctor_visit': {
      // Use details field or build from providerData
      if (record.details && !record.details.includes(' - ')) return record.details;
      const speciality = pd.speciality || '';
      const hospital = pd.hospital || '';
      if (speciality && hospital) return `${speciality} · ${hospital}`;
      if (speciality) return speciality;
      return record.details || '';
    }
    case 'medicine_order': {
      const purpose = pd.purpose || pd.name || '';
      return purpose ? `For: ${purpose}` : (record.details || '');
    }
    case 'emergency': {
      return record.details || 'Emergency medical assistance dispatched';
    }
    default:
      return record.details || '';
  }
};

const formatDate = (ts: any) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MedicalHistory: React.FC<MedicalHistoryProps> = ({ userId }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Show confirmed / non-pending / non-document records
      setRecords(all.filter((r) => r.status !== 'pending_confirmation' && r.type !== 'medical_document'));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-slate-100" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-slate-100 text-center shadow-sm mt-4"
      >
        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 border border-slate-100">
          <Hospital className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="font-bold text-slate-700 mb-1">No records yet</h3>
        <p className="text-sm text-slate-500">Confirm pending bookings or consult with Heal U AI.</p>
      </motion.div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <AnimatePresence>
        {records.map((record, idx) => {
          const needsFollowUp = record.followedUp === false
            && record.followUpDate
            && new Date(record.followUpDate).getTime() <= Date.now();

          const title = getCardTitle(record);
          const description = getCardDescription(record);

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 shadow-sm"
            >
              <div className={`p-2.5 rounded-xl ${getIconBg(record.type)} shrink-0`}>
                {getIcon(record.type)}
              </div>
              <div className="flex-1 min-w-0">
                {/* Title — NO status badge */}
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{title}</h4>
                {/* One-line description */}
                {description ? (
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{description}</p>
                ) : null}
                {/* Date row + follow-up indicator */}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-slate-400 font-medium">{formatDate(record.createdAt)}</p>
                  {needsFollowUp && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-600">Follow-up Due</span>
                    </div>
                  )}
                  {record.followedUp && (
                    <span className="text-[10px] font-bold text-emerald-600">✓ Followed Up</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default MedicalHistory;
