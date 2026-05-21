import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { WaveformCanvas, FolderCanvas, ECGCanvas, CalendarCanvas } from './CardAnimations.js';

interface FeatureCardProps {
  theme: 'blue' | 'emerald' | 'amber' | 'violet';
  title: string;
  subtitle: string;
  icon: 'stethoscope' | 'records' | 'health' | 'calendar';
  onClick: () => void;
  index: number;
  featured?: boolean;
}

// Themes: gradient, fade overlay color (matches right-side card gradient midpoint), badge, glow
const THEMES = {
  blue: {
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 40%, #3b82f6 100%)',
    // Fade color = mid-gradient color of the blue card (right edge bleeds into text area)
    fadeColor: '#2563eb',
    badge: 'bg-blue-400/30 text-blue-50',
    glow: '0 8px 32px rgba(30,58,138,0.45), 0 2px 8px rgba(37,99,235,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
  },
  emerald: {
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 40%, #10b981 100%)',
    fadeColor: '#059669',
    badge: 'bg-emerald-400/30 text-emerald-50',
    glow: '0 8px 32px rgba(6,78,59,0.45), 0 2px 8px rgba(5,150,105,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
  },
  amber: {
    gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 40%, #f59e0b 100%)',
    fadeColor: '#d97706',
    badge: 'bg-amber-300/30 text-amber-50',
    glow: '0 8px 32px rgba(146,64,14,0.45), 0 2px 8px rgba(217,119,6,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
  },
  violet: {
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 40%, #8b5cf6 100%)',
    fadeColor: '#7c3aed',
    badge: 'bg-violet-300/30 text-violet-50',
    glow: '0 8px 32px rgba(76,29,149,0.45), 0 2px 8px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
  },
};

const PARTICLES = [
  { top: 15, left: 12, delay: 0, duration: 5.5 },
  { top: 70, left: 25, delay: 0.9, duration: 7.1 },
  { top: 30, left: 78, delay: 1.7, duration: 6.3 },
  { top: 82, left: 60, delay: 2.5, duration: 5.8 },
  { top: 50, left: 45, delay: 0.5, duration: 8.0 },
  { top: 20, left: 55, delay: 3.2, duration: 6.7 },
];

const AnimationPanel: React.FC<{ variant: FeatureCardProps['icon'] }> = ({ variant }) => {
  if (variant === 'stethoscope') return <WaveformCanvas />;
  if (variant === 'records') return <FolderCanvas />;
  if (variant === 'calendar') return <CalendarCanvas />;
  return <ECGCanvas />;
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  theme, title, subtitle, icon, onClick, index, featured,
}) => {
  const t = THEMES[theme];
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.015 }}
      onClick={onClick}
      className="w-full text-left rounded-3xl overflow-hidden relative"
      style={{
        minHeight: featured ? '190px' : '170px',
        background: t.gradient,
        boxShadow: t.glow,
        transform: 'perspective(1000px) rotateX(2deg)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Change 4: Glassmorphism overlay — visible shine on top 50% */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: 'inherit',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      />

      {/* Subtle border shimmer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 'inherit',
        }}
      />

      {/* Background glow blob */}
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      {/* Change 4: Card shine sweep animation */}
      <div className="card-shine pointer-events-none" />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="floating-particle"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="flex h-full">
        {/* Left — Canvas animation panel (38% width), full height, no padding */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ width: '38%' }}>
          {/* Canvas fills the entire panel edge-to-edge */}
          <div className="absolute inset-0 opacity-90">
            <AnimationPanel variant={icon} />
          </div>
          {/* Fix 1: Fade on RIGHT edge of animation — transparent → card color */}
          <div
            className="absolute top-0 right-0 bottom-0 w-[60%] pointer-events-none"
            style={{
              background: `linear-gradient(to right, transparent 0%, ${t.fadeColor} 100%)`,
            }}
          />
        </div>

        {/* Right — Text content */}
        <div className="flex flex-col justify-center flex-1 py-5 pr-4 pl-1 min-w-0">
          {featured && (
            <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg mb-2 w-fit ${t.badge}`}>
              ✦ Featured
            </span>
          )}
          <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
          <p className="text-white/80 text-sm mt-1 leading-snug">{subtitle}</p>
          <div className="flex items-center gap-1 mt-3">
            <span className="text-white/75 text-xs font-semibold">Open</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/75" />
          </div>
        </div>
      </div>
    </motion.button>
  );
};

export default FeatureCard;
