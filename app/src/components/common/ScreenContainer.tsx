import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  RefreshControlProps,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: Edge[];
  keyboardAvoiding?: boolean;
  maxWidth?: number;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scroll = true,
  refreshControl,
  style,
  contentContainerStyle,
  edges = ["top", "left", "right", "bottom"],
  keyboardAvoiding = false,
  maxWidth = 760,
}) => {
  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        maxWidth ? { maxWidth, alignSelf: "center", width: "100%" } : null,
        contentContainerStyle,
      ]}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        styles.innerContent,
        maxWidth ? { maxWidth, alignSelf: "center", width: "100%" } : null,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  innerContent: {
    padding: spacing.md,
  },
});
