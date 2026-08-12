import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { APP_NAME, APP_TAGLINE } from "../../utils/constants";

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("amal@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError("Invalid email or password");
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
            <View style={styles.logo}>
              <Feather name="layers" size={24} color={colors.textInverse} />
            </View>
            <Text style={styles.title}>Welcome to {APP_NAME}</Text>
            <Text style={styles.tagline}>Bridging the gap between local talent and community shops.</Text>
          </View>

          <Text style={styles.label}>Already have an account?</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="amal@example.com"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isLoading ? (
            <LoadingSpinner message="Signing in..." />
          ) : (
            <Button title="Sign in" onPress={handleLogin} size="lg" />
          )}

          <View style={styles.hint}>
            <Text style={styles.hintText}>Demo accounts:</Text>
            <Text style={styles.hintText}>jobseeker: amal@example.com</Text>
            <Text style={styles.hintText}>shopowner: savi@example.com</Text>
            <Text style={styles.hintText}>verifier: nuwan@example.com</Text>
            <Text style={styles.hintText}>Password: password</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Register" as never)}>
            <Text style={styles.link}>
              Select your role? <Text style={styles.linkBold}>Create an account</Text>
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
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  tagline: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
    lineHeight: 20,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
  },
  hint: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: 2,
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
