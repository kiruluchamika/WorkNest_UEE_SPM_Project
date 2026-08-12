import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { GoogleButton } from "../../components/common/GoogleButton";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { ROLES } from "../../utils/constants";
import { registerSchema } from "../../utils/validators";
import type { AuthStackParamList } from "../../navigation/AuthStack";

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, "Register">>();
  const { register, loginWithGoogle, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"jobseeker" | "shopowner" | "verifier">(
    route.params?.role ?? "jobseeker"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setErrors({});
    setError("");

    const result = registerSchema.safeParse({
      name,
      email,
      phone,
      role,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() || "form";
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await register({ name, email, phone, role, password });
      Alert.alert("Account created!", "Welcome to WorkNest.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account. Try again.");
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      await loginWithGoogle();
      Alert.alert("Welcome!", "You've signed in successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image
              source={require("../../../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome to WorkNest</Text>
            <Text style={styles.subtitle}>Select your role and join the trusted local gig network.</Text>
          </View>

          <Input
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Amal Perera"
            error={errors.name}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="amal@example.com"
            error={errors.email}
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="0771234567"
            error={errors.phone}
          />

          <Text style={styles.label}>Select your role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setRole(r.value)}
                style={[
                  styles.roleChip,
                  role === r.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <View
                  style={[
                    styles.roleIcon,
                    role === r.value && { backgroundColor: colors.primary },
                  ]}
                >
                  <Feather
                    name={
                      r.value === "jobseeker"
                        ? "user-check"
                        : r.value === "shopowner"
                          ? "shopping-bag"
                          : "shield"
                    }
                    size={16}
                    color={role === r.value ? colors.textInverse : colors.primaryDark}
                  />
                </View>
                <Text
                  style={[
                    styles.roleText,
                    role === r.value && { color: colors.textInverse, fontWeight: "700" },
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.role ? <Text style={styles.error}>{errors.role}</Text> : null}

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Min 6 characters"
            error={errors.password}
          />
          <Input
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repeat password"
            error={errors.confirmPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isLoading ? (
            <LoadingSpinner message="Creating account..." />
          ) : (
            <>
              <Button title="Create account" onPress={handleRegister} size="lg" />
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <GoogleButton onPress={handleGoogleSignUp} label="Sign up with Google" />
            </>
          )}

          <TouchableOpacity onPress={() => navigation.navigate("Login" as never)}>
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
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
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  roleRow: {
    flexDirection: "column",
    marginBottom: spacing.md,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  roleIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  roleText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  link: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: colors.textMuted,
  },
  linkBold: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
