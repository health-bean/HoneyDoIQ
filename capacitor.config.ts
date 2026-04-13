import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.picohome.app",
  appName: "Pico Home",
  webDir: "out",
  server: {
    // In development, point to your local server
    // url: "http://localhost:3001",
    // In production, the app loads from the bundled files
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#fffbeb",
      showSpinner: false,
    },
  },
};

export default config;
