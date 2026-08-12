import React from "react";
import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";


interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const backgroundColors: Record<string, string> = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    outline: "transparent",
    danger: colors.danger,
  };

  const textColors: Record<string, string> = {
    primary: colors.textInverse,
    secondary: colors.text,
    outline: colors.primaryDark,
    danger: colors.textInverse,
  };

  const paddingSizes: Record<string, { py: number; px: number }> = {
    sm: { py: 8, px: 12 },
    md: { py: 12, px: 16 },
    lg: { py: 16, px: 24 },
  };

  const { py, px } = paddingSizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: backgroundColors[variant],
          paddingVertical: py,
          paddingHorizontal: px,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.borderStrong,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <Image
          source={require("../../../assets/images/loading.gif")}
          style={styles.loadingGif}
          resizeMode="contain"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { color: textColors[variant], fontSize: size === "lg" ? typography.sizes.md : typography.sizes.base },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  text: {
    fontWeight: "600",
  },
  loadingGif: {
    width: 28,
    height: 28,
  },
});
