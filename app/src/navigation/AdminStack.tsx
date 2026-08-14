import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { colors } from "../theme/colors";
import { CategoryManagementScreen } from "../screens/admin/CategoryManagementScreen";
import { CategoryFormScreen } from "../screens/admin/CategoryFormScreen";
import { GigManagementScreen } from "../screens/admin/GigManagementScreen";
import { GigReviewScreen } from "../screens/admin/GigReviewScreen";

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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconName: keyof typeof Feather.glyphMap =
            route.name === "GigsTab" ? "briefcase" : "grid";
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
      <Tab.Screen name="GigsTab" component={AdminGigStackNavigator} options={{ title: "Gigs" }} />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoryStackNavigator}
        options={{ title: "Categories" }}
      />
    </Tab.Navigator>
  );
};
