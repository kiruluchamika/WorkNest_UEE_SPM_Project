import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import type { VerificationManagementStackParamList } from "../../navigation/AdminStack";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { FlaggedVerificationCasesScreen } from "./FlaggedVerificationCasesScreen";

type EmptyRoute = "VerificationRequests" | "FlaggedReturnedCases" | "VerificationHistory" | "SuspendedVerifiers";
const copy: Record<EmptyRoute, { title: string; message: string }> = {
  VerificationRequests: { title: "Verification Requests", message: "Youth verification requests have not been implemented yet." },
  FlaggedReturnedCases: { title: "Flagged / Returned Cases", message: "Flagged and returned verification cases will appear here when that workflow is available." },
  VerificationHistory: { title: "Verification History", message: "Completed verification-request history will appear here when verification requests are implemented." },
  SuspendedVerifiers: { title: "Suspended Verifiers", message: "Verifier suspension is not implemented in the current data model." },
};
export const VerificationEmptyStateScreen: React.FC = () => {
  const route = useRoute<RouteProp<VerificationManagementStackParamList, EmptyRoute>>(); const content = copy[route.name];
  if (route.name === "FlaggedReturnedCases") return <FlaggedVerificationCasesScreen />;
  return <SafeAreaView style={styles.container}><AppHeader subtitle={content.title} /><View style={styles.content}><Card style={styles.card}><View style={styles.icon}><Feather name="inbox" size={24} color={colors.primaryDark} /></View><Text style={styles.title}>Nothing to show yet</Text><Text style={styles.message}>{content.message}</Text></Card></View></SafeAreaView>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},content:{ padding:spacing.md, paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" },card:{ alignItems:"center", marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 },icon:{width:48,height:48,borderRadius:radius.full,backgroundColor:colors.primarySoft,alignItems:"center",justifyContent:"center",marginBottom:spacing.md},title:{ fontSize:typography.sizes.base, fontWeight:"800", color:colors.text, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 },message:{ fontSize:typography.sizes.sm, color:colors.textMuted, textAlign:"center", marginTop:spacing.sm, lineHeight: 22 }});
