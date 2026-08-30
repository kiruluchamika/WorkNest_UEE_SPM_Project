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
    [
      "expo-image-picker",
      {
        photosPermission: "WorkNest needs access to your photos so you can attach a gig or profile image.",
        cameraPermission: "WorkNest needs access to your camera so you can take a gig or profile image.",
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000",
  },
};
