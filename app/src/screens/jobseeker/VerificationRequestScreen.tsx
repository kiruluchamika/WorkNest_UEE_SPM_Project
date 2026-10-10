import { DocumentField, DocumentUpload } from "../../components/common/DocumentField";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
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
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
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
  const [identityNumber, setIdentityNumber] = useState("");
  const [identityUpload,setIdentityUpload]=useState<DocumentUpload>();
  const [supportingUpload,setSupportingUpload]=useState<DocumentUpload>();
  const [supportingEvidence, setSupportingEvidence] = useState("");
  const [communityReferences, setCommunityReferences] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (!identityType || !identityUpload) { setError("Identity document is required."); return; }
    if (identityNumber.trim().length < 2) {
      setError(`Please enter your ${identityNumberLabels[identityType].toLowerCase()}.`);
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
      Alert.alert(
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
          <Text style={s.title}>Job Seeker Verification</Text>
          <Text style={s.help}>Provide accurate personal and community information for review.</Text>
          <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />
          <Input label="Address" value={address} onChangeText={setAddress} multiline rows={3} placeholder="Enter your full address" />
          <Input label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Enter your phone number" keyboardType="phone-pad" />
          <SearchableSelect
            label="District"
            value={district}
            onChange={setDistrict}
            options={districts.map((x) => ({ value: x, label: x }))}
            placeholder="Select district..."
            searchPlaceholder="Search districts..."
            emptyMessage="No districts found"
          />
          <Select
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
            <Input
              label={identityNumberLabels[identityType]}
              value={identityNumber}
              onChangeText={setIdentityNumber}
              placeholder={`Enter ${identityNumberLabels[identityType].toLowerCase()}`}
            />
          ) : null}
          <DocumentField required label="Identity document file" value={identityUpload} onChange={setIdentityUpload} disabled={busy}/>
          <DocumentField label="Supporting evidence file" value={supportingUpload} onChange={setSupportingUpload} disabled={busy}/>
          <Input label="Supporting Evidence (optional)" value={supportingEvidence} onChangeText={setSupportingEvidence} multiline rows={3} />
          {previouslyRevoked ? <Input label="Reason for requesting verification again" value={gateExplanation} onChangeText={setGateExplanation} multiline rows={3}/> : null}
          <Input label="Community References" value={communityReferences} onChangeText={setCommunityReferences} multiline rows={3} />
          {error ? <Text style={s.error}>{error}</Text> : null}
          {stateError ? <><Text style={s.error}>{stateError}</Text><Button title="Retry verification status" variant="outline" onPress={loadVerificationState} loading={stateLoading}/></> : null}
          <Button title="Submit Verification Request" onPress={submit} loading={busy} disabled={stateLoading || !!stateError} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  title: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text },
  help: { fontSize: typography.sizes.sm, color: colors.textMuted, lineHeight: 20, marginVertical: spacing.md },
  error: { color: colors.danger, fontSize: typography.sizes.sm, marginBottom: spacing.md },
});
