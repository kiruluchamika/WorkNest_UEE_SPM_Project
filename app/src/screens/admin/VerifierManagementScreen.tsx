import React from "react";
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useVerifierOverview } from "./VerifierRecordsScreen";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const destinations = [
  { label: "Approval Requests", route: "VerifierApprovalRequests", icon: "inbox" },
  { label: "Approved Verifiers", route: "ApprovedVerifiers", icon: "check-circle" },
  { label: "Suspended Verifiers", route: "SuspendedVerifiers", icon: "slash" },
  { label: "Approval History", route: "VerifierApprovalHistory", icon: "clock" },
] as const;

export const VerifierManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { items, loading, error, load, count } = useVerifierOverview();
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader subtitle="Verifier management" />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={styles.title}>Verifier Management</Text>
        <Text style={styles.subtitle}>Review applications and access verifier records.</Text>
        <Text style={styles.sectionTitle}>VERIFIER OVERVIEW</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !items.length ? (
          <LoadingSpinner message="Loading overview..." />
        ) : (
          <View style={styles.grid}>
            {(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const).map((status) => (
              <Card key={status} style={styles.metric}>
                <Text style={styles.number}>{count(status)}</Text>
                <Text style={styles.metricLabel}>{status.charAt(0) + status.slice(1).toLowerCase()}</Text>
              </Card>
            ))}
          </View>
        )}
        <Text style={styles.sectionTitle}>MANAGEMENT SECTIONS</Text>
        {destinations.map((item) => (
          <TouchableOpacity key={item.route} style={styles.row} onPress={() => (navigation as any).navigate(item.route)}>
            <Feather name={item.icon} size={18} color={colors.primaryDark} />
            <Text style={styles.rowText}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  title: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  sectionTitle: { fontSize: typography.sizes.sm, fontWeight: "800", color: colors.primaryDark, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: spacing.sm },
  metric: { width: "48%", marginBottom: spacing.md },
  number: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.primaryDark },
  metricLabel: { fontSize: typography.sizes.sm, color: colors.textMuted, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowText: { flex: 1, fontSize: typography.sizes.sm, fontWeight: "700", color: colors.text, marginLeft: spacing.md },
});
