import React from "react";
import { Image, View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { AuthProvider } from "./src/context/AuthContext";
import { GigProvider } from "./src/context/GigContext";
import { CategoryProvider } from "./src/context/CategoryContext";
import { GigPostProvider } from "./src/context/GigPostContext";
import { AdminGigProvider } from "./src/context/AdminGigContext";
import { OnboardingProvider } from "./src/context/OnboardingContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme/colors";

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require("./assets/images/loading.gif")}
          style={styles.loadingGif}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <AuthProvider>
            <NotificationProvider>
              <GigProvider>
                <CategoryProvider>
                  <GigPostProvider>
                    <AdminGigProvider>
                      <StatusBar style="dark" />
                      <RootNavigator />
                    </AdminGigProvider>
                  </GigPostProvider>
                </CategoryProvider>
              </GigProvider>
            </NotificationProvider>
          </AuthProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  },
  loadingGif: {
    width: 160,
    height: 160,
  }
});