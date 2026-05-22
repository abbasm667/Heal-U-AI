// Detects whether app is running as Capacitor APK or web browser
export const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNative === true;
};

export const isWeb = (): boolean => !isCapacitor();
