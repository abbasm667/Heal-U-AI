import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Activity, CalendarDays, ChevronRight, Clock } from 'lucide-react';
import HealthReportView from '../components/health/HealthReportView.js';
import { API_BASE } from '../lib/api.js';
import { useDesktopLayout } from '../lib/environment.js';

interface HealthPageProps {
  userId: string;
  userProfile: any;
}

const PERIODS = [
  { label: 'Last 24 Hours', days: 1, icon: Clock },
  { label: 'Last 7 Days', days: 7, icon: CalendarDays },
  { label: 'Last 30 Days', days: 30, icon: CalendarDays },
  { label: 'Last 365 Days', days: 365, icon: CalendarDays },
];

const LoadingAnimation: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-slate-100 shadow-sm"
  >
    <div className="relative w-24 h-24 flex items-center justify-center mb-6">
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        className="absolute inset-0 bg-blue-100 rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
        className="absolute inset-3 bg-blue-200 rounded-full"
      />
      <Heart className="w-10 h-10 text-blue-600 relative z-10" fill="currentColor" />
    </div>
    <motion.p
      animate={{ opacity: [1, 0.5, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="font-bold text-slate-900 text-lg tracking-tight"
    >
      Heal U is analyzing your health data...
    </motion.p>
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">
      Reviewing all medical records & history
    </p>
  </motion.div>
);

const HealthPage: React.FC<HealthPageProps> = ({ userId, userProfile }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[1]); // default: 7 days
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [pastReports, setPastReports] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showPastReports, setShowPastReports] = useState(false);
  const isDesktop = useDesktopLayout();

  // Load past reports
  useEffect(() => {
    const fetchPast = async () => {
      try {
        const q = query(
          collection(db, `users/${userId}/healthReports`),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        setPastReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Failed to load past reports', e);
      }
    };
    fetchPast();
  }, [userId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setReport(null);
    setError('');

    try {
      // Collect all data
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - selectedPeriod.days);

      // Medical records within period
      const recordsSnap = await getDocs(
        query(collection(db, `users/${userId}/medicalRecords`), orderBy('createdAt', 'desc'))
      );
      const allRecords = recordsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      const periodRecords = allRecords.filter((r) => {
        const ts = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return ts >= cutoff;
      });

      // Medical documents metadata
      const documents = allRecords.filter((r) => r.type === 'medical_document').map((r) => ({
        caseName: r.caseName || r.targetName || r.fileName,
        details: r.details,
        createdAt: r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt,
      }));

      // Chat summaries — gather recent messages across all chats
      const chatsSnap = await getDocs(
        query(collection(db, `users/${userId}/chats`), orderBy('lastMessageAt', 'desc'), limit(5))
      );
      const chatSummaries: string[] = [];
      for (const chatDoc of chatsSnap.docs) {
        const msgsSnap = await getDocs(
          query(
            collection(db, `users/${userId}/chats/${chatDoc.id}/messages`),
            orderBy('timestamp', 'desc'),
            limit(10)
          )
        );
        const msgs = msgsSnap.docs.map((d) => d.data()).filter((m) => m.role === 'user');
        if (msgs.length > 0) {
          chatSummaries.push(...msgs.map((m) => m.content as string));
        }
      }

      const { generateHealthReport } = await import('../services/ai/healthReportService.js');
      const data = await generateHealthReport({
        userData: userProfile,
        medicalRecords: periodRecords.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt,
        })),
        documents,
        chatSummaries: chatSummaries.slice(0, 20),
        period: selectedPeriod.label,
      });

      // Save report to Firestore
      await addDoc(collection(db, `users/${userId}/healthReports`), {
        ...data,
        period: selectedPeriod.label,
        createdAt: serverTimestamp(),
      });

      setReport(data);
    } catch (e: any) {
      console.error('Health report generation failed:', e);
      setError(e.message || 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className={isDesktop ? "max-w-2xl mx-auto px-8 py-8 space-y-6" : "max-w-lg mx-auto px-4 pt-6 pb-12 space-y-6"}>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg mb-4"
          >
            <Heart className="w-8 h-8 text-white" fill="white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900">My Health Report</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            AI-powered health analysis based on your complete medical profile
          </p>
        </div>

        {/* Period Selector */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-700 mb-3 ml-1">
            Analysis Period
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PERIODS.map((period) => {
              const Icon = period.icon;
              const active = selectedPeriod.days === period.days;
              return (
                <motion.button
                  key={period.days}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedPeriod(period); setReport(null); }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-blue-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold leading-tight">{period.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
        >
          {generating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Activity className="w-5 h-5" />
              Generate Health Report
            </>
          )}
        </motion.button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Loading Animation */}
        {generating && <LoadingAnimation />}

        {/* Report */}
        {report && !generating && <HealthReportView report={report} />}

        {/* Past Reports */}
        {!report && !generating && pastReports.length > 0 && (
          <div>
            <button
              onClick={() => setShowPastReports(!showPastReports)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors mb-3"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${showPastReports ? 'rotate-90' : ''}`} />
              Past Reports ({pastReports.length})
            </button>

            <AnimatePresence>
              {showPastReports && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {pastReports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setReport(r)}
                      className="w-full flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-4 py-3 hover:border-blue-100 transition-all active:scale-[0.98]"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{r.period} Report</p>
                        <p className="text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white"
                          style={{
                            background: r.healthScore >= 80 ? '#22c55e'
                              : r.healthScore >= 60 ? '#eab308'
                              : r.healthScore >= 40 ? '#f97316' : '#ef4444',
                          }}
                        >
                          {r.healthScore}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
};

export default HealthPage;
