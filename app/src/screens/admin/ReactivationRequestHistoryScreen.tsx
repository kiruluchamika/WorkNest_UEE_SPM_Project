import { toast } from "../../utils/toast";
import { DocumentEvidence } from "../../components/common/DocumentField";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { VerificationManagementStackParamList } from "../../navigation/AdminStack";
import type { VerifierApplication } from "../../types";
import { getApplication } from "../../api/verifierApplicationsApi";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { formatVerifierDateTime } from "../../utils/verifierDates";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const ReactivationRequestHistoryScreen: React.FC = () => {
  const route = useRoute<RouteProp<VerificationManagementStackParamList, "ReactivationRequestHistory">>();
  const [application, setApplication] = useState<VerifierApplication>();
  useEffect(() => {
    getApplication(route.params.applicationId).then(setApplication).catch((error) => toast.error("Error", error instanceof Error ? error.message : "Could not load reactivation request history."));
  }, [route.params.applicationId]);
  const requests = useMemo(() => (application?.reactivationRequests ?? [])
    .filter((request) => request.suspensionEventId === route.params.suspensionEventId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [application, route.params.suspensionEventId]);
  if (!application) return <LoadingSpinner fullScreen message="Loading reactivation request history..."/>;
  const field = (label: string, value: string) => <View style={styles.field}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
  return <SafeAreaView style={styles.container}>
    <AppHeader subtitle="Reactivation Request History"/>
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Reactivation Request History</Text>
      <Text style={styles.subtitle}>{application.applicant.name} · Suspension #{route.params.suspensionNumber}</Text>
      {!requests.length ? <Card style={styles.polishPanel}><Text style={styles.empty}>No reactivation requests found.</Text></Card> : requests.map((request, index) =>
        <Card key={request.id} style={styles.card}>
          <View style={styles.heading}><Text style={styles.requestTitle}>Reactivation Request #{index + 1}</Text><Text style={[styles.status, styles[request.status.toLowerCase() as "pending" | "approved" | "rejected"]]}>{request.status}</Text></View>
          {field("Submitted", formatVerifierDateTime(request.createdAt))}
          {field("Explanation", request.explanation || "Not available")}
          {field("Supporting Evidence", request.attachmentReference ? "Attached" : "Not provided")}
          <DocumentEvidence label="Supporting document" value={request.attachmentReference}/>
          {request.reviewedAt ? field("Reviewed", formatVerifierDateTime(request.reviewedAt)) : null}
          {request.reviewer ? field("Reviewed by", request.reviewer.name) : null}
          {request.reviewReason ? field("Admin Response", request.reviewReason) : null}
        </Card>)}
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},scroll:{ padding: spacing.lg, paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" },title:{ fontSize:typography.sizes.lg, fontWeight:"800", color:colors.text, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 },subtitle:{ fontSize:typography.sizes.sm, color:colors.textMuted, marginTop:spacing.xs, marginBottom:spacing.lg, lineHeight: 22 },card:{ marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 },heading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:spacing.md},requestTitle:{ fontSize:typography.sizes.base, fontWeight:"800", color:colors.primaryDark, flex:1, lineHeight: 24 },status:{fontSize:typography.sizes.xs,fontWeight:"800",marginLeft:spacing.sm},pending:{color:colors.warning},approved:{color:colors.primaryDark},rejected:{color:colors.danger},field:{ marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },label:{ fontSize:typography.sizes.xs, color:colors.textMuted, fontWeight: "700", lineHeight: 18, marginBottom: spacing.xs + 2 },value:{ fontSize:typography.sizes.sm, color:colors.text, marginTop:2, lineHeight: 22, fontWeight: "600" },empty:{ fontSize:typography.sizes.sm, color:colors.textMuted, textAlign:"center", lineHeight: 22 }, polishPanel: { marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 }});
