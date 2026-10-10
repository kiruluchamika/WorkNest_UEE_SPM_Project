import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { getVerifierDashboard, setVerifierAvailability } from "../../api/verificationRequestsApi";
import type { VerifierDashboardData, VerificationRequestStatus } from "../../types";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Button } from "../../components/common/Button";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const VerifierDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigation();
  const [data, setData] = useState<VerifierDashboardData>();
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { getVerifierDashboard().then(setData); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <LoadingSpinner fullScreen message="Loading verifier dashboard..." />;

  const queue = (label: string, count: number, status: VerificationRequestStatus) => (
    <TouchableOpacity onPress={() => (nav as any).navigate("VerificationQueue", { title: label, status })}>
      <Card style={s.row}>
        <Text style={s.rowText}>{label}</Text>
        <Text style={s.count}>{count}</Text>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </Card>
    </TouchableOpacity>
  );
  const metric = (label: string, value: number) => (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );

  const isAvailable = !!data.application?.isAvailable;
  const updateAvailability = async (value: boolean) => {
    setBusy(true);
    try {
      await setVerifierAvailability(value);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <AppHeader subtitle="Community Verifier" />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Welcome, {user?.name}</Text>
        <Text style={s.muted}>{data.application?.district || "District not available"}</Text>
        <Card style={s.availability}>
          <View style={s.availabilityCopy}>
            <Text style={s.section}>Availability</Text>
            <Text style={s.muted}>Receive new district-matched assignments</Text>
          </View>
          <View style={s.switchGroup}>
            <Switch
              value={isAvailable}
              onValueChange={updateAvailability}
              disabled={busy}
              trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
              thumbColor={isAvailable ? colors.primary : colors.textMuted}
            />
            <Text style={s.availabilityStatus}>{isAvailable ? "Available" : "Unavailable"}</Text>
          </View>
        </Card>
        <Text style={s.section}>Today's Platform Summary</Text>
        <Card style={s.grid}>
          {metric("Requests Today", data.today.assigned)}
          {metric("Approved Today", data.today.approved)}
          {metric("Rejected Today", data.today.rejected)}
          {metric("Flagged Today", data.today.flagged)}
        </Card>
        <Text style={s.section}>My Verification Requests</Text>
        {queue("Awaiting Review", data.queues.awaiting, "ASSIGNED")}
        {queue("Under Review", data.queues.underReview, "UNDER_REVIEW")}
        {queue("Returned for Review", data.queues.returned, "RETURNED_FOR_REVIEW")}
        <Text style={s.section}>My Work · Today</Text>
        <Card style={s.grid}>
          {metric("Approved Today", data.today.approved)}
          {metric("Rejected Today", data.today.rejected)}
          {metric("Flagged Today", data.today.flagged)}
        </Card>
        <Text style={s.section}>My Work · All Time</Text>
        <Card style={s.grid}>
          {metric("Assigned", data.allTime.assigned)}
          {metric("Approved", data.allTime.approved)}
          {metric("Rejected", data.allTime.rejected)}
          {metric("Flagged", data.allTime.flagged)}
        </Card>
        <Button title="Verification History" variant="outline" onPress={() => (nav as any).navigate("VerificationHistory")} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: spacing.md },
  title: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text },
  muted: { fontSize: typography.sizes.sm, color: colors.textMuted },
  section: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.text, marginVertical: spacing.md },
  availability: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  availabilityCopy: { flex: 1 },
  switchGroup: { alignItems: "center", marginLeft: spacing.sm },
  availabilityStatus: { fontSize: typography.sizes.xs, fontWeight: "700", color: colors.textMuted, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  rowText: { flex: 1, fontSize: typography.sizes.sm, fontWeight: "700", color: colors.text },
  count: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.primaryDark, marginRight: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  metric: { width: "50%", padding: spacing.sm },
  metricValue: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.primaryDark },
  metricLabel: { fontSize: typography.sizes.xs, color: colors.textMuted },
});
