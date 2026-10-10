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
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useGigs } from "../../context/GigContext";
import * as applicationApi from "../../api/applicationApi";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { SectionHeader } from "../../components/common/SectionHeader";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { applicationSchema } from "../../utils/validators";

export const ApplyGigScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { gigs } = useGigs();
  const { gigId } = (route.params as { gigId: string }) || {};

  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const gig = gigs.find((g) => g.id === gigId);

  const handleSubmit = async () => {
    setErrors({});
    const result = applicationSchema.safeParse({ message });
    if (!result.success) {
      setErrors({ message: result.error.issues[0].message });
      return;
    }
    if (!user || !gig) return;

    setSubmitting(true);
    try {
      await applicationApi.applyForGig(gig.id, gig.title, user.id, user.name, message);
      setSuccess(true);
    } catch {
      setErrors({ message: "Could not submit application. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!gig) {
    return <LoadingSpinner fullScreen message="Loading gig details..." />;
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <Feather name="check" size={32} color={colors.successText} />
          </View>
          <Text style={styles.successTitle}>Application Sent!</Text>
          <Text style={styles.successText}>
            {gig.shopOwnerName} will review your application and contact you soon.
          </Text>
          <Button
            title="Browse More Gigs"
            onPress={() => navigation.navigate("Browse" as never)}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Apply to Gig</Text>
            <View style={{ width: 36 }} />
          </View>

          <Card style={styles.gigCard}>
            <Text style={styles.gigTitle}>{gig.title}</Text>
            <Text style={styles.gigShop}>{gig.shopOwnerName}</Text>
          </Card>

          <Card style={styles.formCard}>
            <SectionHeader title="Application Message" />
            <Input
              label="Why are you a good fit?"
              required
              value={message}
              onChangeText={setMessage}
              multiline
              rows={4}
              placeholder="Write a short message to the business..."
              error={errors.message}
            />

            <Button
              title="Send Application"
              icon="send"
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          </Card>
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
    padding: spacing.md,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  navTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  gigCard: {
    marginBottom: spacing.md,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  gigShop: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  formCard: {
    marginBottom: spacing.md,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.successText,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  successText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
});
