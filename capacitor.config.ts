import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.healu.medical',
  appName: 'Heal U',
  webDir: 'dist/client',

  android: {
    allowMixedContent: true, // Required for HTTP on Android in dev
  },
};

export default config;

