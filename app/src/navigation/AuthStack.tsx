import { appScreenLayout } from "../components/common/AppBackground";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { RoleSelectScreen } from "../screens/onboarding/RoleSelectScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";

export type AuthStackParamList = {
  Onboarding: undefined;
  RoleSelect: undefined;
  Login: undefined;
  Register: { role?: "jobseeker" | "shopowner" | "verifier" } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthStackProps {
  initialRouteName?: keyof AuthStackParamList;
}

export const AuthStack: React.FC<AuthStackProps> = ({ initialRouteName = "Onboarding" }) => {
  return (
    <Stack.Navigator screenLayout={appScreenLayout} screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};
