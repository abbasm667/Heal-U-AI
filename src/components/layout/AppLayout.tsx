import React from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import AppHeader from './Header.js';
import BottomNavBar from './BottomNavBar.js';
import { useDesktopLayout } from '../../lib/environment.js';
import { Hospital, MessageCircle, ClipboardList, Heart, CalendarCheck } from 'lucide-react';

interface AppLayoutProps {
  userProfile: any;
  userId: string;
}

const navItems = [
  { path: '/', icon: Hospital, label: 'Home' },
  { path: '/consultation', icon: MessageCircle, label: 'Consult' },
  { path: '/records', icon: ClipboardList, label: 'Records' },
  { path: '/followups', icon: CalendarCheck, label: 'Follow-Ups' },
  { path: '/health', icon: Heart, label: 'Health' },
];

const AppLayout: React.FC<AppLayoutProps> = ({ userProfile, userId }) => {
  const location = useLocation();
  // Apply chat-bg on the consultation chat screen
  const isChatRoute = /^\/consultation\/.+/.test(location.pathname);
  const isDesktop = useDesktopLayout();

  return (
    <div className={`min-h-screen flex flex-col ${isChatRoute ? 'chat-bg' : 'app-bg'}`}>
      <AppHeader userProfile={userProfile} userId={userId} />
      
      <div className="flex flex-1 relative">
        {isDesktop && (
          <aside className="fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-slate-200 z-40 flex flex-col py-4">
            {/* Logo section */}
            <div className="px-6 mb-6">
              <span className="text-lg font-bold text-slate-900">Navigation</span>
            </div>
            
            {/* Nav items */}
            <div className="flex-grow flex flex-col">
              {navItems.map(item => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                  
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </aside>
        )}

        {/* Padding top = header height (~64px) */}
        <main className={`flex-1 overflow-hidden pt-[64px] ${isDesktop ? 'ml-60 pb-0' : 'pb-[80px]'} flex flex-col`}>
          <Outlet />
        </main>
      </div>

      {!isDesktop && <BottomNavBar />}
    </div>
  );
};

export default AppLayout;
