import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { BrowseGigsScreen } from "../screens/jobseeker/BrowseGigsScreen";
import { GigDetailScreen } from "../screens/jobseeker/GigDetailScreen";
import { ApplyGigScreen } from "../screens/jobseeker/ApplyGigScreen";
import { ApplyToGigScreen } from "../screens/jobseeker/ApplyToGigScreen";
import { MyApplicationsScreen } from "../screens/jobseeker/MyApplicationsScreen";
import { ApplicationDetailsScreen } from "../screens/jobseeker/ApplicationDetailsScreen";
import { ProfileScreen } from "../screens/jobseeker/ProfileScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";
import { VerificationRequestScreen } from "../screens/jobseeker/VerificationRequestScreen";
import { WorkHistoryScreen } from "../screens/shared/WorkHistoryScreen";
import { ReputationScreen } from "../screens/shared/ReputationScreen";
import { ReviewFormScreen } from "../screens/shared/ReviewFormScreen";
import { GlassTabBar } from "./GlassTabBar";

export type JobSeekerStackParamList = {
  BrowseGigs: undefined;
  GigDetail: { gigId: string };
  ApplyGig: { gigId: string };
  ApplyToGig: { gigId: string };
};

export type MyApplicationsStackParamList = {
  MyApplications: undefined;
  ApplicationDetails: { applicationId: string };
  ReviewForm: { gigId: string; revieweeId: string; revieweeName?: string };
};

export type JobSeekerProfileStackParamList = {
  ProfileHome: undefined;
  WorkHistory: { userId: string };
  Reputation: { userId: string; userName?: string };
  ReviewForm: { gigId: string; revieweeId: string; revieweeName?: string };
  VerificationRequest: undefined;
};

export type JobSeekerTabParamList = {
  Browse: undefined;
  MyApplicationsTab: undefined;
  Profile: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<JobSeekerStackParamList>();
const MyApplicationsStack = createNativeStackNavigator<MyApplicationsStackParamList>();
const ProfileStack = createNativeStackNavigator<JobSeekerProfileStackParamList>();
const Tab = createBottomTabNavigator<JobSeekerTabParamList>();

function JobSeekerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BrowseGigs" component={BrowseGigsScreen} />
      <Stack.Screen name="GigDetail" component={GigDetailScreen} />
      <Stack.Screen name="ApplyGig" component={ApplyGigScreen} />
      <Stack.Screen name="ApplyToGig" component={ApplyToGigScreen} />
    </Stack.Navigator>
  );
}

function MyApplicationsStackNavigator() {
  return (
    <MyApplicationsStack.Navigator screenOptions={{ headerShown: false }}>
      <MyApplicationsStack.Screen name="MyApplications" component={MyApplicationsScreen} />
      <MyApplicationsStack.Screen name="ApplicationDetails" component={ApplicationDetailsScreen} />
      <MyApplicationsStack.Screen name="ReviewForm" component={ReviewFormScreen} />
    </MyApplicationsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="WorkHistory" component={WorkHistoryScreen} />
      <ProfileStack.Screen name="Reputation" component={ReputationScreen} />
      <ProfileStack.Screen name="ReviewForm" component={ReviewFormScreen} />
      <ProfileStack.Screen name="VerificationRequest" component={VerificationRequestScreen} options={{ title: "Request Verification" }} />
    </ProfileStack.Navigator>
  );
}

export const JobSeekerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = "search";
          if (route.name === "MyApplicationsTab") iconName = "file-text";
          if (route.name === "Profile") iconName = "user";
          if (route.name === "Notifications") iconName = "bell";
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Browse" component={JobSeekerStack} options={{ title: "Gigs" }} />
      <Tab.Screen
        name="MyApplicationsTab"
        component={MyApplicationsStackNavigator}
        options={{ title: "Applications" }}
      />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: "Profile" }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Alerts" }}
      />
    </Tab.Navigator>
  );
};
