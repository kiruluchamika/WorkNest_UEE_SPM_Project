import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import * as endorsementApi from "../../api/endorsementApi";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { AppHeader } from "../../components/common/AppHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { endorsementSchema } from "../../utils/validators";

const DEMO_SEEKERS = [
  { id: "user-1", name: "Amal Perera" },
  { id: "user-4", name: "Kasun Fernando" },
  { id: "user-5", name: "Dilani Perera" },
];

export const VerifierEndorseScreen: React.FC = () => {
  const { user } = useAuth();
  const [jobSeekerId, setJobSeekerId] = useState(DEMO_SEEKERS[0].id);
  const [skill, setSkill] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setErrors({});
    const result = endorsementSchema.safeParse({ jobSeekerId, skill, note });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const seeker = DEMO_SEEKERS.find((s) => s.id === jobSeekerId)!;
      await endorsementApi.createEndorsement({
        verifierId: user.id,
        verifierName: user.name,
        jobSeekerId: seeker.id,
        jobSeekerName: seeker.name,
        skill,
        note,
      });
      setSuccess(true);
    } catch (err) {
      setErrors({ form: "Could not submit endorsement." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader subtitle="Verifier endorsements" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View>
              <Text
                style={styles.title}
                accessibilityLabel="Community Verification"
                testID="community-verification-heading"
              >
                Community Verification
              </Text>
              <Text style={styles.subtitle}>Build reliable local work trust with verified skill notes.</Text>
            </View>
            <View style={styles.heroIcon}>
              <Feather name="shield" size={18} color={colors.success} />
            </View>
          </View>

          <View style={styles.metrics}>
            <Card style={styles.metricCard}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={styles.metricValue}>94</Text>
              <Text style={styles.metricLabel}>Verified</Text>
            </Card>
            <Card style={styles.metricCard}>
              <Feather name="users" size={14} color={colors.primaryDark} />
              <Text style={styles.metricValue}>128</Text>
              <Text style={styles.metricLabel}>Members</Text>
            </Card>
          </View>

          <Card style={styles.card}>
            <Text style={styles.label}>Select job seeker</Text>
            {DEMO_SEEKERS.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setJobSeekerId(s.id)}
                style={[
                  styles.seekerRow,
                  jobSeekerId === s.id && { backgroundColor: colors.successLight, borderColor: colors.success },
                ]}
              >
                <View style={styles.seekerAvatar}>
                  <Text style={styles.avatarText}>{s.name.split(" ").map((part) => part[0]).join("")}</Text>
                </View>
                <View style={styles.seekerCopy}>
                  <Text style={styles.seekerName}>{s.name}</Text>
                  <Text style={styles.seekerMeta}>Pending request</Text>
                </View>
                <Feather
                  name={jobSeekerId === s.id ? "check-circle" : "circle"}
                  size={18}
                  color={jobSeekerId === s.id ? colors.success : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
            {errors.jobSeekerId ? <Text style={styles.error}>{errors.jobSeekerId}</Text> : null}
          </Card>

          <Input
            label="Skill you are endorsing"
            value={skill}
            onChangeText={setSkill}
            placeholder="e.g. Customer service"
            error={errors.skill}
          />
          <Input
            label="Endorsement note"
            value={note}
            onChangeText={setNote}
            multiline
            rows={4}
            placeholder="Describe how you know this person and why they deserve this endorsement..."
            error={errors.note}
          />

          {success ? (
            <Card style={styles.successCard}>
              <Text style={styles.successTitle}>Endorsement submitted!</Text>
              <Text style={styles.successText}>It will appear on the seeker's profile.</Text>
            </Card>
          ) : null}

          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          {submitting ? (
            <LoadingSpinner message="Submitting..." />
          ) : (
            <Button title="Endorse" onPress={handleSubmit} size="lg" />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
    maxWidth: 250,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
  },
  metrics: {
    flexDirection: "row",
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    alignItems: "center",
    padding: spacing.sm,
  },
  metricValue: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  seekerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  seekerAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    fontWeight: "800",
  },
  seekerCopy: {
    flex: 1,
  },
  seekerName: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "800",
  },
  seekerMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
  },
  successCard: {
    backgroundColor: colors.successLight,
    marginBottom: spacing.md,
  },
  successTitle: {
    color: colors.success,
    fontWeight: "700",
    fontSize: typography.sizes.base,
    marginBottom: spacing.xs,
  },
  successText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
});
