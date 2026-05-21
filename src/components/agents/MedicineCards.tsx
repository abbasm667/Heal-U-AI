import React, { useState, useEffect } from 'react';
import { Pill, ExternalLink, Store, FlaskConical } from 'lucide-react';
import { motion } from 'motion/react';
import { API_BASE } from '../../lib/api.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface AvailableItem {
  name: string;
  genericName: string;
  purpose: string;
  price: string;
  store: string;
  url: string;
  inStock: boolean;
}

interface AlternativeItem {
  name: string;
  genericName: string;
  purpose: string;
  note: string;
}

interface MedicineCardsProps {
  medicine: string;
  onLinkClick: (medicine: any, url: string) => void;
}

// ── Store badge colours ───────────────────────────────────────────────────────

const STORE_COLORS: Record<string, string> = {
  'DVago':         'bg-purple-600 hover:bg-purple-700',
  'Dawaai.pk':     'bg-blue-600   hover:bg-blue-700',
  'MeriPharmacy':  'bg-emerald-600 hover:bg-emerald-700',
  'Sehat.com.pk':  'bg-orange-500  hover:bg-orange-600',
  'Sehat':         'bg-orange-500  hover:bg-orange-600',
};

// ── Component ─────────────────────────────────────────────────────────────────

const MedicineCards: React.FC<MedicineCardsProps> = ({ medicine, onLinkClick }) => {
  const [available, setAvailable]       = useState<AvailableItem[]>([]);
  const [alternatives, setAlternatives] = useState<AlternativeItem[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const fetchMeds = async () => {
      try {
        const { searchMedicine } = await import('../../services/ai/pharmacyService.js');
        const data = await searchMedicine(medicine);
        setAvailable(Array.isArray(data.available) ? data.available : []);
        setAlternatives(Array.isArray(data.alternatives) ? data.alternatives : []);
      } catch (err) {
        console.error('[MedicineCards] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeds();
  }, [medicine]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center justify-center w-full shadow-sm">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-500">Finding medicines on pharmacy sites...</p>
        <p className="text-xs text-slate-400 mt-1">Checking Dawaai, DVago, MeriPharmacy</p>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (available.length === 0 && alternatives.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center shadow-sm">
        <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-500">No medicines found</p>
        <p className="text-xs text-slate-400 mt-1">Try searching by a shorter or generic medicine name</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* ── Available Online ──────────────────────────────────────────────── */}
      {available.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Available Online</p>
          </div>

          {available.map((item, idx) => (
            <motion.div
              key={`avail-${idx}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="bg-emerald-50 p-2 rounded-xl shrink-0">
                  <Pill className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.name}</h4>
                  {item.genericName && (
                    <p className="text-xs text-slate-500 mt-0.5">{item.genericName}</p>
                  )}
                  {item.purpose && (
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{item.purpose}</p>
                  )}
                </div>
                {item.price && item.price !== 'Check site' && (
                  <span className="text-sm font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2 py-1 rounded-lg">
                    {item.price}
                  </span>
                )}
              </div>

              {/* Place Order button — only for available items */}
              <button
                onClick={() => onLinkClick({ name: item.name, store: item.store }, item.url)}
                className={`mt-3 w-full py-2 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  STORE_COLORS[item.store] || 'bg-slate-600 hover:bg-slate-700'
                }`}
              >
                Place Order — {item.store}
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Alternatives ─────────────────────────────────────────────────── */}
      {alternatives.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Alternative Medicines</p>
          </div>

          {alternatives.map((alt, idx) => (
            <motion.div
              key={`alt-${idx}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (available.length + idx) * 0.08 }}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="bg-blue-50 p-2 rounded-xl shrink-0">
                  <FlaskConical className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{alt.name}</h4>
                  {alt.genericName && (
                    <p className="text-xs text-slate-500 mt-0.5">{alt.genericName}</p>
                  )}
                  {alt.purpose && (
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{alt.purpose}</p>
                  )}
                  {alt.note && (
                    <p className="text-xs text-blue-500 mt-1 italic">{alt.note}</p>
                  )}
                </div>
              </div>
              {/* No "Place Order" button — alternatives are info only */}
              <div className="mt-3 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Available at local pharmacies</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
};

export default MedicineCards;
