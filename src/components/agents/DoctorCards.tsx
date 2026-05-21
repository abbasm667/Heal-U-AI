import React, { useState, useEffect } from 'react';
import { Stethoscope, MapPin, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { API_BASE } from '../../lib/api.js';

interface DoctorCardsProps {
  speciality: string;
  userCity: string;
  onLinkClick: (doctor: any, url: string) => void;
}

const DoctorCards: React.FC<DoctorCardsProps> = ({ speciality, userCity, onLinkClick }) => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { searchDoctors } = await import('../../services/ai/doctorService.js');
        const data = await searchDoctors(userCity, speciality);
        setDoctors(data.doctors || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [speciality, userCity]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center justify-center min-w-[280px] w-[320px] shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-bold text-slate-500">Searching provider network...</p>
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 snap-x">
      {doctors.map((doc, idx) => {


        return (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col min-w-[280px] w-[320px] shadow-lg shadow-slate-100/80 snap-start shrink-0"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-bold text-slate-900 text-base leading-tight truncate">{doc.name}</h4>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mt-1">{doc.speciality}</p>
              </div>
              <div className="bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                <span className="text-xs font-bold text-slate-600">{doc.experience}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4 flex-1">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{doc.hospital}, {doc.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{doc.qualification}</span>
              </div>
            </div>

            {/* Fee + single Book Appointment button */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consultation Fee</p>
                  <p className="font-bold text-slate-900 text-sm">PKR {doc.fee}</p>
                </div>
              </div>
              <button
                onClick={() => onLinkClick(doc, doc.oladocUrl)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-sm shadow-blue-200 flex items-center justify-center gap-1.5"
              >
                Book Appointment
                <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default DoctorCards;
