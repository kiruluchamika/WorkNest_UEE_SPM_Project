export default {
  name: "WorkNest",
  slug: "worknest",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FCFBF8",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.worknest.mobile",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FCFBF8",
    },
    package: "com.worknest.mobile",
  },
  web: {
    favicon: "./assets/images/favicon.png",
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000",
  },
};
