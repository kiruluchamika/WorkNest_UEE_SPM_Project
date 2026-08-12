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
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { GoogleButton } from "../../components/common/GoogleButton";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { APP_NAME, APP_TAGLINE } from "../../utils/constants";

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      await login(email, password);
      Alert.alert("Welcome back!", "You've signed in successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await loginWithGoogle();
      Alert.alert("Welcome back!", "You've signed in successfully.");
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
            <Text style={styles.title}>Welcome to {APP_NAME}</Text>
            <Text style={styles.tagline}>Bridging the gap between local talent and community shops.</Text>
          </View>

          <Text style={styles.label}>Already have an account?</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter your email"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isLoading ? (
            <LoadingSpinner message="Signing in..." />
          ) : (
            <>
              <Button title="Sign in" onPress={handleLogin} size="lg" />
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <GoogleButton onPress={handleGoogleLogin} />
            </>
          )}

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
    width: 72,
    height: 72,
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
