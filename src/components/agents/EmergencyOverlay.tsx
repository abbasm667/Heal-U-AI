import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { AlertTriangle, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmergencyOverlayProps {
  active: boolean;
  userCity: string;
  medicalCase: string;
  userId: string;
}

const EmergencyOverlay: React.FC<EmergencyOverlayProps> = ({ active, userCity, medicalCase, userId }) => {
  const [isVisible, setIsVisible] = useState(active);
  const [services, setServices] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasCalled, setHasCalled] = useState(false);

  useEffect(() => {
    setIsVisible(active);
  }, [active]);

  // Fetch Ambulance Services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const q = query(collection(db, 'ambulance_services'));
        const snapshot = await getDocs(q);
        let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Prioritize by city if available
        if (userCity) {
          const formattedCity = userCity.toLowerCase();
          const cityMatch = docs.filter((s: any) => s.city?.toLowerCase() === formattedCity);
          const others = docs.filter((s: any) => s.city?.toLowerCase() !== formattedCity);
          docs = [...cityMatch, ...others];
        }
        
        setServices(docs);
      } catch (err) {
        console.error("Failed to load ambulances", err);
        // Fallback hardcoded if firestore fails
        setServices([{ name: 'Rescue 1122', phoneNumber: '1122' }]);
      }
    };
    if (active) fetchServices();
  }, [active, userCity]);

  const handleCall = () => {
    const service = services[currentIndex];
    if (service?.phoneNumber) {
      window.open(`tel:${service.phoneNumber}`, '_self');
      setHasCalled(true);
    }
  };

  const handleNextService = () => {
    setCurrentIndex((prev) => (prev + 1) % services.length);
    setHasCalled(false); // Reset to show Call button for the next
  };

  const handleResolved = async () => {
    const currentService = services[currentIndex];
    // Auto-save emergency record
    try {
    // TEMPORARY FOR DEMO — Original: 1 day  →  Testing: 1 minute
    // const EMERGENCY_FOLLOWUP_MS = 24 * 60 * 60 * 1000; // 1 day (production)
    const EMERGENCY_FOLLOWUP_MS = 1 * 60 * 1000; // 1 minute (testing)
    const followUpTime = new Date(Date.now() + EMERGENCY_FOLLOWUP_MS);
    console.log('[EmergencyOverlay] Emergency follow-up scheduled at:', followUpTime.toISOString());

      await addDoc(collection(db, `users/${userId}/medicalRecords`), {
        type: 'emergency',
        targetName: currentService?.name || 'Emergency Services',
        details: medicalCase || 'Emergency Call',
        status: 'Resolved',
        createdAt: serverTimestamp(),
        followUpDate: followUpTime.toISOString(),
        followedUp: false
      });
    } catch (e) {
      console.error("Failed to save emergency record", e);
    }

    setIsVisible(false);
  };

  if (!isVisible) return null;

  const currentService = services[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Pulsing Red Background */}
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="absolute inset-0 bg-red-600"
        />

        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full border-4 border-red-600 shadow-clinical flex flex-col items-center text-center"
        >
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">Emergency Detected</h2>
          <p className="text-slate-600 text-sm mb-8">
            Based on your symptoms, we highly recommend calling an ambulance immediately.
          </p>

          {!hasCalled ? (
            <button
              onClick={handleCall}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-md mb-4"
            >
              <Phone className="w-6 h-6 fill-current" />
              Call {currentService?.name || 'Ambulance'} Now
            </button>
          ) : (
            <div className="w-full bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-4">Ambulance Called. Status?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleResolved}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm"
                >
                  Picked Up
                </button>
                <button
                  onClick={handleNextService}
                  className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm"
                >
                  Call Next
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsVisible(false)}
            className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 underline underline-offset-4 mt-2"
          >
            Dismiss and read response
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmergencyOverlay;
