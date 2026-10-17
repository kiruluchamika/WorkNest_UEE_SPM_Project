import { toast } from "../../utils/toast";
import React, { useCallback, useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { confirmAction } from "../../utils/confirm";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAdminGigs } from "../../context/AdminGigContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { RejectionModal } from "../../components/common/RejectionModal";
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

interface SectionProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon, title, children }) => (
  <Card style={styles.card}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Feather name={icon} size={13} color={colors.primaryDark} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </Card>
);

export const GigReviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { gigs, refresh, approveGig, rejectGig } = useAdminGigs();
  const [busy, setBusy] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  const gig = gigs.find((g) => g.id === gigId);

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
  const isPending = gig.status === "PENDING";

  const schedule = [
    formatDate(gig.startDate),
    gig.startTime ? gig.startTime : null,
    gig.endDate ? `→ ${formatDate(gig.endDate)}` : null,
    gig.endTime ? gig.endTime : null,
  ]
    .filter(Boolean)
    .join("  ");

  const handleApprove = () => {
    confirmAction(
      "Approve this gig?",
      `"${gig.title}" will become active and visible to workers.`,
      "Approve",
      async () => {
        setBusy(true);
        try {
          await approveGig(gig.id);
          toast.success("Gig approved successfully.");
          navigation.goBack();
        } catch (err) {
          toast.error(
            "Something went wrong",
            err instanceof Error ? err.message : "Could not approve this gig."
          );
        } finally {
          setBusy(false);
        }
      }
    );
  };

  const handleReject = async (reason: string) => {
    setBusy(true);
    try {
      await rejectGig(gig.id, reason);
      setRejectModalVisible(false);
      navigation.goBack();
    } catch (err) {
      toast.error(
        "Something went wrong",
        err instanceof Error ? err.message : "Could not reject this gig."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <TrustBadge label={badge.label} variant={badge.variant} />
        </View>

        {gig.imageUrl ? (
          <Image source={{ uri: gig.imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : null}

        <Text style={styles.title}>{gig.title}</Text>
        <Text style={styles.category}>{gig.category?.name ?? "Uncategorized"}</Text>

        {gig.status === "REJECTED" && gig.rejectionReason ? (
          <Card style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Feather name="info" size={14} color={colors.warning} />
              <Text style={styles.rejectionTitle}>Previously Rejected</Text>
            </View>
            <Text style={styles.rejectionText}>{gig.rejectionReason}</Text>
          </Card>
        ) : null}

        <Section icon="briefcase" title="Business">
          <DetailRow icon="user" label="Business Name" value={gig.business?.name ?? "Unknown"} />
          <DetailRow icon="mail" label="Email" value={gig.business?.email ?? "Not available"} />
          {gig.business?.phone ? (
            <DetailRow icon="phone" label="Phone" value={gig.business.phone} />
          ) : null}
        </Section>

        <Section icon="file-text" title="Description">
          <Text style={styles.description}>{gig.description}</Text>
        </Section>

        <Section icon="clipboard" title="Gig Information">
          <DetailRow icon="tag" label="Category" value={gig.category?.name ?? "Uncategorized"} />
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
            label="Requirements"
            value={gig.requiredSkills.length ? gig.requiredSkills.join(", ") : "Not specified"}
          />
          <DetailRow icon="phone" label="Contact Information" value={gig.contactInfo || "Not provided"} />
          <DetailRow icon="clock" label="Submission Date" value={formatDate(gig.createdAt)} />
        </Section>

        {isPending ? (
          <View style={styles.actionsRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button
                title="Reject"
                variant="danger"
                onPress={() => setRejectModalVisible(true)}
                disabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Approve" onPress={handleApprove} disabled={busy} />
            </View>
          </View>
        ) : (
          <Text style={styles.finalizedNote}>
            This gig has already been reviewed and is no longer pending.
          </Text>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <RejectionModal
        visible={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        onSubmit={handleReject}
        submitting={busy}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
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
  heroImage: {
    width: "100%",
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    marginBottom: spacing.md,
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
    marginBottom: spacing.xs,
  },
  rejectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.text,
    marginLeft: spacing.xs,
  },
  rejectionText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
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
  actionsRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  finalizedNote: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
