import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';
import { motion } from 'motion/react';
import { Save, LogOut, User, Stethoscope, MapPin, Phone } from 'lucide-react';

interface ProfilePageProps {
  userId: string;
  userProfile: any;
  setUserProfile: (p: any) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
      {label}
    </label>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
  />
);

const buildForm = (data: any) => ({
  displayName: data?.displayName || '',
  age: data?.age || '',
  gender: data?.gender || '',
  city: data?.city || '',
  phoneNumber: data?.phoneNumber || '',
  bloodGroup: data?.bloodGroup || '',
  chronicDiseases: Array.isArray(data?.chronicDiseases)
    ? data.chronicDiseases.join(', ')
    : data?.chronicDiseases || '',
  allergies: data?.allergies || '',
  currentMedications: data?.currentMedications || '',
  previousSurgeries: data?.previousSurgeries || '',
  familyHistory: data?.familyHistory || '',
});

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, userProfile, setUserProfile }) => {
  const [form, setForm] = useState(buildForm(userProfile));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          const data = snap.data();
          setForm(buildForm(data));
          setUserProfile(data);
        }
      } catch (e) {
        console.error('Failed to load profile from Firestore:', e);
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, [userId]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = {
        ...form,
        chronicDiseases: form.chronicDiseases
          ? form.chronicDiseases.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, 'users', userId), updated);
      setUserProfile({ ...userProfile, ...updated });
      setSaved(true);
    } catch (e) {
      console.error('Failed to save profile', e);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getInitial = (name?: string) => (name ? name.charAt(0).toUpperCase() : 'U');

  return (
    <div className="h-full overflow-y-auto">
      {/* Instagram-style gradient header banner */}
      <div className="relative h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12">
        {/* Avatar overlapping banner */}
        <div className="flex flex-col items-center -mt-12 mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative"
          >
            {/* Animated ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute -inset-1.5 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6)',
                padding: '2px',
              }}
            >
              <div className="w-full h-full rounded-full bg-white" />
            </motion.div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white">
              {fetching ? '…' : getInitial(form.displayName)}
            </div>
          </motion.div>
          {fetching ? (
            <div className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse mt-3 mb-1" />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 mt-3">
              {form.displayName || 'Your Profile'}
            </h1>
          )}
          <p className="text-sm text-slate-500">{auth.currentUser?.email}</p>
        </div>

        {/* Basic Info */}
        <section className="bg-white rounded-3xl border border-slate-100 p-5 mb-4 shadow-lg shadow-slate-100/80 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Basic Information</h2>
          </div>
          <Field label="Full Name">
            <Input value={form.displayName} onChange={set('displayName')} placeholder="Your full name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <Input type="number" value={form.age} onChange={set('age')} placeholder="Age" min={1} max={120} />
            </Field>
            <Field label="Gender">
              <select
                value={form.gender}
                onChange={set('gender')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Select</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={form.city} onChange={set('city')} placeholder="Your city" className="pl-9" />
              </div>
            </Field>
            <Field label="Phone Number">
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+92..." className="pl-9" />
              </div>
            </Field>
          </div>
        </section>

        {/* Medical Info */}
        <section className="bg-white rounded-3xl border border-slate-100 p-5 mb-6 shadow-lg shadow-slate-100/80 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Medical Profile</h2>
          </div>
          <Field label="Blood Group">
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => { setForm((p) => ({ ...p, bloodGroup: bg })); setSaved(false); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                    form.bloodGroup === bg
                      ? 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-red-200'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Chronic Diseases (comma-separated)">
            <Input value={form.chronicDiseases} onChange={set('chronicDiseases')} placeholder="e.g. Diabetes, Hypertension" />
          </Field>
          <Field label="Allergies">
            <Input value={form.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, Shellfish" />
          </Field>
          <Field label="Current Medications">
            <Input value={form.currentMedications} onChange={set('currentMedications')} placeholder="e.g. Metformin 500mg" />
          </Field>
          <Field label="Previous Surgeries">
            <Input value={form.previousSurgeries} onChange={set('previousSurgeries')} placeholder="e.g. Appendectomy 2019" />
          </Field>
          <Field label="Family Medical History">
            <textarea
              value={form.familyHistory}
              onChange={set('familyHistory')}
              rows={3}
              placeholder="e.g. Father has diabetes, mother has hypertension..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          </Field>
        </section>

        {/* Save Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm mb-3 ${
            saved
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
          } disabled:opacity-60`}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <><span>✓</span> Profile Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Profile</>
          )}
        </motion.button>

        {/* Sign Out */}
        <button
          onClick={() => signOut(auth)}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 border border-red-100 transition-all"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
