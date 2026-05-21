import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../lib/firebase.js';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingProps {
  user: any;
  onComplete: (data: any) => void;
}

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Quetta', 'Multan'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "Don't Know"];
const CHRONIC_OPTIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid', 'Kidney Disease', 'None'];
const AGE_RANGES = ['Under 18', '18–25', '26–35', '36–45', '46–55', '55+'];

// Confetti particle component
const Confetti: React.FC = () => {
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 0.8,
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: window.innerHeight + 40,
            opacity: [1, 1, 0],
            rotate: Math.random() * 720 - 360,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
};

// Animated SVG checkmark
const Checkmark: React.FC = () => (
  <motion.svg
    width="80" height="80" viewBox="0 0 80 80" fill="none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.circle
      cx="40" cy="40" r="36"
      stroke="#10b981" strokeWidth="4" fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
    <motion.path
      d="M24 40 L35 51 L56 28"
      stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
    />
  </motion.svg>
);

// Pill-style option button
const OptionBtn: React.FC<{
  label: string;
  selected?: boolean;
  onClick: () => void;
  multi?: boolean;
}> = ({ label, selected, onClick, multi }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`px-5 py-3 rounded-2xl border-2 text-sm font-bold transition-all text-left ${
      selected
        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
    }`}
  >
    {multi && selected && <span className="mr-1.5">✓</span>}
    {label}
  </motion.button>
);

const TOTAL_STEPS = 10;

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Field state
  const [displayName, setDisplayName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleCityInput = (val: string) => {
    setCity(val);
    if (val.length > 0) {
      setCitySuggestions(CITIES.filter((c) => c.toLowerCase().startsWith(val.toLowerCase())));
    } else {
      setCitySuggestions([]);
    }
  };

  const toggleDisease = (d: string) => {
    if (d === 'None') { setChronicDiseases(['None']); return; }
    setChronicDiseases((prev) => {
      const filtered = prev.filter((x) => x !== 'None');
      return filtered.includes(d) ? filtered.filter((x) => x !== d) : [...filtered, d];
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    // Map age range to a rough midpoint number
    const ageMap: Record<string, number> = {
      'Under 18': 16, '18–25': 22, '26–35': 30, '36–45': 40, '46–55': 50, '55+': 60,
    };
    const profileData = {
      userId: user.uid,
      displayName: displayName || user.displayName || 'User',
      email: user.email,
      age: ageMap[ageRange] || null,
      ageRange,
      gender,
      city,
      phoneNumber: phone ? `+92${phone.replace(/^0/, '').replace(/\D/g, '')}` : '',
      bloodGroup,
      chronicDiseases,
      previousSurgeries: '',
      allergies,
      currentMedications: medications,
      familyHistory,
      onboardingComplete: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      profilePhotoUrl: null,
    };
    try {
      await updateProfile(user, { displayName: profileData.displayName });
      await setDoc(doc(db, 'users', user.uid), profileData);
      setDone(true);
      setTimeout(() => onComplete(profileData), 2200);
    } catch (e) {
      console.error('Onboarding save failed:', e);
      setLoading(false);
    }
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 0: return displayName.trim().length >= 2;
      case 1: return ageRange !== '';
      case 2: return gender !== '';
      case 3: return true; // city is optional
      case 4: return true; // phone optional
      case 5: return true; // blood group optional
      case 6: return true; // chronic — can be empty
      case 7: return true;
      case 8: return true;
      case 9: return true;
      default: return true;
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  // Slide variants
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  // Completion screen
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white relative overflow-hidden">
        <Confetti />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center gap-4 text-center px-8"
        >
          <Checkmark />
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-3xl font-bold text-slate-900"
          >
            You're all set! 🎉
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-slate-500 text-base"
          >
            Welcome to Heal U, {displayName}. Your AI medical partner is ready.
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const renderQuestion = () => {
    switch (step) {
      /* ── Step 0: Name ───────────────────────────────── */
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">What's your name?</h2>
              <p className="text-slate-500 mt-2">This is how Heal U will address you.</p>
            </div>
            <input
              autoFocus
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canContinue() && goNext()}
              placeholder="e.g. Ahmed Ali"
              className="w-full text-2xl font-bold bg-transparent border-b-2 border-blue-300 focus:border-blue-600 focus:outline-none py-3 text-slate-900 placeholder-slate-200 transition-colors"
            />
          </div>
        );

      /* ── Step 1: Age ─────────────────────────────────── */
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">How old are you?</h2>
              <p className="text-slate-500 mt-2">Helps us tailor your health recommendations.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {AGE_RANGES.map((r) => (
                <OptionBtn key={r} label={r} selected={ageRange === r} onClick={() => setAgeRange(r)} />
              ))}
            </div>
          </div>
        );

      /* ── Step 2: Gender ──────────────────────────────── */
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">What's your gender?</h2>
              <p className="text-slate-500 mt-2">Used for clinically accurate recommendations.</p>
            </div>
            <div className="flex flex-col gap-3">
              {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => (
                <OptionBtn key={g} label={g} selected={gender === g} onClick={() => setGender(g)} />
              ))}
            </div>
          </div>
        );

      /* ── Step 3: City ────────────────────────────────── */
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">Which city do you live in?</h2>
              <p className="text-slate-500 mt-2">Used to find doctors and pharmacies near you.</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => handleCityInput(e.target.value)}
                placeholder="e.g. Karachi"
                className="w-full text-xl font-bold bg-transparent border-b-2 border-blue-300 focus:border-blue-600 focus:outline-none py-3 text-slate-900 placeholder-slate-200 transition-colors"
              />
              {citySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl mt-2 overflow-hidden z-10">
                  {citySuggestions.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCity(c); setCitySuggestions([]); }}
                      className="w-full text-left px-4 py-3 text-slate-800 font-semibold hover:bg-blue-50 text-sm transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Quick city chips */}
            <div className="flex flex-wrap gap-2">
              {CITIES.filter((c) => c !== city).slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => { setCity(c); setCitySuggestions([]); }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        );

      /* ── Step 4: Phone ───────────────────────────────── */
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">Your phone number?</h2>
              <p className="text-slate-500 mt-2">For emergency contact purposes only.</p>
            </div>
            <div className="flex items-center border-b-2 border-blue-300 focus-within:border-blue-600 transition-colors py-3">
              <span className="text-slate-500 font-bold text-xl mr-2">+92</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="300 1234567"
                className="flex-1 text-xl font-bold bg-transparent focus:outline-none text-slate-900 placeholder-slate-200"
              />
            </div>
          </div>
        );

      /* ── Step 5: Blood Group ─────────────────────────── */
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">Do you know your blood group?</h2>
              <p className="text-slate-500 mt-2">Critical in emergencies.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BLOOD_GROUPS.map((g) => (
                <OptionBtn key={g} label={g} selected={bloodGroup === g} onClick={() => setBloodGroup(g)} />
              ))}
            </div>
          </div>
        );

      /* ── Step 6: Chronic conditions ──────────────────── */
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">Any chronic conditions?</h2>
              <p className="text-slate-500 mt-2">Select all that apply. You can update this later.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {CHRONIC_OPTIONS.map((d) => (
                <OptionBtn key={d} label={d} selected={chronicDiseases.includes(d)} onClick={() => toggleDisease(d)} multi />
              ))}
            </div>
          </div>
        );

      /* ── Step 7: Allergies ───────────────────────────── */
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">Any allergies we should know about?</h2>
              <p className="text-slate-500 mt-2">Food, medicine, or environmental.</p>
            </div>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Shellfish..."
              className="w-full text-lg font-semibold bg-transparent border-b-2 border-blue-300 focus:border-blue-600 focus:outline-none py-3 text-slate-900 placeholder-slate-300 transition-colors"
            />
            <button
              onClick={() => { setAllergies(''); goNext(); }}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 underline"
            >
              No Allergies — Skip
            </button>
          </div>
        );

      /* ── Step 8: Current Medications ─────────────────── */
      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">Currently taking any medications?</h2>
              <p className="text-slate-500 mt-2">Prevents prescription conflicts.</p>
            </div>
            <input
              type="text"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="e.g. Metformin 500mg, Amlodipine..."
              className="w-full text-lg font-semibold bg-transparent border-b-2 border-blue-300 focus:border-blue-600 focus:outline-none py-3 text-slate-900 placeholder-slate-300 transition-colors"
            />
            <button
              onClick={() => { setMedications(''); goNext(); }}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 underline"
            >
              No Medications — Skip
            </button>
          </div>
        );

      /* ── Step 9: Family history ───────────────────────── */
      case 9:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">Any major conditions in your family?</h2>
              <p className="text-slate-500 mt-2">Genetic factors influence your health risk.</p>
            </div>
            <input
              type="text"
              value={familyHistory}
              onChange={(e) => setFamilyHistory(e.target.value)}
              placeholder="e.g. Father has diabetes..."
              className="w-full text-lg font-semibold bg-transparent border-b-2 border-blue-300 focus:border-blue-600 focus:outline-none py-3 text-slate-900 placeholder-slate-300 transition-colors"
            />
            <button
              onClick={() => { setFamilyHistory(''); }}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 underline"
            >
              Nothing I know of
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-50">
        <motion.div
          className="h-full bg-blue-600"
          animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-between px-6 pt-8 pb-2">
        {step > 0 ? (
          <button onClick={goBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
          {step + 1} / {TOTAL_STEPS}
        </span>
        <div className="w-9" />
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col justify-center px-8 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {renderQuestion()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Continue / Submit button */}
      <div className="px-8 pb-10 pt-4 max-w-lg mx-auto w-full">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={isLastStep ? handleSubmit : goNext}
          disabled={!canContinue() || loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-base"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isLastStep ? (
            <>Complete Setup ✓</>
          ) : (
            <>Continue <ChevronRight className="w-5 h-5" /></>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default Onboarding;
