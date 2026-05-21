import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, deleteDoc, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MessageCircle, Trash2, Pencil, Check, X } from 'lucide-react';

interface ConsultationListPageProps {
  userId: string;
}

const ConsultationListPage: React.FC<ConsultationListPageProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/chats`),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleNew = async () => {
    setCreating(true);
    try {
      const now = new Date();
      const name = `Consultation — ${now.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      const ref = await addDoc(collection(db, `users/${userId}/chats`), {
        name,
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      });
      navigate(`/consultation/${ref.id}`);
    } catch (e) {
      console.error('Failed to create chat', e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this consultation? This cannot be undone.')) return;
    await deleteDoc(doc(db, `users/${userId}/chats`, chatId));
  };

  const startRename = (e: React.MouseEvent, chat: any) => {
    e.stopPropagation();
    setRenamingId(chat.id);
    setRenameValue(chat.name || '');
  };

  const confirmRename = async (chatId: string) => {
    if (renameValue.trim()) {
      await updateDoc(doc(db, `users/${userId}/chats`, chatId), { name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString('en-PK', { weekday: 'short' });
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
            {/* Change 2: text-slate-600 instead of slate-400 */}
            <p className="text-sm text-slate-600 mt-0.5">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleNew}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200/60 disabled:opacity-60 pulse-attention"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Chat
          </motion.button>
        </div>

        {/* Chat List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 text-center shadow-lg shadow-slate-100/80"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mb-4"
            >
              {/* Change 2: text-blue-500 instead of text-blue-300 */}
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </motion.div>
            <h3 className="font-bold text-slate-900 mb-1">No consultations yet</h3>
            <p className="text-sm text-slate-500 mb-5">Start a new chat with your AI medical partner</p>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors active:scale-95 shadow-md shadow-blue-200/60"
            >
              <Plus className="w-4 h-4" /> Start First Chat
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {chats.map((chat, idx) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => renamingId !== chat.id && navigate(`/consultation/${chat.id}`)}
                  // Change 3: removed border-l-4 colored borders, clean white card
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all active:scale-[0.98] active:bg-slate-50"
                >
                  {/* Change 3: chat bubble icon in text-blue-500 */}
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {renamingId === chat.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename(chat.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="flex-1 text-sm font-bold border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ring-blue-200"
                        />
                        <button onClick={() => confirmRename(chat.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRenamingId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Change 3: chat name font-semibold text-base */}
                        <p className="text-base font-semibold text-slate-900 truncate">{chat.name || 'Consultation'}</p>
                        {/* Change 3: preview text-slate-500 instead of text-slate-400 */}
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {chat.lastMessage || 'No messages yet'}
                        </p>
                      </>
                    )}
                  </div>

                  {renamingId !== chat.id && (
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Change 3: timestamp text-slate-500 */}
                      <p className="text-xs font-medium text-slate-500">{formatTime(chat.lastMessageAt)}</p>
                      <div className="flex gap-1">
                        {/* Change 3: icons text-slate-400 hover:text-slate-600 (not slate-300) */}
                        <button
                          onClick={(e) => startRename(e, chat)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, chat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationListPage;
