import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { AuthStack } from "./AuthStack";
import { JobSeekerTabs } from "./JobSeekerTabs";
import { ShopOwnerTabs } from "./ShopOwnerTabs";
import { AdminStack } from "./AdminStack";
import { VerifierEndorseScreen } from "../screens/trust/VerifierEndorseScreen";

export type RootStackParamList = {
  Auth: undefined;
  JobSeeker: undefined;
  ShopOwner: undefined;
  Admin: undefined;
  Verifier: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { isLoading: onboardingLoading, hasOnboarded } = useOnboarding();

  if (isLoading || onboardingLoading) {
    return <LoadingSpinner fullScreen message="Starting WorkNest..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth">
            {() => <AuthStack initialRouteName={hasOnboarded ? "Login" : "Onboarding"} />}
          </Stack.Screen>
        ) : user.role === "jobseeker" ? (
          <Stack.Screen name="JobSeeker" component={JobSeekerTabs} />
        ) : user.role === "shopowner" ? (
          <Stack.Screen name="ShopOwner" component={ShopOwnerTabs} />
        ) : user.role === "admin" ? (
          <Stack.Screen name="Admin" component={AdminStack} />
        ) : (
          <Stack.Screen name="Verifier" component={VerifierEndorseScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
