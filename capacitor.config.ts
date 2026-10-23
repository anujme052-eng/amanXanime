import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amanxanime.app',
  appName: 'Jio VidStream Hub',
  webDir: 'dist',
  server: {
    url: 'https://jio-vidstream-hub.pages.dev/',
    cleartext: false,
  },
};

export default config;
