import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "RoleSelect">;

export const RoleSelectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={require("../../../assets/images/landing01.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
        <Text style={styles.title}>How will you use WorkNest?</Text>
        <Text style={styles.subtitle}>Pick a path to get started — you can always switch later.</Text>

        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("Register", { role: "jobseeker" })}
        >
          <View style={styles.optionIcon}>
            <Feather name="search" size={20} color={colors.textInverse} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>I'm looking for a job</Text>
            <Text style={styles.optionSubtitle}>Browse and apply to local gigs</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("Register", { role: "shopowner" })}
        >
          <View style={[styles.optionIcon, styles.optionIconAlt]}>
            <Feather name="briefcase" size={20} color={colors.textInverse} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>I'm hiring</Text>
            <Text style={styles.optionSubtitle}>Post gigs and find local talent</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    flexGrow: 1,
    justifyContent: "center",
  },
  illustration: {
    width: 180,
    height: 180,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  optionIconAlt: {
    backgroundColor: colors.accentDark,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  optionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  loginLink: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  loginLinkText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  loginLinkBold: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
