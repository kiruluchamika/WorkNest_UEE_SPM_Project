import React, { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppHeader } from "../../components/common/AppHeader";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { getLatestReactivationRequest, submitReactivationRequest } from "../../api/verifierApplicationsApi";
import { useAuth } from "../../context/AuthContext";
import type { VerifierStackParamList } from "../../navigation/VerifierStack";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const VerifierReactivationRequestScreen:React.FC=()=>{const navigation=useNavigation<NativeStackNavigationProp<VerifierStackParamList>>();const{refreshCurrentUser}=useAuth();const[explanation,setExplanation]=useState("");const[attachmentReference,setAttachmentReference]=useState("");const[error,setError]=useState("");const[busy,setBusy]=useState(false);const submit=async()=>{if(explanation.trim().length<10){setError("Please provide a meaningful reactivation explanation.");return;}setBusy(true);setError("");try{const createdRequest=await submitReactivationRequest(explanation.trim(),attachmentReference.trim()||undefined);if(createdRequest.status!=="PENDING")throw new Error("The new reactivation request did not enter the pending state.");await refreshCurrentUser();const latestRequest=await getLatestReactivationRequest();if(!latestRequest||latestRequest.id!==createdRequest.id||latestRequest.status!=="PENDING")throw new Error("Could not refresh the new pending reactivation request.");navigation.navigate("VerifierStatus",{reactivationRequest:latestRequest});}catch(err){setError(err instanceof Error?err.message:"Could not submit reactivation request.");}finally{setBusy(false);}};return <SafeAreaView style={styles.container}><AppHeader subtitle="Request reactivation"/><View style={styles.content}><Text style={styles.title}>Request Reactivation</Text><Text style={styles.help}>Explain why your Community Verifier access should be restored.</Text><Input label="Explanation / Reason" value={explanation} onChangeText={setExplanation} multiline rows={5} placeholder="Provide a meaningful explanation" error={error}/><Input label="Supporting document reference (optional)" value={attachmentReference} onChangeText={setAttachmentReference} placeholder="Private filename or secure reference"/><Text style={styles.note}>Optional. WorkNest currently stores only a private reference and metadata; this does not upload or publish a local file.</Text><Button title="Submit Request" onPress={submit} loading={busy}/></View></SafeAreaView>};
const styles=StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},content:{padding:spacing.lg},title:{fontSize:typography.sizes.lg,fontWeight:"800",color:colors.text,marginBottom:spacing.sm},help:{fontSize:typography.sizes.sm,color:colors.textMuted,lineHeight:21,marginBottom:spacing.lg},note:{fontSize:typography.sizes.xs,color:colors.textMuted,lineHeight:18,marginTop:-spacing.sm,marginBottom:spacing.lg}});
