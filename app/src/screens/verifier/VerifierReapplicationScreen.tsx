import { DocumentField, DocumentUpload } from "../../components/common/DocumentField";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../components/common/AppHeader";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { getLatestApplication } from "../../api/verifierApplicationsApi";
import { useAuth } from "../../context/AuthContext";
import { verifierReapplicationSchema } from "../../utils/validators";
import type { VerifierApplicationPayload } from "../../types";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Errors = Partial<Record<keyof VerifierApplicationPayload, string>>;

export const VerifierReapplicationScreen: React.FC = () => {
  const [documentUpload,setDocumentUpload]=useState<DocumentUpload>();
  const navigation=useNavigation();
  const { submitVerifierReapplication } = useAuth();
  const [district,setDistrict]=useState(""); const [identityType,setIdentityType]=useState("");
  const [identityNumber,setIdentityNumber]=useState(""); const [identityDocumentReference,setIdentityDocumentReference]=useState("");
  const [addressInformation,setAddressInformation]=useState(""); const [communityReference,setCommunityReference]=useState("");
  const [loading,setLoading]=useState(true); const [submitting,setSubmitting]=useState(false); const [error,setError]=useState(""); const [errors,setErrors]=useState<Errors>({});

  useEffect(()=>{getLatestApplication().then((application)=>{setDistrict(application.district);setIdentityType(application.identityType);setIdentityNumber(application.identityNumber);setIdentityDocumentReference(application.identityDocumentReference||"");setAddressInformation(application.addressInformation);setCommunityReference(application.communityReference||"");}).catch((err)=>setError(err instanceof Error?err.message:"Could not load your previous application.")).finally(()=>setLoading(false));},[]);

  const submit=async()=>{const result=verifierReapplicationSchema.safeParse({district,identityType,identityNumber,identityDocumentReference,identityDocumentReferenceUpload:documentUpload,addressInformation,communityReference});if(!result.success){const next:Errors={};result.error.issues.forEach((issue)=>{next[issue.path[0] as keyof Errors]=issue.message});setErrors(next);return;}setErrors({});setError("");setSubmitting(true);try{await submitVerifierReapplication({...result.data,identityDocumentReferenceUpload:documentUpload});(navigation as any).popToTop();}catch(err){setError(err instanceof Error?err.message:"Could not submit verifier re-application.");}finally{setSubmitting(false)}};

  if(loading)return <LoadingSpinner fullScreen message="Loading previous application..."/>;
  return <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}><AppHeader subtitle="Verifier re-application"/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><Text style={styles.title}>Apply Again</Text><Text style={styles.help}>Review and correct your verifier information before submitting a new application.</Text>
    <Input label="District" value={district} onChangeText={setDistrict} error={errors.district}/>
    <Select label="ID type" value={identityType} onChange={setIdentityType} placeholder="Select ID type" error={errors.identityType} options={[{value:"NATIONAL_ID",label:"National identity card"},{value:"PASSPORT",label:"Passport"},{value:"DRIVING_LICENCE",label:"Driving licence"}]}/>
    <Input label="ID number" value={identityNumber} onChangeText={setIdentityNumber} error={errors.identityNumber}/>
    <DocumentField showOptionalLabel={false} label="Identity document" value={documentUpload} onChange={setDocumentUpload} existing={identityDocumentReference} onRemoveExisting={()=>setIdentityDocumentReference("")} disabled={submitting}/>
    {errors.identityDocumentReference ? <Text style={styles.error}>{errors.identityDocumentReference}</Text> : null}
    <Input label="Address / supporting information" value={addressInformation} onChangeText={setAddressInformation} multiline rows={3} error={errors.addressInformation}/>
    <Input label="Community reference (optional)" value={communityReference} onChangeText={setCommunityReference} multiline rows={3}/>
    {error?<Text style={styles.error}>{error}</Text>:null}<Button style={styles.polishButton} textStyle={styles.polishButtonText} title="Submit Re-application" onPress={submit} loading={submitting}/>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
};

const styles=StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},scroll:{ padding: spacing.lg, paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" },title:{ fontSize:typography.sizes.lg, fontWeight:"800", color:colors.text, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 },help:{ fontSize:typography.sizes.sm, color:colors.textMuted, marginTop:spacing.xs, marginBottom:spacing.lg, lineHeight: 22 },error:{fontSize:typography.sizes.sm,color:colors.danger,marginBottom:spacing.md}, polishButton: { marginTop: spacing.sm, marginBottom: spacing.xs, minHeight: 50, paddingVertical: spacing.sm, borderRadius: 14 }, polishButtonText: { textAlign: "center", flexShrink: 1, lineHeight: 20 }});
