// Set by whoever owns the Expo account, one time: `npx eas-cli login` then
// `npx eas-cli init` (links/creates the EAS project for slug "worknest" and
// prints its project ID). Without this, push notifications can't register
// a device token — Notifications.getExpoPushTokenAsync() requires it.
const easProjectId = process.env.EAS_PROJECT_ID;

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
    backgroundColor: "#F2FAFA",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.worknest.mobile",
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "WorkNest needs access to your photos so you can attach a gig image or profile photo.",
      NSCameraUsageDescription:
        "WorkNest needs access to your camera so you can take a gig image or profile photo.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#F2FAFA",
    },
    package: "com.worknest.mobile",
  },
  web: {
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-sharing",
    [
      "expo-image-picker",
      {
        photosPermission: "WorkNest needs access to your photos so you can attach a gig or profile image.",
        cameraPermission: "WorkNest needs access to your camera so you can take a gig or profile image.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#0F766E",
        defaultChannel: "default",
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000",
    eas: easProjectId ? { projectId: easProjectId } : undefined,
  },
};
