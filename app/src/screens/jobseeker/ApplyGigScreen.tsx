import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import { useGigs } from "../../context/GigContext";
import * as applicationApi from "../../api/applicationApi";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { applicationSchema } from "../../utils/validators";

export const ApplyGigScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { gigs } = useGigs();
  const { gigId } = route.params as { gigId: string };

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
    } catch (err) {
      setErrors({ message: "Could not submit. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!gig) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.success}>
          <Text style={styles.successTitle}>Application sent!</Text>
          <Text style={styles.successText}>
            {gig.shopOwnerName} will review your application and contact you soon.
          </Text>
          <Button
            title="Back to gigs"
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Apply for gig</Text>
          <Card style={styles.gigCard}>
            <Text style={styles.gigTitle}>{gig.title}</Text>
            <Text style={styles.gigShop}>{gig.shopOwnerName}</Text>
          </Card>

          <Input
            label="Why are you a good fit?"
            value={message}
            onChangeText={setMessage}
            multiline
            rows={5}
            placeholder="Write a short message to the shop owner..."
            error={errors.message}
          />

          {submitting ? (
            <LoadingSpinner message="Submitting..." />
          ) : (
            <Button title="Send application" onPress={handleSubmit} size="lg" />
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
  gigCard: {
    marginBottom: spacing.md,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  gigShop: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
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
