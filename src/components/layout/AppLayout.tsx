import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from './Header.js';
import BottomNavBar from './BottomNavBar.js';

interface AppLayoutProps {
  userProfile: any;
  userId: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ userProfile, userId }) => {
  const location = useLocation();
  // Apply chat-bg on the consultation chat screen
  const isChatRoute = /^\/consultation\/.+/.test(location.pathname);

  return (
    <div className={`min-h-screen flex flex-col ${isChatRoute ? 'chat-bg' : 'app-bg'}`}>
      <AppHeader userProfile={userProfile} userId={userId} />
      {/* Padding top = header height (~64px), padding bottom = nav height (~80px) */}
      <main className="flex-1 overflow-hidden pt-[64px] pb-[80px] flex flex-col">
        <Outlet />
      </main>
      <BottomNavBar />
    </div>
  );
};

export default AppLayout;
