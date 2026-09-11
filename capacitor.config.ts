import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duleko.app',
  appName: 'Duleko',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#ffffffff',
      showSpinner: false,
    },
  },
};

export default config;
