import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { DashboardScreen } from "../screens/shopowner/DashboardScreen";
import { ApplicantsScreen } from "../screens/shopowner/ApplicantsScreen";
import { PostGigScreen } from "../screens/shopowner/PostGigScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";

export type ShopOwnerStackParamList = {
  DashboardHome: undefined;
  Applicants: { gigId: string };
};

export type ShopOwnerTabParamList = {
  Dashboard: undefined;
  PostGig: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<ShopOwnerStackParamList>();
const Tab = createBottomTabNavigator<ShopOwnerTabParamList>();

function ShopOwnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="Applicants" component={ApplicantsScreen} />
    </Stack.Navigator>
  );
}

export const ShopOwnerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = "grid";
          if (route.name === "PostGig") iconName = "plus-circle";
          if (route.name === "Notifications") iconName = "bell";
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#F4A261",
        tabBarInactiveTintColor: "#5D6D7E",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E1DA",
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ShopOwnerStack} options={{ title: "Dashboard" }} />
      <Tab.Screen name="PostGig" component={PostGigScreen} options={{ title: "Post Gig" }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Alerts" }}
      />
    </Tab.Navigator>
  );
};
