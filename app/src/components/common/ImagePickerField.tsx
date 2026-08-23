import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { pickImageFromLibrary, captureImageFromCamera } from "../../utils/imagePicker";

interface ImagePickerFieldProps {
  label?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  error?: string;
}

export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  label,
  value,
  onChange,
  error,
}) => {
  const [loading, setLoading] = useState(false);

  const runPick = async (picker: () => Promise<string | null>) => {
    setLoading(true);
    try {
      const uri = await picker();
      if (uri) onChange(uri);
    } catch (err) {
      Alert.alert("Something went wrong", "Could not process that image. Try another one.");
    } finally {
      setLoading(false);
    }
  };

  const openOptions = () => {
    const options: Array<{ text: string; onPress?: () => void; style?: "cancel" | "destructive" }> = [
      { text: "Choose from Library", onPress: () => runPick(pickImageFromLibrary) },
      { text: "Take Photo", onPress: () => runPick(captureImageFromCamera) },
    ];
    if (value) {
      options.push({ text: "Remove Photo", style: "destructive", onPress: () => onChange(undefined) });
    }
    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert(label || "Photo", "Add a photo for this gig", options);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.box, error ? { borderColor: colors.danger } : null]}
        activeOpacity={0.85}
        onPress={openOptions}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : value ? (
          <>
            <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
            <View style={styles.editBadge}>
              <Feather name="edit-2" size={12} color={colors.textInverse} />
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Feather name="camera" size={20} color={colors.primaryDark} />
            </View>
            <Text style={styles.placeholderText}>Add Photo</Text>
            <Text style={styles.placeholderHint}>From your library or camera</Text>
          </View>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  box: {
    height: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  editBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: "rgba(31, 42, 46, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    alignItems: "center",
  },
  placeholderIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  placeholderHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
