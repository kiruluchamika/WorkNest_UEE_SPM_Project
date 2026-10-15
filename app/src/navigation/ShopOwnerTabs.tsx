import { appScreenLayout } from "../components/common/AppBackground";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { DashboardScreen } from "../screens/shopowner/DashboardScreen";
import { ApplicantsScreen } from "../screens/shopowner/ApplicantsScreen";
import { MyGigsScreen } from "../screens/shopowner/MyGigsScreen";
import { GigPostDetailScreen } from "../screens/shopowner/GigPostDetailScreen";
import { GigPostFormScreen } from "../screens/shopowner/GigPostFormScreen";
import { ApplicationSettingsScreen } from "../screens/shopowner/ApplicationSettingsScreen";
import { GigApplicantsScreen } from "../screens/shopowner/GigApplicantsScreen";
import { ApplicantDetailsScreen } from "../screens/shopowner/ApplicantDetailsScreen";
import { ProfileScreen } from "../screens/shopowner/ProfileScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";
import { WorkHistoryScreen } from "../screens/shared/WorkHistoryScreen";
import { ReputationScreen } from "../screens/shared/ReputationScreen";
import { ReviewFormScreen } from "../screens/shared/ReviewFormScreen";
import { GlassTabBar } from "./GlassTabBar";

export type ShopOwnerStackParamList = {
  DashboardHome: undefined;
  Applicants: { gigId: string };
  Profile: undefined;
  WorkHistory: { userId: string };
  Reputation: { userId: string; userName?: string };
  ReviewForm: { gigId: string; revieweeId: string; revieweeName?: string };
};

export type MyGigsStackParamList = {
  MyGigs: undefined;
  GigDetail: { gigId: string };
  GigForm: { gigId?: string } | undefined;
  ApplicationSettings: { gigId: string };
  GigApplicants: { gigId: string };
  ApplicantDetails: { applicationId: string };
  ReviewForm: { gigId: string; revieweeId: string; revieweeName?: string };
};

export type ShopOwnerTabParamList = {
  Dashboard: undefined;
  MyGigsTab: undefined;
  PostGig: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<ShopOwnerStackParamList>();
const MyGigsStack = createNativeStackNavigator<MyGigsStackParamList>();
const Tab = createBottomTabNavigator<ShopOwnerTabParamList>();

function ShopOwnerStack() {
  return (
    <Stack.Navigator screenLayout={appScreenLayout} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="Applicants" component={ApplicantsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="WorkHistory" component={WorkHistoryScreen} />
      <Stack.Screen name="Reputation" component={ReputationScreen} />
      <Stack.Screen name="ReviewForm" component={ReviewFormScreen} />
    </Stack.Navigator>
  );
}

function MyGigsStackNavigator() {
  return (
    <MyGigsStack.Navigator screenLayout={appScreenLayout} screenOptions={{ headerShown: false }}>
      <MyGigsStack.Screen name="MyGigs" component={MyGigsScreen} />
      <MyGigsStack.Screen name="GigDetail" component={GigPostDetailScreen} />
      <MyGigsStack.Screen name="GigForm" component={GigPostFormScreen} />
      <MyGigsStack.Screen name="ApplicationSettings" component={ApplicationSettingsScreen} />
      <MyGigsStack.Screen name="GigApplicants" component={GigApplicantsScreen} />
      <MyGigsStack.Screen name="ApplicantDetails" component={ApplicantDetailsScreen} />
      <MyGigsStack.Screen name="ReviewForm" component={ReviewFormScreen} />
    </MyGigsStack.Navigator>
  );
}

export const ShopOwnerTabs: React.FC = () => {
  return (
    <Tab.Navigator screenLayout={appScreenLayout}
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = "grid";
          if (route.name === "MyGigsTab") iconName = "briefcase";
          if (route.name === "PostGig") iconName = "plus-circle";
          if (route.name === "Notifications") iconName = "bell";
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ShopOwnerStack} options={{ title: "Dashboard" }} />
      <Tab.Screen name="MyGigsTab" component={MyGigsStackNavigator} options={{ title: "My Gigs" }} />
      <Tab.Screen name="PostGig" component={GigPostFormScreen} options={{ title: "Post Gig" }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Alerts" }}
      />
    </Tab.Navigator>
  );
};
