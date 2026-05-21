import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { Hospital, Stethoscope, Pill, Phone, Check, X, Clock, HelpCircle, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MedicalRecordsProps {
  userId: string;
}

const MedicalRecords: React.FC<MedicalRecordsProps> = ({ userId }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleConfirm = async (recordId: string, type: 'doctor_visit' | 'medicine_order', confirmed: boolean) => {
    try {
      if (confirmed) {
        const followUpDate = new Date();
        if (type === 'doctor_visit') {
          // 4 weeks from now (28 days)
          followUpDate.setDate(followUpDate.getDate() + 28);
        } else {
          // 6 days from now
          followUpDate.setDate(followUpDate.getDate() + 6);
        }

        await updateDoc(doc(db, `users/${userId}/medicalRecords`, recordId), {
          status: type === 'doctor_visit' ? 'Scheduled' : 'Processing',
          confirmedByUser: true,
          followUpDate: followUpDate.toISOString(),
          followedUp: false
        });
      } else {
        await deleteDoc(doc(db, `users/${userId}/medicalRecords`, recordId));
      }
    } catch (e) {
      console.error("Failed to update/delete medical record", e);
    }
  };

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

  const formatDate = (isoString?: string | any) => {
    if (!isoString) return 'Unknown Date';
    let d;
    if (isoString.toDate) {
      d = isoString.toDate();
    } else {
      d = new Date(isoString);
    }
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Split records
  const pendingConfirmations = records.filter(r => r.status === 'pending_confirmation');
  const medicalDocuments = records.filter(r => r.type === 'medical_document');
  const confirmedRecords = records.filter(r => r.status !== 'pending_confirmation' && r.type !== 'medical_document');

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-heading font-bold text-slate-900">Medical Records</h2>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Live Updates Active</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Pending Confirmations Section */}
            <AnimatePresence>
              {pendingConfirmations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2 px-1">
                    <Clock className="w-4 h-4" /> Pending Confirmations ({pendingConfirmations.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingConfirmations.map((record) => {
                       const isDoctor = record.type === 'doctor_visit';
                       const details = record.providerData || {};

                       return (
                        <motion.div
                          key={record.id}
                          layoutId={record.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-amber-50/50 rounded-3xl p-5 border border-amber-200/70 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <HelpCircle className="w-4 h-4 text-amber-600 animate-pulse" />
                              <span className="text-xs font-bold text-amber-800">
                                {isDoctor ? 'Did you book this appointment?' : 'Did you order this medicine?'}
                              </span>
                            </div>

                            {/* Inner Info Card (Read-only) */}
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-heading font-bold text-slate-900 text-base">{record.targetName}</h4>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-0.5">
                                    {isDoctor ? (details.speciality || 'Specialist') : (details.purpose || 'Medication')}
                                  </p>
                                </div>
                                {isDoctor && details.experience && (
                                  <div className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600">
                                    {details.experience}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 font-medium">
                                {isDoctor ? `${details.hospital || 'Hospital'}, ${details.city || 'Karachi'}` : `Store: ${details.store || 'Pharmacy'}`}
                              </p>
                              <p className="text-xs font-bold text-slate-900 mt-2">
                                {isDoctor ? `Fee: PKR {record.fee || details.fee}` : `Price: ${details.price || 'Est. Price'}`}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleConfirm(record.id, record.type, true)}
                              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" /> Yes
                            </button>
                            <button
                              onClick={() => handleConfirm(record.id, record.type, false)}
                              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-slate-200/50"
                            >
                              <X className="w-3.5 h-3.5" /> No
                            </button>
                            <button
                              className="flex-1 py-2 px-3 bg-white hover:bg-amber-50/30 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-bold transition-all active:scale-95 text-center flex items-center justify-center gap-1"
                            >
                              Later 🕐
                            </button>
                          </div>
                        </motion.div>
                       );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Medical Reports & Documents Section */}
            {medicalDocuments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2 px-1">
                  <FileText className="w-4 h-4" /> Medical Reports & Documents ({medicalDocuments.length})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {medicalDocuments.map((docItem) => {
                    const isImage = docItem.documentType?.startsWith('image/');
                    const displayName = docItem.caseName || docItem.targetName || docItem.fileName;

                    return (
                      <motion.div
                        key={docItem.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-start justify-between gap-4"
                      >
                        <div className="flex gap-3 min-w-0 flex-1">
                          {isImage ? (
                            <img 
                              src={docItem.documentUrl} 
                              alt="Thumbnail" 
                              className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0" 
                            />
                          ) : (
                            <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                              <FileText className="w-7 h-7 text-blue-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading font-bold text-slate-900 text-sm truncate leading-snug">{displayName}</h4>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">{docItem.documentType?.split('/')[1] || 'PDF'}</p>
                            <p className="text-xs text-slate-400 font-bold mt-2">{formatDate(docItem.createdAt)}</p>
                          </div>
                        </div>
                        <a 
                          href={docItem.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-3 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-2xl text-slate-600 hover:text-blue-600 transition-colors shrink-0 shadow-sm flex items-center justify-center"
                          title="Download report"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirmed Records Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">
                Your Medical History ({confirmedRecords.length})
              </h3>
              
              {confirmedRecords.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm text-center"
                >
                  <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
                    <Hospital className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">No active records found</h3>
                  <p className="text-sm text-slate-500 max-w-sm">Confirm pending bookings above or consult with Heal U AI to schedule appointments or order medications.</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {confirmedRecords.map((record, idx) => {
                      const needsFollowUp = record.followedUp === false && record.followUpDate && new Date(record.followUpDate).getTime() <= Date.now();
                      return (
                        <motion.div
                          key={record.id}
                          layoutId={record.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-start gap-4 relative overflow-hidden"
                        >
                          <div className={`p-3 rounded-2xl ${getIconBg(record.type)} shrink-0`}>
                            {getIcon(record.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-heading font-bold text-slate-900 text-lg truncate pr-2">{record.targetName}</h4>
                              <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shrink-0">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{record.status}</span>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-slate-600 mb-2 truncate">{record.details}</p>
                            
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-xs font-bold text-slate-400">{formatDate(record.createdAt)}</p>
                              
                              {needsFollowUp ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Action Required</span>
                                </div>
                              ) : record.followedUp ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Followed Up</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecords;
