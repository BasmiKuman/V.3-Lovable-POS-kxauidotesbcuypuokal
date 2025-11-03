import type { CapacitorConfig } from '@capacitor/cli';

// Version: 1.0.9
const config: CapacitorConfig = {
  appId: 'com.basmikuman.pos',
  appName: 'BK POS System',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#3b82f6",
      splashFullScreen: false,
      splashImmersive: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    }
  }
};

export default config;
