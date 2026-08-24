import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { colors } from "../theme/colors";
import { DashboardScreen } from "../screens/shopowner/DashboardScreen";
import { ApplicantsScreen } from "../screens/shopowner/ApplicantsScreen";
import { MyGigsScreen } from "../screens/shopowner/MyGigsScreen";
import { GigPostDetailScreen } from "../screens/shopowner/GigPostDetailScreen";
import { GigPostFormScreen } from "../screens/shopowner/GigPostFormScreen";
import { ApplicationSettingsScreen } from "../screens/shopowner/ApplicationSettingsScreen";
import { ProfileScreen } from "../screens/shopowner/ProfileScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";

export type ShopOwnerStackParamList = {
  DashboardHome: undefined;
  Applicants: { gigId: string };
  Profile: undefined;
};

export type MyGigsStackParamList = {
  MyGigs: undefined;
  GigDetail: { gigId: string };
  GigForm: { gigId?: string } | undefined;
  ApplicationSettings: { gigId: string };
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="Applicants" component={ApplicantsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function MyGigsStackNavigator() {
  return (
    <MyGigsStack.Navigator screenOptions={{ headerShown: false }}>
      <MyGigsStack.Screen name="MyGigs" component={MyGigsScreen} />
      <MyGigsStack.Screen name="GigDetail" component={GigPostDetailScreen} />
      <MyGigsStack.Screen name="GigForm" component={GigPostFormScreen} />
      <MyGigsStack.Screen name="ApplicationSettings" component={ApplicationSettingsScreen} />
    </MyGigsStack.Navigator>
  );
}

export const ShopOwnerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = "grid";
          if (route.name === "MyGigsTab") iconName = "briefcase";
          if (route.name === "PostGig") iconName = "plus-circle";
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
