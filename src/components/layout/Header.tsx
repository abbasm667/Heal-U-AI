import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hospital, Bell, Stethoscope, Heart, ClipboardList, HelpCircle, CheckCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, query, orderBy, onSnapshot, updateDoc, doc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { useDesktopLayout } from '../../lib/environment.js';

interface AppHeaderProps {
  userProfile: any;
  userId: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ userProfile, userId }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const isDesktop = useDesktopLayout();
  const isMobile = !isDesktop;
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Real-time notifications
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, `users/${userId}/notifications`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userId]);

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobile]);

  // Prevent body scroll when mobile panel is open
  useEffect(() => {
    if (isMobile && notifOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, notifOpen]);

  const handleNotifClick = async (notif: any) => {
    await updateDoc(doc(db, `users/${userId}/notifications`, notif.id), { read: true });
    setNotifOpen(false);
    if (notif.type === 'follow_up') navigate('/followups');
    else if (notif.actionUrl) navigate(notif.actionUrl);
  };

  const handleClearAll = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) =>
      batch.update(doc(db, `users/${userId}/notifications`, n.id), { read: true })
    );
    await batch.commit();
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'health_report': return <Heart className="w-4 h-4 text-red-500" />;
      case 'follow_up':     return <Stethoscope className="w-4 h-4 text-blue-500" />;
      case 'medicine':      return <ClipboardList className="w-4 h-4 text-emerald-500" />;
      default:              return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getNotifBg = (type: string) => {
    switch (type) {
      case 'health_report': return 'bg-red-50';
      case 'follow_up':     return 'bg-blue-50';
      case 'medicine':      return 'bg-emerald-50';
      default:              return 'bg-slate-100';
    }
  };

  const formatRelativeTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1)    return 'Just now';
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const getInitial = (name?: string) => (name ? name.charAt(0).toUpperCase() : 'U');

  // ── Shared notification list content ────────────────────────────────────────
  const NotifList = () => (
    <>
      {notifications.length === 0 ? (
        <div className="py-10 text-center">
          <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No notifications yet</p>
          <p className="text-xs text-slate-400 mt-1">Follow-up reminders &amp; health updates appear here</p>
        </div>
      ) : (
        <div className="space-y-2 px-4 pb-6">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] ${!notif.read ? 'bg-blue-50/50' : 'bg-white'}`}
            >
              <div className="flex items-start gap-3">
                {/* Icon with unread dot */}
                <div className="relative shrink-0 mt-0.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${getNotifBg(notif.type)}`}>
                    {getNotifIcon(notif.type)}
                  </div>
                  {!notif.read && (
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{notif.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400">{formatRelativeTime(notif.createdAt)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNotifClick(notif); }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ── App Header Bar ── */}
      <header
        className={isDesktop ? "fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 h-16" : "fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between"}
        style={isDesktop ? undefined : {
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity active:scale-95"
        >
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg" style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: '0 0 16px rgba(59,130,246,0.4)',
          }}>
            <Hospital className="text-white w-5 h-5" />
          </div>
          <span className={isDesktop ? "text-xl font-bold text-slate-900 ml-1" : "text-lg font-bold text-white tracking-tight"}>Heal U</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Bell button */}
          <div className="relative" ref={desktopDropdownRef}>
            <button
              id="notif-bell-btn"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative w-10 h-10 flex items-center justify-center rounded-2xl transition-colors"
              style={isDesktop ? { background: 'rgba(0,0,0,0.04)' } : { background: 'rgba(255,255,255,0.08)' }}
            >
              <Bell className={`w-5 h-5 ${isDesktop ? 'text-slate-600' : 'text-slate-300'}`} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] min-h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-lg"
                  style={{ boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </button>

            {/* ── DESKTOP dropdown (z-50, won't be clipped) ──────────────── */}
            {!isMobile && (
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                    style={{ zIndex: 9999, maxHeight: '480px', overflowY: 'auto' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
                      <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Clear all
                        </button>
                      )}
                    </div>
                    <NotifList />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Profile Avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: '0 0 12px rgba(99,102,241,0.4)',
            }}
          >
            {getInitial(userProfile?.displayName)}
          </button>
        </div>
      </header>

      {/* ── MOBILE: backdrop + slide-up panel rendered at ROOT level ────────── */}
      {/* This is OUTSIDE the header element so z-index is never clipped */}
      <AnimatePresence>
        {isMobile && notifOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-notif-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setNotifOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              style={{ zIndex: 9998 }}
            />

            {/* Slide-up panel */}
            <motion.div
              key="mobile-notif-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-y-auto"
              style={{ zIndex: 9999, maxHeight: '70vh' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-300 rounded-full" />
              </div>

              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Clear all
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="pt-3">
                <NotifList />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppHeader;
