import { DocumentField, DocumentUpload } from "../../components/common/DocumentField";
import React, { useEffect, useState } from "react";
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
import { Select } from "../../components/common/Select";
import { SearchableSelect } from "../../components/common/SearchableSelect";
import { getDistricts } from "../../api/districtsApi";
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
  const [district, setDistrict] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [districtLoadError, setDistrictLoadError] = useState("");
  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [documentUpload, setDocumentUpload] = useState<DocumentUpload>();
  const [identityDocumentReference, setIdentityDocumentReference] = useState("");
  const [addressInformation, setAddressInformation] = useState("");
  const [communityReference, setCommunityReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    getDistricts().then(setDistricts).catch((err) => setDistrictLoadError(err instanceof Error ? err.message : "Could not load districts."));
  }, []);

  const handleRegister = async () => {
    setErrors({});
    setError("");

    if (role === "verifier" && district && !districts.includes(district)) {
      setErrors({ district: "Please select a supported district" });
      return;
    }

    const result = registerSchema.safeParse({
      name,
      email,
      phone,
      role,
      password,
      confirmPassword,
      district, identityType, identityNumber, identityDocumentReference, identityDocumentReferenceUpload: documentUpload, addressInformation, communityReference,
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
      await register({ name, email, phone, role, password, ...(role === "verifier" ? {
        district, identityType, identityNumber, identityDocumentReference, identityDocumentReferenceUpload: documentUpload,
        addressInformation, communityReference,
      } : {}) });
      Alert.alert("Account created!", role === "verifier" ? "Your verifier application is pending review." : "Welcome to WorkNest.");
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

          {role === "verifier" ? (
            <View style={styles.verifierSection}>
              <Text style={styles.sectionTitle}>Verifier application</Text>
              <Text style={styles.sectionHelp}>Provide your identity and local community information for administrator review.</Text>
              <SearchableSelect label="District" value={district} onChange={setDistrict} placeholder="Select district..." searchPlaceholder="Search districts..." options={districts.map((item) => ({ value: item, label: item }))} error={errors.district || districtLoadError} emptyMessage={districtLoadError || "No districts found"} />
              <Select label="ID type" value={identityType} onChange={setIdentityType} placeholder="Select ID type" error={errors.identityType} options={[
                { value: "NATIONAL_ID", label: "National identity card" }, { value: "PASSPORT", label: "Passport" }, { value: "DRIVING_LICENCE", label: "Driving licence" },
              ]} />
              <Input label="ID number" value={identityNumber} onChangeText={setIdentityNumber} placeholder="Identity document number" error={errors.identityNumber} />
              <DocumentField required label="Identity document" value={documentUpload} onChange={setDocumentUpload} disabled={isLoading}/>
              {errors.identityDocumentReference ? <Text style={styles.error}>{errors.identityDocumentReference}</Text> : null}
              <Text style={styles.documentNote}>The document reference is not published by WorkNest.</Text>
              <Input label="Address / supporting information" value={addressInformation} onChangeText={setAddressInformation} placeholder="Residential address and supporting details" multiline rows={3} error={errors.addressInformation} />
              <Input label="Community reference (optional)" value={communityReference} onChangeText={setCommunityReference} placeholder="Reference name and contact information" multiline rows={3} error={errors.communityReference} />
            </View>
          ) : null}

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
  verifierSection: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.primaryDark, marginBottom: spacing.xs },
  sectionHelp: { fontSize: typography.sizes.sm, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  documentNote: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md, lineHeight: 17 },
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
