import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as reviewApi from "../../api/reviewApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { toast } from "../../utils/toast";

export const ReviewFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId, revieweeId, revieweeName } =
    (route.params as { gigId: string; revieweeId: string; revieweeName?: string }) || {};

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError("Please select a rating.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await reviewApi.submitReview(gigId, { revieweeId, rating, comment: comment.trim() || undefined });
      toast.success("Review submitted", "Thanks for your feedback.");
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave a Review</Text>
        </View>

        <Card style={styles.card}>
          {revieweeName ? <Text style={styles.subtitle}>Reviewing {revieweeName}</Text> : null}

          <Text style={styles.label}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)} activeOpacity={0.7}>
                <Feather
                  name="star"
                  size={32}
                  color={value <= rating ? colors.warning : colors.border}
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Comment (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            rows={4}
            placeholder="Share how it went..."
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Submit Review" onPress={handleSubmit} loading={submitting} />
        </Card>
      </ScrollView>
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
    marginBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  starsRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  star: {
    marginRight: spacing.sm,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
