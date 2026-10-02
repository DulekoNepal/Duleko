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
    // The plugin's default draws the WebView behind the status bar. Android
    // 15+ is edge-to-edge regardless and Capacitor pads for it, but on
    // Android 14 and older the page then gets a 0px top inset and every
    // header slides under the bar. Keep the WebView below it instead.
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;
