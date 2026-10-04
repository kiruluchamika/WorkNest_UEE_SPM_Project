import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  icon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  multiline?: boolean;
  rows?: number;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  required = false,
  error,
  helperText,
  icon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  rows = 1,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
        </View>
      ) : null}

      <View
        style={[
          styles.inputWrap,
          multiline && {
            minHeight: rows * 24 + spacing.md * 2,
            alignItems: "flex-start",
          },
          isFocused ? styles.inputWrapFocused : null,
          error ? styles.inputWrapError : null,
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={18}
            color={isFocused ? colors.primaryDark : colors.textMuted}
            style={[styles.leftIcon, multiline && { marginTop: spacing.md }]}
          />
        ) : null}

        <TextInput
          style={[
            styles.input,
            multiline && {
              height: rows * 24 + spacing.md * 2,
              textAlignVertical: "top",
              paddingTop: spacing.md,
            },
            style,
          ]}
          placeholderTextColor={colors.textPlaceholder}
          multiline={multiline}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...textInputProps}
        />

        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={[styles.rightIcon, multiline && { marginTop: spacing.md }]}
          >
            <Feather name={rightIcon} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  requiredAsterisk: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.danger,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  inputWrapFocused: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.surface,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
    padding: 4,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    fontSize: typography.sizes.sm,
    color: colors.text,
    minHeight: 44,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: 4,
  },
  error: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    fontWeight: "600",
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
