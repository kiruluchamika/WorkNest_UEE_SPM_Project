import React, { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../components/common/AppHeader";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { submitReactivationRequest } from "../../api/verifierApplicationsApi";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const VerifierReactivationRequestScreen:React.FC=()=>{const navigation=useNavigation();const[explanation,setExplanation]=useState("");const[attachmentReference,setAttachmentReference]=useState("");const[error,setError]=useState("");const[busy,setBusy]=useState(false);const submit=async()=>{if(explanation.trim().length<10){setError("Please provide a meaningful reactivation explanation.");return;}setBusy(true);setError("");try{const request=await submitReactivationRequest(explanation.trim(),attachmentReference.trim()||undefined);(navigation as any).navigate("VerifierStatus",{reactivationRequest:request});}catch(err){setError(err instanceof Error?err.message:"Could not submit reactivation request.");}finally{setBusy(false);}};return <SafeAreaView style={styles.container}><AppHeader subtitle="Request reactivation"/><View style={styles.content}><Text style={styles.title}>Request Reactivation</Text><Text style={styles.help}>Explain why your Community Verifier access should be restored.</Text><Input label="Explanation / Reason" value={explanation} onChangeText={setExplanation} multiline rows={5} placeholder="Provide a meaningful explanation" error={error}/><Input label="Supporting document reference (optional)" value={attachmentReference} onChangeText={setAttachmentReference} placeholder="Private filename or secure reference"/><Text style={styles.note}>Optional. WorkNest currently stores only a private reference and metadata; this does not upload or publish a local file.</Text><Button title="Submit Request" onPress={submit} loading={busy}/></View></SafeAreaView>};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.lg},title:{fontSize:typography.sizes.lg,fontWeight:"800",color:colors.text,marginBottom:spacing.sm},help:{fontSize:typography.sizes.sm,color:colors.textMuted,lineHeight:21,marginBottom:spacing.lg},note:{fontSize:typography.sizes.xs,color:colors.textMuted,lineHeight:18,marginTop:-spacing.sm,marginBottom:spacing.lg}});
