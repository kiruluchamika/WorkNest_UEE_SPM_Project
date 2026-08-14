import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate, gigStatusBadge } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

interface DetailRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value }) => (
  <View style={styles.row}>
    <View style={styles.rowIcon}>
      <Feather name={icon} size={13} color={colors.primaryDark} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>
);

export const GigPostDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { gigPosts, refresh, closeGig, removeGig, resubmitGig } = useGigPosts();
  const [busy, setBusy] = useState(false);

  const gig = gigPosts.find((g) => g.id === gigId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (!gig) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading gig..." />
      </SafeAreaView>
    );
  }

  const badge = gigStatusBadge(gig.status);

  const handleClose = () => {
    Alert.alert("Close this gig?", "Workers will no longer be able to see this opportunity.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close Gig",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await closeGig(gig.id);
          } catch (err) {
            Alert.alert(
              "Something went wrong",
              err instanceof Error ? err.message : "Could not close this gig."
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete this gig?", "This action may not be reversible.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await removeGig(gig.id);
            navigation.goBack();
          } catch (err) {
            Alert.alert(
              "Something went wrong",
              err instanceof Error ? err.message : "Could not delete this gig."
            );
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleResubmit = () => {
    Alert.alert(
      "Resubmit this gig?",
      "It will be sent back to the admin for another review.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resubmit",
          onPress: async () => {
            setBusy(true);
            try {
              await resubmitGig(gig.id);
              Alert.alert("Resubmitted", "Your gig is now waiting for admin approval.");
            } catch (err) {
              Alert.alert(
                "Something went wrong",
                err instanceof Error ? err.message : "Could not resubmit this gig."
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const schedule = [
    formatDate(gig.startDate),
    gig.startTime ? gig.startTime : null,
    gig.endDate ? `→ ${formatDate(gig.endDate)}` : null,
    gig.endTime ? gig.endTime : null,
  ]
    .filter(Boolean)
    .join("  ");

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <TrustBadge label={badge.label} variant={badge.variant} />
        </View>

        <Text style={styles.title}>{gig.title}</Text>
        <Text style={styles.category}>{gig.category?.name ?? "Uncategorized"}</Text>

        {gig.status === "REJECTED" ? (
          <Card style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Feather name="info" size={14} color={colors.warning} />
              <Text style={styles.rejectionTitle}>Gig Rejected</Text>
            </View>
            <Text style={styles.rejectionLabel}>Admin Feedback</Text>
            <Text style={styles.rejectionText}>
              {gig.rejectionReason || "No reason was provided by the admin."}
            </Text>
            <Text style={styles.rejectionHint}>
              Update the details below, then resubmit for another review.
            </Text>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{gig.description}</Text>
        </Card>

        <Card style={styles.card}>
          <DetailRow icon="map-pin" label="Location" value={gig.location} />
          <DetailRow
            icon="dollar-sign"
            label="Payment"
            value={`${formatCurrency(gig.paymentAmount)} / ${paymentTypeLabel(gig.paymentType)}`}
          />
          <DetailRow icon="calendar" label="Schedule" value={schedule || "Not specified"} />
          <DetailRow icon="users" label="Workers Needed" value={String(gig.workersNeeded)} />
          <DetailRow
            icon="award"
            label="Required Skills"
            value={gig.requiredSkills.length ? gig.requiredSkills.join(", ") : "Not specified"}
          />
          <DetailRow
            icon="phone"
            label="Contact Information"
            value={gig.contactInfo || "Not provided"}
          />
          <DetailRow icon="clock" label="Created" value={formatDate(gig.createdAt)} />
        </Card>

        {gig.status !== "CLOSED" ? (
          <Button
            title="Edit Gig"
            variant="outline"
            onPress={() => (navigation as any).navigate("GigForm", { gigId: gig.id })}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {gig.status === "ACTIVE" ? (
          <Button
            title="Close Gig"
            variant="secondary"
            onPress={handleClose}
            disabled={busy}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {gig.status === "REJECTED" ? (
          <Button
            title="Resubmit for Review"
            onPress={handleResubmit}
            disabled={busy}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        <Button title="Delete Gig" variant="danger" onPress={handleDelete} disabled={busy} />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  category: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  rejectionCard: {
    backgroundColor: "#FFF8E1",
    borderColor: colors.warning,
    marginBottom: spacing.md,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  rejectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginLeft: spacing.xs,
  },
  rejectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  rejectionText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  rejectionHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "600",
  },
});
