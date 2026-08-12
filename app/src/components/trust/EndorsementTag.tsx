import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface EndorsementTagProps {
  skill: string;
  verifierName?: string;
}

export const EndorsementTag: React.FC<EndorsementTagProps> = ({ skill, verifierName }) => {
  return (
    <View style={styles.container}>
      <Feather name="check-circle" size={12} color={colors.success} />
      <Text style={styles.skill}>{skill}</Text>
      {verifierName ? (
        <Text style={styles.verifier}>by {verifierName}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  skill: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.success,
    marginLeft: spacing.xs,
  },
  verifier: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
});
