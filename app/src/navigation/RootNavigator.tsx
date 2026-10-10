import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { appScreenLayout } from "../components/common/AppBackground";
import { AuthStack } from "./AuthStack";
import { JobSeekerTabs } from "./JobSeekerTabs";
import { ShopOwnerTabs } from "./ShopOwnerTabs";
import { AdminStack } from "./AdminStack";
import { VerifierStack } from "./VerifierStack";
import { navigationRef } from "./navigationRef";
import { flushPendingNotificationLink } from "./notificationLinks";

export type RootStackParamList = {
  Auth: undefined;
  JobSeeker: undefined;
  ShopOwner: undefined;
  Admin: undefined;
  Verifier: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, isInitializing } = useAuth();
  const { isLoading: onboardingLoading, hasOnboarded } = useOnboarding();

  // Only block on the initial session restore. Gating on the per-request
  // isLoading flag would unmount the auth screens mid sign-in and wipe their
  // error state before it could be shown.
  if (isInitializing || onboardingLoading) {
    return <LoadingSpinner fullScreen message="Starting WorkNest..." />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => flushPendingNotificationLink(user?.role)}>
      <Stack.Navigator screenLayout={appScreenLayout} screenOptions={{ headerShown: false }}>
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
          <Stack.Screen name="Verifier" component={VerifierStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
