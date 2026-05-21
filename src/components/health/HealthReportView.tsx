import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, AlertCircle, CheckCircle, Lightbulb, Info } from 'lucide-react';

interface HealthReportData {
  healthScore: number;
  highRiskAlerts: string[];
  areasOfConcern: string[];
  positiveIndicators: string[];
  recommendations: string[];
  summary: string;
}

interface HealthReportViewProps {
  report: HealthReportData;
}

// Animated SVG Circular Gauge with glow
const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#eab308';
    if (s >= 40) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(clampedScore);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36 health-score-glow">
        <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
          {/* Background track */}
          <circle cx="72" cy="72" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          {/* Animated score arc */}
          <motion.circle
            cx="72"
            cy="72"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-3xl font-black"
            style={{ color }}
          >
            {clampedScore}
          </motion.span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-bold mt-2" style={{ color }}>
        {clampedScore >= 80 ? 'Excellent' : clampedScore >= 60 ? 'Good' : clampedScore >= 40 ? 'Fair' : 'Needs Attention'}
      </p>
    </div>
  );
};

// Section with colored LEFT BORDER instead of full background tinting
const Section: React.FC<{
  title: string;
  items: string[];
  icon: React.ReactNode;
  borderColor: string;   // e.g. "border-l-red-500"
  textColor: string;     // e.g. "text-slate-700"
  bulletColor: string;   // e.g. "text-red-500"
  delay: number;
}> = ({ title, items, icon, borderColor, textColor, bulletColor, delay }) => {
  if (!items || items.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white rounded-2xl p-4 border border-slate-100 border-l-4 ${borderColor} shadow-sm shadow-slate-100/80`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className={`text-xs ${textColor} flex items-start gap-2 leading-relaxed`}>
            <span className={`mt-0.5 shrink-0 font-bold ${bulletColor}`}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

const HealthReportView: React.FC<HealthReportViewProps> = ({ report }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Score + Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-6 shadow-lg shadow-slate-100/80 flex flex-col items-center text-center"
      >
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">AI Health Score</h3>
        <ScoreGauge score={report.healthScore} />
        {report.summary && (
          <p className="text-sm text-slate-600 leading-relaxed mt-5 max-w-sm">{report.summary}</p>
        )}
      </motion.div>

      {/* Risk Sections — colored left borders, white background */}
      <Section
        title="High Risk Alerts"
        items={report.highRiskAlerts}
        icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
        borderColor="border-l-red-500"
        textColor="text-slate-700"
        bulletColor="text-red-400"
        delay={0.1}
      />
      <Section
        title="Areas of Concern"
        items={report.areasOfConcern}
        icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
        borderColor="border-l-amber-500"
        textColor="text-slate-700"
        bulletColor="text-amber-400"
        delay={0.2}
      />
      <Section
        title="Positive Indicators"
        items={report.positiveIndicators}
        icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
        borderColor="border-l-emerald-500"
        textColor="text-slate-700"
        bulletColor="text-emerald-400"
        delay={0.3}
      />
      <Section
        title="Recommendations"
        items={report.recommendations}
        icon={<Lightbulb className="w-4 h-4 text-blue-500" />}
        borderColor="border-l-blue-500"
        textColor="text-slate-700"
        bulletColor="text-blue-400"
        delay={0.4}
      />

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100"
      >
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Based on the currently available information about you, this is your AI-generated health score.
          This is <strong>not a medical diagnosis</strong>. Always consult a healthcare professional for medical decisions.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default HealthReportView;
