import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amanxanime.app',
  appName: 'Jio VidStream Hub',
  webDir: 'dist',
  server: {
    url: 'https://amanxanime.lovable.app/',
    cleartext: false,
  },
};

export default config;
