import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Hospital, MessageCircle, ClipboardList, Heart, CalendarCheck } from 'lucide-react';
import { motion } from 'motion/react';

const tabs = [
  { to: '/', icon: Hospital, label: 'Home', exact: true },
  { to: '/consultation', icon: MessageCircle, label: 'Consult', exact: false },
  { to: '/records', icon: ClipboardList, label: 'Records', exact: false },
  { to: '/followups', icon: CalendarCheck, label: 'Follow-Ups', exact: false },
  { to: '/health', icon: Heart, label: 'Health', exact: false },
];

const BottomNavBar: React.FC = () => {
  const location = useLocation();

  const isActive = (to: string, exact: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.04)',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="flex items-center justify-around px-1 py-2 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label, exact }) => {
          const active = isActive(to, exact);
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center flex-1 py-1 px-0.5 relative"
            >
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                {active ? (
                  // iOS-style: filled blue circle background for active tab
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center mb-0.5 shadow-md shadow-blue-300/50">
                    <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  // Inactive: slate-500 icon (not slate-300/slate-400)
                  <div className="w-10 h-10 flex items-center justify-center mb-0.5">
                    <Icon className="w-5 h-5 text-slate-500 transition-colors duration-200" strokeWidth={1.8} />
                  </div>
                )}
                <span
                  className={`text-[9px] font-bold tracking-wide transition-colors duration-200 ${
                    active ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
