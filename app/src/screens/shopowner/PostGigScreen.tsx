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
import { useNavigation } from "@react-navigation/native";


import { useAuth } from "../../context/AuthContext";
import { useGigs } from "../../context/GigContext";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { GIG_CATEGORIES, WAGE_TYPES } from "../../utils/constants";
import { gigPostSchema } from "../../utils/validators";
import type { GigCategory } from "../../types";

export const PostGigScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { addGig } = useGigs();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GigCategory>("general");
  const [location, setLocation] = useState("");
  const [wage, setWage] = useState("");
  const [wageType, setWageType] = useState<"hour" | "day" | "fixed">("hour");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [startDate, setStartDate] = useState("2026-08-20");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setErrors({});
    const result = gigPostSchema.safeParse({
      title,
      description,
      category,
      location,
      wage,
      wageType,
      requiredSkills,
      startDate,
    });

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
      await addGig({
        title,
        description,
        category,
        location,
        wage: Number(wage),
        wageType,
        requiredSkills: requiredSkills.split(",").map((s) => s.trim()),
        startDate,
        shopOwnerId: user.id,
        shopOwnerName: user.name,
        status: "open",
      });
      setSuccess(true);
    } catch (err) {
      setErrors({ form: "Could not post gig. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.success}>
          <Text style={styles.successTitle}>Gig posted!</Text>
          <Text style={styles.successText}>You can view it on your dashboard and approve applicants.</Text>
          <Button
            title="Back to dashboard"
            onPress={() => navigation.navigate("Dashboard" as never)}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Post a new gig</Text>

          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Weekend Café Assistant"
            error={errors.title}
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            rows={4}
            placeholder="Describe the role, tasks, and expectations..."
            error={errors.description}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {GIG_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                onPress={() => setCategory(c.value as GigCategory)}
                style={[
                  styles.chip,
                  category === c.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.chipText, category === c.value && { color: colors.textInverse, fontWeight: "700" }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Colombo 05"
            error={errors.location}
          />

          <View style={styles.wageRow}>
            <View style={styles.wageInput}>
              <Input
                label="Wage"
                value={wage}
                onChangeText={setWage}
                keyboardType="numeric"
                placeholder="800"
                error={errors.wage}
              />
            </View>
            <View style={styles.wageTypeInput}>
              <Text style={styles.label}>Per</Text>
              <View style={styles.chipRow}>
                {WAGE_TYPES.map((wt) => (
                  <TouchableOpacity
                    key={wt.value}
                    onPress={() => setWageType(wt.value)}
                    style={[
                      styles.chip,
                      wageType === wt.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.chipText, wageType === wt.value && { color: colors.textInverse, fontWeight: "700" }]}>
                      {wt.label.replace("Per ", "")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Input
            label="Required skills (comma separated)"
            value={requiredSkills}
            onChangeText={setRequiredSkills}
            placeholder="Customer service, Cash handling"
            error={errors.requiredSkills}
          />
          <Input
            label="Start date"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            error={errors.startDate}
          />

          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          {submitting ? (
            <LoadingSpinner message="Posting gig..." />
          ) : (
            <Button title="Post gig" onPress={handleSubmit} size="lg" />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  wageRow: {
    flexDirection: "row",
  },
  wageInput: {
    flex: 1,
    marginRight: spacing.md,
  },
  wageTypeInput: {
    width: 120,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
  },
  success: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.success,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  successText: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    textAlign: "center",
  },
});
