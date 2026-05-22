import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { motion } from 'motion/react';
import { FileText, Download, Image } from 'lucide-react';

interface MedicalLibraryProps {
  userId: string;
}

const formatDate = (ts: any) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MedicalLibrary: React.FC<MedicalLibraryProps> = ({ userId }) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setDocs(snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((r) => r.type === 'medical_document'));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-slate-100" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-slate-100 text-center shadow-sm mt-4"
      >
        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-blue-200" />
        </div>
        <h3 className="font-bold text-slate-700 mb-1">No documents yet</h3>
        <p className="text-sm text-slate-400">Upload medical reports in your consultation chat.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {docs.map((docItem, idx) => {
        const isImage = docItem.documentType?.startsWith('image/');
        const displayName = docItem.caseName || docItem.targetName || docItem.fileName;
        const fileType = docItem.documentType?.split('/')[1]?.toUpperCase() || 'DOC';

        return (
          <motion.a
            key={docItem.id}
            href={docItem.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-col shadow-sm hover:border-blue-100 hover:shadow-md transition-all active:scale-[0.97] cursor-pointer group"
          >
            {/* Thumbnail or icon */}
            {isImage && docItem.documentUrl ? (
              <div className="w-full h-20 rounded-xl overflow-hidden mb-3 bg-slate-50">
                <img
                  src={docItem.documentUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-20 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                <FileText className="w-8 h-8 text-blue-300" />
              </div>
            )}

            <p className="text-xs font-bold text-slate-900 truncate leading-tight">{displayName}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">{fileType}</span>
              <span className="text-[10px] text-slate-400">{formatDate(docItem.createdAt)}</span>
            </div>
          </motion.a>
        );
      })}
    </div>
  );
};

export default MedicalLibrary;
