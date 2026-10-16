import { appScreenLayout } from "../components/common/AppBackground";
import { VerifiedJobSeekerManagementScreen } from "../screens/admin/VerifiedJobSeekerManagementScreen";
import { AdminVerificationRecordsScreen } from "../screens/admin/AdminVerificationRecordsScreen";
import { VerificationRequestDetailsScreen } from "../screens/verifier/VerificationRequestDetailsScreen";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { CategoryManagementScreen } from "../screens/admin/CategoryManagementScreen";
import { CategoryFormScreen } from "../screens/admin/CategoryFormScreen";
import { GigManagementScreen } from "../screens/admin/GigManagementScreen";
import { GigReviewScreen } from "../screens/admin/GigReviewScreen";
import { ReportsScreen } from "../screens/admin/ReportsScreen";
import { VerificationManagementScreen } from "../screens/admin/VerificationManagementScreen";
import { VerifierManagementScreen } from "../screens/admin/VerifierManagementScreen";
import { VerifierApprovalRequestsScreen } from "../screens/admin/VerifierApprovalRequestsScreen";
import { VerifierApplicationDetailScreen } from "../screens/admin/VerifierApplicationDetailScreen";
import { ApprovedVerifiersScreen, SuspendedVerifiersScreen, VerifierApprovalHistoryScreen } from "../screens/admin/VerifierRecordsScreen";
import { VerifierDetailsScreen } from "../screens/admin/VerifierDetailsScreen";
import { IncomingReactivationRequestsScreen } from "../screens/admin/IncomingReactivationRequestsScreen";
import { SuspensionHistoryScreen } from "../screens/admin/SuspensionHistoryScreen";
import { ReactivationRequestHistoryScreen } from "../screens/admin/ReactivationRequestHistoryScreen";
import { VerificationEmptyStateScreen } from "../screens/admin/VerificationEmptyStateScreen";
import { ReviewModerationScreen } from "../screens/admin/ReviewModerationScreen";
import { UserManagementScreen } from "../screens/admin/UserManagementScreen";
import { UserDetailScreen } from "../screens/admin/UserDetailScreen";
import { NotificationsScreen } from "../screens/shared/NotificationsScreen";
import { GlassTabBar } from "./GlassTabBar";

export type CategoryStackParamList = { CategoryManagement: undefined; CategoryForm: { categoryId?: string } | undefined };
export type AdminGigStackParamList = { GigManagement: undefined; GigReview: { gigId: string }; Reports: undefined };
export type AdminUserStackParamList = { UserManagement: undefined; UserDetail: { userId: string } };
export type AdminTabParamList = { CategoriesTab: undefined; GigsTab: undefined; UsersTab: undefined;VerificationOverviewTab: undefined; VerifierRequestsTab: undefined; ReviewsTab: undefined; NotificationsTab: undefined };
export type VerificationStackParamList = { VerifierApprovalRequests: undefined; VerifierApplicationDetail: { applicationId: string } };
export type VerificationManagementStackParamList = { VerifiedJobSeekerManagement: undefined; VerifiedJobSeekers: undefined; BadgeRevocationHistory: undefined; VerificationAdminGate: undefined; JobSeekerVerificationDetails: { userId: string }; VerificationRequestDetails: { id: string }; VerificationManagementHome: undefined; VerificationRequests: undefined; FlaggedReturnedCases: undefined; VerifierManagement: undefined; VerificationHistory: undefined; VerifierApprovalRequests: undefined; VerifierApplicationDetail: { applicationId: string }; ApprovedVerifiers: undefined; SuspendedVerifiers: undefined; IncomingReactivationRequests: undefined; VerifierDetails: { applicationId: string }; SuspensionHistory: { applicationId: string }; ReactivationRequestHistory: { applicationId: string; suspensionEventId: string; suspensionNumber: number }; VerifierApprovalHistory: undefined };

const CategoryStack=createNativeStackNavigator<CategoryStackParamList>(); const AdminGigStack=createNativeStackNavigator<AdminGigStackParamList>(); const RequestStack=createNativeStackNavigator<VerificationStackParamList>(); const ManagementStack=createNativeStackNavigator<VerificationManagementStackParamList>(); const Tab=createBottomTabNavigator<AdminTabParamList>();
const UserStack=createNativeStackNavigator<AdminUserStackParamList>();
function UserStackNavigator(){return <UserStack.Navigator screenLayout={appScreenLayout} screenOptions={{headerShown:false}}><UserStack.Screen name="UserManagement" component={UserManagementScreen}/><UserStack.Screen name="UserDetail" component={UserDetailScreen}/></UserStack.Navigator>}
function CategoryStackNavigator(){return <CategoryStack.Navigator screenLayout={appScreenLayout} screenOptions={{headerShown:false}}><CategoryStack.Screen name="CategoryManagement" component={CategoryManagementScreen}/><CategoryStack.Screen name="CategoryForm" component={CategoryFormScreen}/></CategoryStack.Navigator>}
function AdminGigStackNavigator(){return <AdminGigStack.Navigator screenLayout={appScreenLayout} screenOptions={{headerShown:false}}><AdminGigStack.Screen name="GigManagement" component={GigManagementScreen}/><AdminGigStack.Screen name="GigReview" component={GigReviewScreen}/><AdminGigStack.Screen name="Reports" component={ReportsScreen}/></AdminGigStack.Navigator>}
function VerificationStackNavigator(){return <RequestStack.Navigator screenLayout={appScreenLayout}><RequestStack.Screen name="VerifierApprovalRequests" component={VerifierApprovalRequestsScreen} options={{headerShown:false}}/><RequestStack.Screen name="VerifierApplicationDetail" component={VerifierApplicationDetailScreen} options={{title:"Application details"}}/></RequestStack.Navigator>}
function VerificationManagementStackNavigator(){return <ManagementStack.Navigator screenLayout={appScreenLayout} screenOptions={{headerBackTitle:"Back"}}><ManagementStack.Screen name="VerificationManagementHome" component={VerificationManagementScreen} options={{headerShown:false}}/><ManagementStack.Screen name="VerificationRequests" component={AdminVerificationRecordsScreen} options={{title:"Verification Requests"}}/><ManagementStack.Screen name="VerificationRequestDetails" component={VerificationRequestDetailsScreen} options={{title:"Verification request details"}}/><ManagementStack.Screen name="FlaggedReturnedCases" component={VerificationEmptyStateScreen} options={{title:"Flagged / Returned Cases"}}/><ManagementStack.Screen name="VerifiedJobSeekerManagement" component={VerifiedJobSeekerManagementScreen} options={{title:"Verified Job Seeker Management"}}/><ManagementStack.Screen name="VerifiedJobSeekers" component={VerifiedJobSeekerManagementScreen} options={{title:"Verified Job Seekers"}}/><ManagementStack.Screen name="BadgeRevocationHistory" component={VerifiedJobSeekerManagementScreen} options={{title:"Revocation History"}}/><ManagementStack.Screen name="VerificationAdminGate" component={VerifiedJobSeekerManagementScreen} options={{title:"Incoming Re-verification Requests"}}/><ManagementStack.Screen name="JobSeekerVerificationDetails" component={VerifiedJobSeekerManagementScreen} options={{title:"Verification Details"}}/><ManagementStack.Screen name="VerifierManagement" component={VerifierManagementScreen} options={{title:"Verifier Management"}}/><ManagementStack.Screen name="VerificationHistory" component={AdminVerificationRecordsScreen} options={{title:"Verification History"}}/><ManagementStack.Screen name="VerifierApprovalRequests" component={VerifierApprovalRequestsScreen} options={{title:"Approval Requests"}}/><ManagementStack.Screen name="VerifierApplicationDetail" component={VerifierApplicationDetailScreen} options={{title:"Application details"}}/><ManagementStack.Screen name="ApprovedVerifiers" component={ApprovedVerifiersScreen} options={{title:"Approved Verifiers"}}/><ManagementStack.Screen name="SuspendedVerifiers" component={SuspendedVerifiersScreen} options={{title:"Suspended Verifiers"}}/><ManagementStack.Screen name="IncomingReactivationRequests" component={IncomingReactivationRequestsScreen} options={{title:"Incoming Reactivation Requests"}}/><ManagementStack.Screen name="VerifierDetails" component={VerifierDetailsScreen} options={{title:"Verifier Details"}}/><ManagementStack.Screen name="SuspensionHistory" component={SuspensionHistoryScreen} options={{title:"Suspension History"}}/><ManagementStack.Screen name="ReactivationRequestHistory" component={ReactivationRequestHistoryScreen} options={{title:"Reactivation Request History"}}/><ManagementStack.Screen name="VerifierApprovalHistory" component={VerifierApprovalHistoryScreen} options={{title:"Approval History"}}/></ManagementStack.Navigator>}
export const AdminStack: React.FC = () => {
  return (
    <Tab.Navigator screenLayout={appScreenLayout}
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = "grid";
          if (route.name === "GigsTab") iconName = "briefcase";
          if (route.name === "UsersTab") iconName = "users";
          if (route.name === "VerificationOverviewTab") iconName = "activity";
          if (route.name === "VerifierRequestsTab") iconName = "shield";
          if (route.name === "ReviewsTab") iconName = "flag";
          if (route.name === "NotificationsTab") iconName = "bell";
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="GigsTab" component={AdminGigStackNavigator} options={{ title: "Gigs" }} />
      <Tab.Screen name="UsersTab" component={UserStackNavigator} options={{ title: "Users" }} />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoryStackNavigator}
        options={{ title: "Categories" }}
      />
      <Tab.Screen name="VerificationOverviewTab" component={VerificationManagementStackNavigator} options={{ title: "Verification" }} />
      <Tab.Screen name="VerifierRequestsTab" component={VerificationStackNavigator} options={{ title: "Requests" }} />
      <Tab.Screen name="ReviewsTab" component={ReviewModerationScreen} options={{ title: "Reviews" }} />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ title: "Alerts" }}
      />
    </Tab.Navigator>
  );
};
