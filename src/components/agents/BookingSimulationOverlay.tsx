import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, MapPin, X, Calendar, Truck, AlertCircle } from 'lucide-react';

interface BookingSimulationOverlayProps {
  activeBooking: { type: 'doctor_visit' | 'medicine_order'; data: any } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const BookingSimulationOverlay: React.FC<BookingSimulationOverlayProps> = ({
  activeBooking,
  onCancel,
  onConfirm,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState('');

  // Generate a random mock time when the overlay opens
  useEffect(() => {
    if (activeBooking) {
      setIsConfirming(false);
      setIsSuccess(false);

      if (activeBooking.type === 'doctor_visit') {
        const days = ['Tomorrow', 'Wednesday', 'Thursday', 'Friday'];
        const randomDay = days[Math.floor(Math.random() * days.length)];
        const hours = ['10:00 AM', '11:30 AM', '02:15 PM', '04:00 PM', '06:30 PM'];
        const randomHour = hours[Math.floor(Math.random() * hours.length)];
        setSimulatedTime(`${randomDay} at ${randomHour}`);
      } else {
        const hours = ['Today, 4:00 PM', 'Today, 6:30 PM', 'Tomorrow, 10:00 AM', 'Tomorrow, 12:00 PM'];
        const randomHour = hours[Math.floor(Math.random() * hours.length)];
        setSimulatedTime(randomHour);
      }
    }
  }, [activeBooking]);

  if (!activeBooking) return null;

  const { type, data } = activeBooking;
  const isDoctor = type === 'doctor_visit';

  const handleConfirmClick = () => {
    setIsConfirming(true);
    // Simulate processing delay
    setTimeout(() => {
      setIsConfirming(false);
      setIsSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        onConfirm();
      }, 2500);
    }, 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="booking-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden relative"
        >
          {/* Close button */}
          {!isConfirming && !isSuccess && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header area */}
          <div className={`pt-8 pb-6 px-6 text-center ${isDoctor ? 'bg-blue-50/50' : 'bg-emerald-50/50'}`}>
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg mb-4 ${
              isDoctor ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-600 shadow-emerald-200'
            }`}>
              {isDoctor ? (
                <span className="text-2xl">👨‍⚕️</span>
              ) : (
                <span className="text-2xl">💊</span>
              )}
            </div>
            
            {!isSuccess ? (
              <>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                  {isDoctor ? 'Book Appointment' : 'Confirm Order'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Please review the details below
                </p>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-emerald-600">Booking Confirmed!</h3>
                <p className="text-sm text-slate-500 mt-1">Added to your medical records</p>
              </motion.div>
            )}
          </div>

          {/* Details Card */}
          <div className="px-6 py-6 bg-white">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
              <h4 className="font-bold text-slate-900 text-base">{data.name}</h4>
              
              <div className="mt-3 space-y-2">
                {isDoctor ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      <span>{data.speciality}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{data.hospital}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{data.store}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium">Type:</span> {data.type}
                    </div>
                  </>
                )}
                
                {/* Simulated Timing */}
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50/50 p-2 rounded-lg mt-3">
                  {isDoctor ? <Calendar className="w-4 h-4 text-blue-500" /> : <Truck className="w-4 h-4 text-blue-500" />}
                  <span>{isDoctor ? 'Slot' : 'Est. Delivery'}: {simulatedTime}</span>
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                  <span className="text-sm text-slate-500">Estimated Cost</span>
                  <span className="font-bold text-slate-900">{data.fee || 'Rs. 850'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isSuccess && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmClick}
                  disabled={isConfirming}
                  className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isConfirming 
                      ? 'bg-slate-400 cursor-wait' 
                      : isDoctor ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {isConfirming ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Yes, {isDoctor ? 'Book Appointment' : 'Confirm Order'}
                    </>
                  )}
                </button>
                {!isConfirming && (
                  <button
                    onClick={onCancel}
                    className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookingSimulationOverlay;
