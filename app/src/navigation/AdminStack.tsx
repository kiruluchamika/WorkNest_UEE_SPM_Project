import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { CategoryManagementScreen } from "../screens/admin/CategoryManagementScreen";
import { CategoryFormScreen } from "../screens/admin/CategoryFormScreen";
import { GigManagementScreen } from "../screens/admin/GigManagementScreen";
import { GigReviewScreen } from "../screens/admin/GigReviewScreen";
import { ReviewModerationScreen } from "../screens/admin/ReviewModerationScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";
import { GlassTabBar } from "./GlassTabBar";

export type CategoryStackParamList = {
  CategoryManagement: undefined;
  CategoryForm: { categoryId?: string } | undefined;
};

export type AdminGigStackParamList = {
  GigManagement: undefined;
  GigReview: { gigId: string };
};

export type AdminTabParamList = {
  CategoriesTab: undefined;
  GigsTab: undefined;
  ReviewsTab: undefined;
  NotificationsTab: undefined;
};

const CategoryStack = createNativeStackNavigator<CategoryStackParamList>();
const AdminGigStack = createNativeStackNavigator<AdminGigStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

function CategoryStackNavigator() {
  return (
    <CategoryStack.Navigator screenOptions={{ headerShown: false }}>
      <CategoryStack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <CategoryStack.Screen name="CategoryForm" component={CategoryFormScreen} />
    </CategoryStack.Navigator>
  );
}

function AdminGigStackNavigator() {
  return (
    <AdminGigStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminGigStack.Screen name="GigManagement" component={GigManagementScreen} />
      <AdminGigStack.Screen name="GigReview" component={GigReviewScreen} />
    </AdminGigStack.Navigator>
  );
}

export const AdminStack: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = "grid";
          if (route.name === "GigsTab") iconName = "briefcase";
          if (route.name === "ReviewsTab") iconName = "flag";
          if (route.name === "NotificationsTab") iconName = "bell";
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="GigsTab" component={AdminGigStackNavigator} options={{ title: "Gigs" }} />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoryStackNavigator}
        options={{ title: "Categories" }}
      />
      <Tab.Screen name="ReviewsTab" component={ReviewModerationScreen} options={{ title: "Reviews" }} />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ title: "Alerts" }}
      />
    </Tab.Navigator>
  );
};
