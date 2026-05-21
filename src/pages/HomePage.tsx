import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { motion } from 'motion/react';
import { MessageCircle, ArrowRight, PlusCircle } from 'lucide-react';
import FeatureCard from '../components/home/FeatureCard.js';

interface HomePageProps {
  userId: string;
  userProfile: any;
}

const HomePage: React.FC<HomePageProps> = ({ userId, userProfile }) => {
  const navigate = useNavigate();
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(
          collection(db, `users/${userId}/chats`),
          orderBy('lastMessageAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        setRecentChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Failed to load recent chats', e);
      } finally {
        setLoadingChats(false);
      }
    };
    fetch();
  }, [userId]);

  const handleNewChat = async () => {
    const now = new Date();
    const name = `Consultation — ${now.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`;
    const ref = await addDoc(collection(db, `users/${userId}/chats`), {
      name,
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
    });
    navigate(`/consultation/${ref.id}`);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 2880) return 'Yesterday';
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  const firstName = userProfile?.displayName?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-8 space-y-8">

        {/* Greeting — Compact Dark Strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl px-5 py-4"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            boxShadow: '0 4px 20px rgba(15,23,42,0.25)',
          }}
        >
          {/* Subtle animated glow */}
          <motion.div
            animate={{ opacity: [0.12, 0.22, 0.12] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)' }}
          />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-300/70">{greeting},</p>
              <h1 className="text-xl font-extrabold text-white tracking-tight truncate">{firstName} 👋</h1>
              <p className="text-xs text-slate-400 mt-0.5">How can Heal U help you today?</p>
            </div>

            {/* Quick action — Start New Chat */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleNewChat}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 0 12px rgba(59,130,246,0.35)',
              }}
            >
              <PlusCircle className="w-4 h-4" />
              New Chat
            </motion.button>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="space-y-4">
          <FeatureCard
            index={0}
            theme="blue"
            title="Medical Consultation"
            subtitle="Chat with your AI medical partner"
            icon="stethoscope"
            onClick={() => navigate('/consultation')}
          />
          <FeatureCard
            index={1}
            theme="emerald"
            title="Medical Records"
            subtitle="Your complete health history"
            icon="records"
            onClick={() => navigate('/records')}
          />
          <FeatureCard
            index={2}
            theme="amber"
            title="My Health"
            subtitle="Get your AI health report"
            icon="health"
            onClick={() => navigate('/health')}
            featured
          />
          <FeatureCard
            index={3}
            theme="violet"
            title="Follow-Ups"
            subtitle="Track your ongoing care"
            icon="calendar"
            onClick={() => navigate('/followups')}
          />
        </div>

        {/* Recent Conversations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Recent Conversations</h2>
            <button
              onClick={() => navigate('/consultation')}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700"
            >
              See All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loadingChats ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-[72px] animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : recentChats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center text-center shadow-sm"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">No consultations yet</p>
              <p className="text-xs text-slate-400 mb-4">Start a new conversation with your AI medical partner</p>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                New Chat
              </button>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {recentChats.map((chat, idx) => (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  onClick={() => navigate(`/consultation/${chat.id}`)}
                  className="w-full bg-white rounded-2xl border border-slate-100 px-4 py-3.5 flex items-center gap-3 text-left hover:border-blue-100 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{chat.name || 'Consultation'}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 shrink-0">
                    {formatTime(chat.lastMessageAt)}
                  </p>
                </motion.button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default HomePage;
