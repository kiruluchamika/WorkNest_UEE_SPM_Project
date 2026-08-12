import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface GoogleButtonProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({
  onPress,
  loading = false,
  label = "Continue with Google",
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <Image
          source={require("../../../assets/images/loading.gif")}
          style={styles.loadingGif}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.content}>
          <MaterialCommunityIcons name="google" size={18} color="#EA4335" />
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.base,
    fontWeight: "600",
    color: colors.text,
  },
  loadingGif: {
    width: 28,
    height: 28,
  },
});
