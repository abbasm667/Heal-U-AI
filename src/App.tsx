import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { auth, db } from './lib/firebase.js';
import { motion } from 'motion/react';

import Auth from './components/auth/Auth.js';
import Onboarding from './components/auth/Onboarding.js';
import AppLayout from './components/layout/AppLayout.js';
import { generateNotificationsOnLogin } from './lib/notifications.js';

// Lazy-load pages for better initial load performance
const HomePage = lazy(() => import('./pages/HomePage.js'));
const ConsultationListPage = lazy(() => import('./pages/ConsultationListPage.js'));
const ConsultationPage = lazy(() => import('./pages/ConsultationPage.js'));
const RecordsPage = lazy(() => import('./pages/RecordsPage.js'));
const HealthPage = lazy(() => import('./pages/HealthPage.js'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.js'));
const FollowUpsPage = lazy(() => import('./pages/FollowUpsPage.js'));

const AppRoboticLoader = () => {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  const statuses = [
    'Initiating construct command...',
    'Deploying foundation base pillars...',
    'Interlocking building wing modules...',
    'Engaging structural roof caps...',
    'Activating core intelligence & vitals...',
    'System ready'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const step = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + step, 100);
      });
    }, 180);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress < 15) setStatusIdx(0);
    else if (progress < 40) setStatusIdx(1);
    else if (progress < 65) setStatusIdx(2);
    else if (progress < 85) setStatusIdx(3);
    else if (progress < 98) setStatusIdx(4);
    else setStatusIdx(5);
  }, [progress]);

  // Determine stage triggers based on progress
  const stageBase = progress >= 15;
  const stageWings = progress >= 40;
  const stageRoof = progress >= 65;
  const stageCross = progress >= 85;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-6" style={{
      background: 'linear-gradient(180deg, #090d16 0%, #03050a 100%)'
    }}>
      {/* Soft Premium Floating Auroras (No Grids) */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [-30, 20, -30],
          y: [-20, 30, -20]
        }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[90px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00f2fe 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.1, 0.2, 0.1],
          x: [40, -10, 40],
          y: [30, -20, 30]
        }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      />

      {/* Cybernetic Pulse ECG Heartbeat Trace (Moving back & forth in background) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none">
        <svg className="w-full h-40 stroke-cyan-500" viewBox="0 0 1000 100" fill="none" strokeWidth="1.5">
          <motion.path
            d="M 0 50 L 300 50 L 320 10 L 340 90 L 360 40 L 370 60 L 380 50 L 700 50 L 720 10 L 740 90 L 760 40 L 770 60 L 780 50 L 1000 50"
            strokeDasharray="1000"
            animate={{ strokeDashoffset: [1000, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
          />
        </svg>
      </div>

      {/* Outer assembly workspace HUD — ENLARGED (w-72 h-72) */}
      <div className="relative w-72 h-72 flex items-center justify-center border border-dashed border-cyan-500/10 rounded-full">
        {/* HUD Lock corners */}
        <div className="absolute top-14 left-14 w-5 h-5 border-t border-l border-cyan-400/20" />
        <div className="absolute top-14 right-14 w-5 h-5 border-t border-r border-cyan-400/20" />
        <div className="absolute bottom-14 left-14 w-5 h-5 border-b border-l border-cyan-400/20" />
        <div className="absolute bottom-14 right-14 w-5 h-5 border-b border-r border-cyan-400/20" />

        {/* Assembling Hospital Transformer Group */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          
          {/* 1. Foundation Base (Slides up and expands) */}
          {stageBase && (
            <motion.div
              initial={{ y: 70, scaleX: 0.2, opacity: 0 }}
              animate={{ y: 36, scaleX: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 12 }}
              className="absolute bottom-0 w-36 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md border border-cyan-400/20 flex justify-around items-center px-3"
            >
              <div className="w-2 h-2 bg-cyan-300 rounded-full animate-ping" />
              <div className="w-2 h-2 bg-cyan-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
            </motion.div>
          )}

          {/* 2. Left Wing Structure (Folds and slides in from left) */}
          {stageWings && (
            <motion.div
              initial={{ x: -90, rotate: -90, opacity: 0 }}
              animate={{ x: -33, y: -9, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 10 }}
              className="absolute w-12 h-24 bg-slate-800/90 backdrop-blur-sm border-l-2 border-y border-blue-500/80 rounded-l-md flex flex-col justify-around p-1.5"
            >
              <div className="w-full h-1 bg-blue-950 rounded-sm overflow-hidden">
                <motion.div animate={{ x: [-30, 30] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-6 h-full bg-cyan-400" />
              </div>
              <div className="w-full h-1 bg-blue-950 rounded-sm overflow-hidden">
                <motion.div animate={{ x: [30, -30] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-6 h-full bg-indigo-400" />
              </div>
            </motion.div>
          )}

          {/* 3. Right Wing Structure (Folds and slides in from right) */}
          {stageWings && (
            <motion.div
              initial={{ x: 90, rotate: 90, opacity: 0 }}
              animate={{ x: 33, y: -9, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 10 }}
              className="absolute w-12 h-24 bg-slate-800/90 backdrop-blur-sm border-r-2 border-y border-blue-500/80 rounded-r-md flex flex-col justify-around p-1.5"
            >
              <div className="w-full h-1 bg-blue-950 rounded-sm overflow-hidden">
                <motion.div animate={{ x: [-30, 30] }} transition={{ repeat: Infinity, duration: 1.6 }} className="w-6 h-full bg-cyan-400" />
              </div>
              <div className="w-full h-1 bg-blue-950 rounded-sm overflow-hidden">
                <motion.div animate={{ x: [30, -30] }} transition={{ repeat: Infinity, duration: 1.4 }} className="w-6 h-full bg-indigo-400" />
              </div>
            </motion.div>
          )}

          {/* 4. Center Pillars / Main Hall (Scales up vertically) */}
          {stageWings && (
            <motion.div
              initial={{ scaleY: 0, y: 15, opacity: 0 }}
              animate={{ scaleY: 1, y: -9, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="absolute w-18 h-24 bg-slate-900/95 border-x border-blue-500/30 flex flex-col items-center justify-center"
            >
              {/* Neon Grid Backing */}
              <div className="w-full h-full absolute inset-0 bg-blue-500/5 flex flex-wrap gap-1 p-1.5 opacity-30">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-[4px] h-[4px] bg-cyan-400/80 rounded-sm" />
                ))}
              </div>
            </motion.div>
          )}

          {/* 5. Roof Cap (Drops down and clamps like a lock) */}
          {stageRoof && (
            <motion.div
              initial={{ y: -90, opacity: 0 }}
              animate={{ y: -40, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 14 }}
              className="absolute w-36 h-9 flex items-end justify-center"
            >
              <div className="w-0 h-0 border-l-[72px] border-l-transparent border-r-[72px] border-r-transparent border-b-[27px] border-b-cyan-500/90 relative">
                <div className="absolute top-[25px] -left-[72px] w-[144px] h-0.5 bg-cyan-300 shadow-[0_0_8px_#00f2fe]" />
              </div>
            </motion.div>
          )}

          {/* 6. Glowing Medical Cross (Assembles in the center) */}
          {stageCross && (
            <motion.div
              initial={{ scale: 0, rotate: 180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="absolute z-20 flex items-center justify-center"
              style={{ y: -9 }}
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                {/* Horizontal line */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 40 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="absolute h-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_14px_rgba(6,182,212,0.8)]" 
                />
                {/* Vertical line */}
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 40 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="absolute w-3.5 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full shadow-[0_0_14px_rgba(6,182,212,0.8)]" 
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Brand Title — ELEGANT & SIMPLE */}
      <h2 className="text-2xl font-light text-slate-100 tracking-wider mt-8 text-center">
        Heal <span className="font-semibold text-cyan-400">U</span>
      </h2>

      {/* Terminal / Construction log simulation */}
      <div className="w-68 mt-8 flex flex-col items-center">
        <div className="h-6 overflow-hidden flex items-center justify-center">
          <motion.p
            key={statusIdx}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-xs font-normal tracking-wide text-slate-400 text-center"
          >
            {statuses[statusIdx]}
          </motion.p>
        </div>

        {/* Progress bar container */}
        <div className="w-full h-1 bg-slate-800/60 rounded-full mt-3 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage Counter */}
        <p className="text-[11px] font-medium text-cyan-400/80 mt-2 tracking-wider">
          {progress}% CONSTRUCTED
        </p>
      </div>
    </div>
  );
};

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Keep loading=true until the full profile check is done
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserProfile(data);
            // Only show onboarding if the flag is explicitly false/absent
            const completed = data?.onboardingComplete === true;
            setNeedsOnboarding(!completed);
            if (completed) {
              // Fire-and-forget — don't let these block the loading state
              updateDoc(doc(db, 'users', currentUser.uid), {
                lastActive: serverTimestamp(),
              }).catch((err) => console.warn('Failed to update lastActive:', err));
              generateNotificationsOnLogin(currentUser.uid, data).catch(console.error);
            }
          } else {
            // Doc truly doesn't exist → first-time user
            setNeedsOnboarding(true);
          }
        } catch (error) {
          // Network/permission error → do NOT force onboarding. Let them in if they were already logged in.
          console.error('Error fetching user profile (non-fatal):', error);
          setNeedsOnboarding(false);
        }
      } else {
        setUserProfile(null);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const handleOnboardingComplete = async (profileData: any) => {
    setUserProfile(profileData);
    setNeedsOnboarding(false);
    // Create a default welcome chat for first-time users
    if (user) {
      try {
        await addDoc(collection(db, `users/${user.uid}/chats`), {
          name: 'Welcome Consultation',
          createdAt: serverTimestamp(),
          lastMessage: 'Start your first conversation',
          lastMessageAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('Failed to create welcome chat:', e);
      }
    }
  };

  if (loading) {
    return <AppRoboticLoader />;
  }

  if (!user) return <Auth />;
  if (needsOnboarding) return <Onboarding user={user} onComplete={handleOnboardingComplete} />;

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppLayout userProfile={userProfile} userId={user.uid} />}>
            <Route index element={<HomePage userId={user.uid} userProfile={userProfile} />} />
            <Route path="/consultation" element={<ConsultationListPage userId={user.uid} />} />
            <Route
              path="/consultation/:chatId"
              element={<ConsultationPage userProfile={userProfile} userId={user.uid} />}
            />
            <Route path="/records" element={<RecordsPage userId={user.uid} />} />
            <Route path="/health" element={<HealthPage userId={user.uid} userProfile={userProfile} />} />
            <Route path="/followups" element={<FollowUpsPage userId={user.uid} />} />
            <Route path="/profile" element={<ProfilePage userId={user.uid} userProfile={userProfile} setUserProfile={setUserProfile} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
