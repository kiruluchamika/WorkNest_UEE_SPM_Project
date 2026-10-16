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
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
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
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" },
  title: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 22 },
  sectionTitle: { fontSize: typography.sizes.sm, fontWeight: "800", color: colors.primaryDark, marginBottom: spacing.md, lineHeight: 24 },
  error: { color: colors.danger, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: spacing.sm },
  metric: { width: "48%", marginBottom: spacing.md },
  number: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.primaryDark, lineHeight: 38 },
  metricLabel: { fontSize: typography.sizes.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 68, padding: spacing.md + spacing.xs, marginBottom: spacing.sm + spacing.xs, borderRadius: 16 },
  rowText: { flex: 1, fontSize: typography.sizes.sm, fontWeight: "700", color: colors.text, marginLeft: spacing.md, lineHeight: 22, flexShrink: 1 }});
