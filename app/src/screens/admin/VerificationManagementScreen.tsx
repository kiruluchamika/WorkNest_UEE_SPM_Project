import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getAdminVerificationOverview } from "../../api/verificationRequestsApi";
import type { AdminVerificationOverview } from "../../types";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const metrics: Array<{ label: string; key: keyof AdminVerificationOverview }> = [
  { label: "Requests Today", key: "requestsToday" },
  { label: "Approved Today", key: "approvedToday" },
  { label: "Rejected Today", key: "rejectedToday" },
  { label: "Flagged Today", key: "flaggedToday" },
  { label: "Awaiting Review", key: "awaitingReview" },
  { label: "Under Review", key: "underReview" },
];
const areas = [
  { label: "Verification Requests", route: "VerificationRequests", icon: "clipboard" },
  { label: "Flagged / Returned Cases", route: "FlaggedReturnedCases", icon: "flag" },
  { label: "Verifier Management", route: "VerifierManagement", icon: "shield" },
  { label: "Verification History", route: "VerificationHistory", icon: "clock" },
] as const;

export const VerificationManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [overview, setOverview] = useState<AdminVerificationOverview>();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try { setOverview(await getAdminVerificationOverview()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load verification overview."); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <SafeAreaView style={styles.container}><AppHeader subtitle="Verification management" /><ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
    <Text style={styles.eyebrow}>VERIFICATION OVERVIEW</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.grid}>{metrics.map((metric) => <Card key={metric.key} style={styles.metric}><Text style={styles.number}>{overview?.[metric.key] ?? "—"}</Text><Text style={styles.metricLabel}>{metric.label}</Text></Card>)}</View>
    <Text style={styles.heading}>Management areas</Text>
    {areas.map((item) => <TouchableOpacity key={item.route} onPress={() => (navigation as any).navigate(item.route)} style={styles.row}><Feather name={item.icon} size={18} color={colors.primaryDark} /><Text style={styles.rowText}>{item.label}</Text><Feather name="chevron-right" size={18} color={colors.textMuted} /></TouchableOpacity>)}
  </ScrollView></SafeAreaView>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},scroll:{padding:spacing.md},eyebrow:{fontSize:typography.sizes.sm,fontWeight:"800",color:colors.primaryDark,marginBottom:spacing.md},error:{fontSize:typography.sizes.sm,color:colors.danger,marginBottom:spacing.md},grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between"},metric:{width:"48%",marginBottom:spacing.sm},number:{fontSize:typography.sizes.lg,fontWeight:"800",color:colors.primaryDark},metricLabel:{fontSize:typography.sizes.xs,color:colors.textMuted},heading:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text,marginTop:spacing.lg,marginBottom:spacing.sm},row:{flexDirection:"row",alignItems:"center",backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.sm},rowText:{flex:1,fontSize:typography.sizes.sm,fontWeight:"700",color:colors.text,marginLeft:spacing.sm}});
