import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/context/AuthContext";
import { GigProvider } from "./src/context/GigContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GigProvider>
          <RootNavigator />
        </GigProvider>
      </AuthProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
