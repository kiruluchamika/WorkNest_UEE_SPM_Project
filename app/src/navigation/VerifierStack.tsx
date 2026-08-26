import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { VerifierEndorseScreen } from "../screens/trust/VerifierEndorseScreen";
import { VerifierApplicationStatusScreen } from "../screens/verifier/VerifierApplicationStatusScreen";
import { VerifierApprovalSuccessScreen } from "../screens/verifier/VerifierApprovalSuccessScreen";
import { VerifierReapplicationScreen } from "../screens/verifier/VerifierReapplicationScreen";
import { VerifierReactivationRequestScreen } from "../screens/verifier/VerifierReactivationRequestScreen";
import type { VerifierReactivationRequest } from "../types";

export type VerifierStackParamList = { VerifierStatus: { reactivationRequest?: VerifierReactivationRequest } | undefined; VerifierApprovalSuccess: undefined; VerifierReapplication: undefined; VerifierReactivationRequest: undefined; VerifierDashboard: undefined };
const Stack=createNativeStackNavigator<VerifierStackParamList>();

export const VerifierStack:React.FC=()=>{const{user}=useAuth();const application=user?.verifierApplication;const initial=application?.status==="APPROVED"?(application.approvalAcknowledgedAt?"VerifierDashboard":"VerifierApprovalSuccess"):"VerifierStatus";const stateKey=`${application?.id}-${application?.status}-${application?.approvalAcknowledgedAt??"unseen"}`;return <Stack.Navigator key={stateKey} initialRouteName={initial} screenOptions={{headerBackTitle:"Back"}}><Stack.Screen name="VerifierStatus" component={VerifierApplicationStatusScreen} options={{headerShown:false}}/><Stack.Screen name="VerifierApprovalSuccess" component={VerifierApprovalSuccessScreen} options={{headerShown:false}}/><Stack.Screen name="VerifierReapplication" component={VerifierReapplicationScreen} options={{title:"Apply Again"}}/><Stack.Screen name="VerifierReactivationRequest" component={VerifierReactivationRequestScreen} options={{title:"Request Reactivation"}}/><Stack.Screen name="VerifierDashboard" component={VerifierEndorseScreen} options={{headerShown:false}}/></Stack.Navigator>};
