import { toast } from "../../utils/toast";
import { DocumentField, DocumentUpload } from "../../components/common/DocumentField";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../components/common/AppHeader";
import { SearchableSelect } from "../../components/common/SearchableSelect";
import { Select } from "../../components/common/Select";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { getDistricts } from "../../api/districtsApi";
import { submitVerificationRequest, getMyVerificationState } from "../../api/verificationRequestsApi";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const identityOptions = [
  { value: "", label: "Select identity document" },
  { value: "NATIONAL_ID", label: "National identity card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENCE", label: "Driving licence" },
];

const identityNumberLabels: Record<string, string> = {
  NATIONAL_ID: "NIC Number",
  PASSPORT: "Passport Number",
  DRIVING_LICENCE: "Driving Licence Number",
};

export const VerificationRequestScreen: React.FC = () => {
  const nav = useNavigation();
  const { user, refreshCurrentUser } = useAuth();
  const [previouslyRevoked,setPreviouslyRevoked]=useState(false);
  const [stateLoading,setStateLoading]=useState(true);
  const [stateError, setStateError] = useState("");
  const [gateExplanation,setGateExplanation]=useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [district, setDistrict] = useState("");
  const [fullName, setFullName] = useState(user?.name || "");
  const [address, setAddress] = useState(user?.location || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [identityType, setIdentityType] = useState("");
  const identityNumberRef = useRef<TextInput>(null);
  const [identityNumber, setIdentityNumber] = useState("");
  const [identityUpload,setIdentityUpload]=useState<DocumentUpload>();
  const [supportingUpload,setSupportingUpload]=useState<DocumentUpload>();
  const [supportingEvidence, setSupportingEvidence] = useState("");
  const [communityReferences, setCommunityReferences] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!identityType) return;
    // Let the document picker modal finish fading out before opening the keyboard.
    const focusTimer = setTimeout(() => identityNumberRef.current?.focus(), 400);
    return () => clearTimeout(focusTimer);
  }, [identityType]);

  const loadVerificationState = async () => {
    setStateLoading(true);
    setStateError("");
    try {
      const state = await getMyVerificationState();
      setPreviouslyRevoked(!!state.revocation);
    } catch (e) {
      setStateError(e instanceof Error ? e.message : "Could not load verification status.");
    } finally {
      setStateLoading(false);
    }
  };

  useEffect(() => {
    void loadVerificationState();
    getDistricts().then(setDistricts).catch((e) => setError(e.message));
  }, []);

  const submit = async () => {
    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (address.trim().length < 5) {
      setError("Please enter your address.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      setError("Mobile number must be exactly 10 digits.");
      return;
    }
    if (!districts.includes(district)) {
      setError("Please select a supported district.");
      return;
    }
    if (!identityType) { setError("Identity document is required."); return; }
    if (identityNumber.trim().length < 2) {
      setError(`Please enter your ${identityNumberLabels[identityType].toLowerCase()}.`);
      return;
    }

    if (!identityUpload) {
      setError("Please upload an identity document file.");
      return;
    }

    if (communityReferences.trim().length < 5) {
      setError("Community references are required (at least 5 characters).");
      return;
    }

    if(previouslyRevoked&&!gateExplanation.trim()){setError("Explain why you are requesting verification again.");return;}
    setBusy(true);
    setError("");
    try {
      const personalInformation = [
        `Full Name: ${fullName.trim()}`,
        `Address: ${address.trim()}`,
        `Phone Number: ${phoneNumber.trim()}`,
      ].join("\n");
      const identityDocument = identityType ? `${identityType}: ${identityNumber.trim()}` : "";
      const request = await submitVerificationRequest({
        district, gateExplanation: previouslyRevoked ? gateExplanation : undefined,
        personalInformation,
        identityDocument, identityDocumentUpload: identityUpload, supportingEvidenceUpload: supportingUpload,
        supportingEvidence: supportingEvidence || undefined,
        communityReferences,
      });
      toast.success(
        "Request submitted",
        request.status === "ADMIN_REVIEW" ? "Your request is waiting for Admin approval." : request.status === "ASSIGNED"
          ? "A Community Verifier has been assigned."
          : "Your request is waiting for an eligible verifier.",
      );
      try {
        await refreshCurrentUser();
      } catch {
        // The profile reloads the canonical request state when it regains focus.
      }
      nav.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <AppHeader subtitle="Request Verification" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.formCard}>
          <Text style={s.title}>Job Seeker Verification</Text>
          <Text style={s.help}>Provide accurate personal and community information for review.</Text>
          <Input inputWrapStyle={s.inputField} labelStyle={s.fieldLabel} label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />
          <Input inputWrapStyle={s.inputField} labelStyle={s.fieldLabel} label="Address" value={address} onChangeText={setAddress} multiline rows={3} placeholder="Enter your full address" />
          <Input inputWrapStyle={s.inputField} labelStyle={s.fieldLabel} label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Enter your phone number" keyboardType="phone-pad" />
          <SearchableSelect labelStyle={s.fieldLabel}
            triggerStyle={s.selectField}
            label="District"
            value={district}
            onChange={setDistrict}
            options={districts.map((x) => ({ value: x, label: x }))}
            placeholder="Select district..."
            searchPlaceholder="Search districts..."
            emptyMessage="No districts found"
          />
          <Select labelStyle={s.fieldLabel}
            triggerStyle={s.selectField}
            label="Identity Document (required)"
            value={identityType}
            onChange={(value) => {
              setIdentityType(value);
              if (!value) setIdentityNumber("");
            }}
            options={identityOptions}
            placeholder="Select document type"
          />
          {identityType ? (
            <Input inputWrapStyle={s.inputField} labelStyle={s.fieldLabel}
              inputRef={identityNumberRef}
              label={identityNumberLabels[identityType]}
              value={identityNumber}
              onChangeText={setIdentityNumber}
              placeholder={`Enter ${identityNumberLabels[identityType].toLowerCase()}`}
            />
          ) : null}
          <DocumentField labelStyle={s.fieldLabel} required label="Identity document file" value={identityUpload} onChange={setIdentityUpload} disabled={busy}/>
          <DocumentField labelStyle={s.fieldLabel} label="Supporting evidence file" value={supportingUpload} onChange={setSupportingUpload} disabled={busy}/>
          <Input inputWrapStyle={s.inputField} labelStyle={s.fieldLabel} label="Supporting Evidence (optional)" value={supportingEvidence} onChangeText={setSupportingEvidence} multiline rows={3} />
          {previouslyRevoked ? <Input inputWrapStyle={s.inputField} labelStyle={s.fieldLabel} label="Reason for requesting verification again" value={gateExplanation} onChangeText={setGateExplanation} multiline rows={3}/> : null}
          <Input inputWrapStyle={s.inputField} labelStyle={s.fieldLabel} label="Community References" value={communityReferences} onChangeText={setCommunityReferences} multiline rows={3} />
          {error ? <Text style={s.error}>{error}</Text> : null}
          {stateError ? <><Text style={s.error}>{stateError}</Text><Button style={s.polishButton} textStyle={s.polishButtonText} title="Retry verification status" variant="outline" onPress={loadVerificationState} loading={stateLoading}/></> : null}
          <Button style={s.polishButton} textStyle={s.polishButtonText} title="Submit Verification Request" onPress={submit} loading={busy} disabled={stateLoading || !!stateError} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.small },
  fieldLabel: { color: "#000000" },
  selectField: { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, borderWidth: 1.5, borderRadius: radius.lg },
  inputField: { backgroundColor: colors.surfaceSubtle },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" },
  title: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 },
  help: { fontSize: typography.sizes.sm, color: colors.textMuted, marginVertical: spacing.md, lineHeight: 22 },
  error: { color: colors.danger, fontSize: typography.sizes.sm, marginBottom: spacing.md }, polishButton: { marginTop: spacing.sm, marginBottom: spacing.xs, minHeight: 50, paddingVertical: spacing.sm, borderRadius: 14 }, polishButtonText: { textAlign: "center", flexShrink: 1, lineHeight: 20 }});
