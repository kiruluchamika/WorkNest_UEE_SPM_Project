import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { colors } from "../theme/colors";
import { BrowseGigsScreen } from "../screens/jobseeker/BrowseGigsScreen";
import { GigDetailScreen } from "../screens/jobseeker/GigDetailScreen";
import { ApplyGigScreen } from "../screens/jobseeker/ApplyGigScreen";
import { ApplyToGigScreen } from "../screens/jobseeker/ApplyToGigScreen";
import { ProfileScreen } from "../screens/jobseeker/ProfileScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";
import { VerificationRequestScreen } from "../screens/jobseeker/VerificationRequestScreen";

export type JobSeekerStackParamList = {
  BrowseGigs: undefined;
  GigDetail: { gigId: string };
  ApplyGig: { gigId: string };
  ApplyToGig: { gigId: string };
};

export type JobSeekerTabParamList = {
  Browse: undefined;
  Profile: undefined;
  Notifications: undefined;
};
export type JobSeekerProfileStackParamList={ProfileHome:undefined;VerificationRequest:undefined};

const Stack = createNativeStackNavigator<JobSeekerStackParamList>();
const Tab = createBottomTabNavigator<JobSeekerTabParamList>();
const ProfileStack=createNativeStackNavigator<JobSeekerProfileStackParamList>();
function JobSeekerProfileStack(){return <ProfileStack.Navigator><ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{headerShown:false}}/><ProfileStack.Screen name="VerificationRequest" component={VerificationRequestScreen} options={{title:"Request Verification"}}/></ProfileStack.Navigator>}

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

export const JobSeekerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = "search";
          if (route.name === "Profile") iconName = "user";
          if (route.name === "Notifications") iconName = "bell";
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#5D6D7E",
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      })}
    >
      <Tab.Screen name="Browse" component={JobSeekerStack} options={{ title: "Gigs" }} />
      <Tab.Screen name="Profile" component={JobSeekerProfileStack} options={{ title: "Profile" }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Alerts" }}
      />
    </Tab.Navigator>
  );
};
