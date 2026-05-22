import { useState, useEffect } from 'react';

// Detects whether running as Capacitor native APK
export const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNative === true;
};

// Detects whether running on web browser
export const isWeb = (): boolean => !isCapacitor();

// Detects if screen is wide enough for desktop layout (768px breakpoint)
export const isDesktop = (): boolean => {
  return window.innerWidth >= 768;
};

// Returns true ONLY when: running in browser AND screen is wide enough
export const useDesktopLayout = (): boolean => {
  const [isDesktopLayout, setIsDesktopLayout] = useState(
    !isCapacitor() && isDesktop()
  );

  useEffect(() => {
    if (isCapacitor()) return; // APK never changes layout
    
    const handleResize = () => {
      setIsDesktopLayout(isDesktop());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktopLayout;
};
