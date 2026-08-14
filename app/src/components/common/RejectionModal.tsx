import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Button } from "./Button";

interface RejectionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
  submitting?: boolean;
}

const MIN_REASON_LENGTH = 5;

export const RejectionModal: React.FC<RejectionModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  submitting = false,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setError("Please provide a meaningful rejection reason.");
      return;
    }
    setError("");
    onSubmit(trimmed);
  };

  const handleCancel = () => {
    setReason("");
    setError("");
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        <View style={styles.sheet}>
          <View style={styles.iconCircle}>
            <Feather name="x-circle" size={20} color={colors.danger} />
          </View>
          <Text style={styles.title}>Reject Gig</Text>
          <Text style={styles.subtitle}>
            Please tell the business why this gig cannot be approved.
          </Text>

          <TextInput
            style={[styles.input, error ? { borderColor: colors.danger } : null]}
            value={reason}
            onChangeText={(v) => {
              setReason(v);
              if (error) setError("");
            }}
            placeholder="Rejection reason..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button title="Cancel" variant="outline" onPress={handleCancel} disabled={submitting} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Reject Gig"
                variant="danger"
                onPress={handleSubmit}
                loading={submitting}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 42, 46, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.medium,
    shadowColor: colors.shadow,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
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
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
    minHeight: 100,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
});
