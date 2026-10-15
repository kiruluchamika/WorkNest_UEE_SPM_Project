import React, { useCallback, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { VerificationManagementStackParamList } from "../../navigation/AdminStack";
import { listAdminVerificationHistory, listAdminVerificationRequests } from "../../api/verificationRequestsApi";
import type { VerificationRequest } from "../../types";
import { AppHeader } from "../../components/common/AppHeader";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const queues = ["ASSIGNED", "UNDER_REVIEW", "RETURNED_FOR_REVIEW"] as const;
const historyTabs = ["APPROVED", "REJECTED", "FLAGGED"] as const;
const labels = { ASSIGNED: "Assigned", UNDER_REVIEW: "Under Review", RETURNED_FOR_REVIEW: "Returned for Review", APPROVED: "Approved", REJECTED: "Rejected", FLAGGED: "Flagged" };

export function AdminVerificationRecordsScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<VerificationManagementStackParamList>>();
  const history = route.name === "VerificationHistory";
  const [queue, setQueue] = useState<typeof queues[number]>("ASSIGNED");
  const [tab, setTab] = useState<typeof historyTabs[number]>("APPROVED");
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError(""); setItems([]);
    try {
      const result = history ? await listAdminVerificationHistory(tab) : await listAdminVerificationRequests(queue);
      if (current === generation.current) setItems(result);
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : "Could not load records.");
    } finally { if (current === generation.current) setLoading(false); }
  }, [history, queue, tab]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const title = history ? "Verification History" : "Verification Requests";
  const selected = history ? tab : queue;
  return <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
    <AppHeader subtitle={title}/>
    <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.tabs}>{(history ? historyTabs : queues).map(value => <View key={value} style={styles.tab}>
        <Button style={styles.polishButton} textStyle={styles.polishButtonText} title={labels[value]} variant={selected === value ? "primary" : "outline"} onPress={() => {
          generation.current++; setItems([]); setLoading(true); setError("");
          if (history) setTab(value as typeof tab); else setQueue(value as typeof queue);
          if (selected === value) void load();
        }}/>
      </View>)}</View>
      {error ? <Card style={styles.polishPanel}><Text style={styles.error}>{error}</Text><Button style={styles.polishButton} textStyle={styles.polishButtonText} title="Retry" variant="outline" onPress={load}/></Card>
        : loading ? <LoadingSpinner message="Loading verification records..."/>
        : !items.length ? <Card style={styles.polishPanel}><Text style={styles.text}>No {labels[selected].toLowerCase()} requests found.</Text></Card>
        : items.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" onPress={() => navigation.navigate("VerificationRequestDetails", { id: item.id })}>
          <Card style={styles.card}>
            <Text style={styles.name}>{item.applicant?.name || "Applicant unavailable"}</Text>
            <Text style={styles.text}>Request ID: {item.id}</Text>
            <Text style={styles.text}>District: {item.district}</Text>
            <Text style={styles.text}>Assigned Verifier: {item.assignedVerifier?.name || "Not assigned"}</Text>
            <Text style={styles.text}>Submitted: {new Date(item.submittedAt).toLocaleString()}</Text>
            <Text style={styles.status}>Current status: {item.status.replace(/_/g, " ")}</Text>
            {history && tab === "FLAGGED" ? <Text style={styles.status}>FLAGGED HISTORY</Text> : null}
            {item.reviewStartedAt ? <Text style={styles.text}>Review started: {new Date(item.reviewStartedAt).toLocaleString()}</Text> : null}
            {item.decidedAt ? <Text style={styles.text}>Decision: {new Date(item.decidedAt).toLocaleString()}</Text> : null}
            {item.verifierNote ? <Text style={styles.text}>Verifier note: {item.verifierNote}</Text> : null}
            {item.rejectionReason ? <Text style={styles.text}>Rejection reason: {item.rejectionReason}</Text> : null}
            {item.wasFlagged ? <>
              {item.flagReason ? <Text style={styles.text}>Original flag: {item.flagReason}</Text> : null}
              {item.flaggedAt ? <Text style={styles.text}>Flagged: {new Date(item.flaggedAt).toLocaleString()}</Text> : null}
              {item.adminResponse ? <Text style={styles.text}>Admin response: {item.adminResponse}</Text> : null}
              {item.adminReviewedAt ? <Text style={styles.text}>Admin reviewed: {new Date(item.adminReviewedAt).toLocaleString()}</Text> : null}
            </> : null}
          </Card>
        </TouchableOpacity>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" },
  title: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 },
  tabs: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 0, columnGap: spacing.sm + spacing.xs, marginBottom: spacing.md },
  tab: { flexGrow: 1, flexBasis: 120, minWidth: 120, marginHorizontal: 0 },
  card: { marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 },
  name: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.text, lineHeight: 26, flexShrink: 1 },
  text: { fontSize: typography.sizes.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 22 },
  status: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.primaryDark, marginTop: spacing.sm },
  error: { color: colors.danger }, polishButton: { marginTop: spacing.sm, marginBottom: spacing.xs, minHeight: 50, paddingVertical: spacing.sm, borderRadius: 14 }, polishButtonText: { textAlign: "center", flexShrink: 1, lineHeight: 20 }, polishPanel: { marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 }});
