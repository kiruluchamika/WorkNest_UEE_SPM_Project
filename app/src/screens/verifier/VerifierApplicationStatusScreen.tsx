import { DocumentEvidence } from "../../components/common/DocumentField";
import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { getLatestApplication, getLatestReactivationRequest } from "../../api/verifierApplicationsApi";
import type { VerifierReactivationRequest } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const VerifierApplicationStatusScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user, logout } = useAuth(); const application = user?.verifierApplication;
  const [reactivationRequest,setReactivationRequest]=useState<VerifierReactivationRequest|null>(null);
  const [reactivationLoading,setReactivationLoading]=useState(application?.status === "SUSPENDED");
  const [identityEvidence,setIdentityEvidence]=useState<string>();
  useFocusEffect(useCallback(()=>{let active=true;getLatestApplication().then(item=>{if(active)setIdentityEvidence(item.identityDocumentReference);}).catch(()=>{if(active)setIdentityEvidence(undefined);});return()=>{active=false;};},[]));
  const rejected = application?.status === "REJECTED";
  const suspended = application?.status === "SUSPENDED";
  useFocusEffect(useCallback(()=>{if(!suspended)return;let active=true;const submittedRequest=route.params?.reactivationRequest;if(submittedRequest){setReactivationRequest(submittedRequest);setReactivationLoading(false);}else{setReactivationLoading(true);}getLatestReactivationRequest().then(request=>{if(active)setReactivationRequest(request);}).catch(()=>{if(active)setReactivationRequest(null);}).finally(()=>{if(active)setReactivationLoading(false);});return()=>{active=false;};},[route.params?.reactivationRequest,suspended]));
  return <SafeAreaView style={styles.container}><AppHeader subtitle="Verifier Application" />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator><View style={[styles.icon, (rejected || suspended) && styles.rejected]}><Feather name={rejected || suspended ? "x-circle" : "clock"} size={32} color={rejected || suspended ? colors.danger : colors.warning} /></View>
      <Text style={styles.name}>{user?.name}</Text><Text style={styles.title}>{suspended ? "Verifier Suspended" : rejected ? "Application Rejected" : "Pending Approval"}</Text>
      <Text style={styles.message}>{suspended ? "Your verifier access has been suspended. Contact WorkNest support if you need assistance." : rejected ? "Your verifier application was not approved. You may apply again if you wish." : "An administrator is reviewing your application. You will receive access to the Verifier Dashboard after approval."}</Text>
      <Card style={styles.card}><Text style={styles.label}>Application ID</Text><Text style={styles.value}>{application?.id ?? "Not available"}</Text><Text style={styles.label}>Submitted</Text><Text style={styles.value}>{application?.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : "Not available"}</Text><Text style={styles.label}>Status</Text><Text style={[styles.value, { color: rejected || suspended ? colors.danger : colors.warning }]}>{application?.status ?? "PENDING"}</Text>{application?.rejectionReason || application?.suspensionReason ? <><Text style={styles.label}>Reason</Text><Text style={styles.value}>{application.rejectionReason || application.suspensionReason || "Reason unavailable"}</Text></> : rejected || suspended ? <><Text style={styles.label}>Reason</Text><Text style={styles.value}>Reason unavailable</Text></> : null}</Card>
      {identityEvidence ? <Card style={styles.card}><DocumentEvidence label="Identity document" value={identityEvidence}/></Card> : null}
      {rejected ? <Button style={styles.polishButton} textStyle={styles.polishButtonText} title="Apply Again" onPress={() => (navigation as any).navigate("VerifierReapplication")} /> : null}
      {suspended ? <Card style={styles.card}><Text style={styles.label}>Reactivation request</Text>{reactivationLoading?<Text style={styles.value}>Loading reactivation request…</Text>:<><Text style={styles.value}>{reactivationRequest?.status ?? "NOT SUBMITTED"}</Text>{reactivationRequest?.status==="PENDING"?<Text style={styles.value}>Reactivation request pending.</Text>:null}{reactivationRequest?.status==="REJECTED"?<Text style={styles.value}>Your reactivation request was rejected.</Text>:null}{reactivationRequest?.explanation?<><Text style={styles.label}>Your explanation</Text><Text style={styles.value}>{reactivationRequest.explanation}</Text></>:null}{reactivationRequest?.reviewReason?<><Text style={styles.label}>Admin response</Text><Text style={styles.value}>{reactivationRequest.reviewReason}</Text></>:null}{reactivationRequest?<><Text style={styles.label}>Supporting document</Text><DocumentEvidence label="Evidence" value={reactivationRequest.attachmentReference}/></>:null}</>}</Card>:null}
      {suspended && !reactivationLoading && reactivationRequest?.status!=="PENDING" ? <Button style={styles.polishButton} textStyle={styles.polishButtonText} title={reactivationRequest?.status==="REJECTED"?"Request Reactivation Again":"Request Reactivation"} onPress={() => (navigation as any).navigate("VerifierReactivationRequest")} /> : null}
      <View style={styles.signOut}><Button style={styles.polishButton} textStyle={styles.polishButtonText} title="Sign out" variant="outline" onPress={logout} /></View></ScrollView></SafeAreaView>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},scroll:{flex:1},content:{ padding:spacing.lg, alignItems:"center", paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" },icon:{width:72,height:72,borderRadius:radius.full,backgroundColor:"#FFF3DC",alignItems:"center",justifyContent:"center",marginTop:spacing.xl,marginBottom:spacing.md},rejected:{backgroundColor:colors.dangerLight},name:{ fontSize:typography.sizes.sm, color:colors.textMuted, lineHeight: 26, flexShrink: 1 },title:{ fontSize:typography.sizes.lg, fontWeight:"800", color:colors.text, marginVertical:spacing.sm, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 },message:{ fontSize:typography.sizes.sm, color:colors.textMuted, textAlign:"center", marginBottom:spacing.lg, lineHeight: 22 },card:{ width:"100%", marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 },label:{ fontSize:typography.sizes.xs, color:colors.textMuted, fontWeight: "700", lineHeight: 18, marginBottom: spacing.xs + 2 },value:{ fontSize:typography.sizes.sm, color:colors.text, marginBottom:spacing.md, lineHeight: 22, fontWeight: "600" },signOut:{marginTop:spacing.md}, polishButton: { marginTop: spacing.sm, marginBottom: spacing.xs, minHeight: 50, paddingVertical: spacing.sm, borderRadius: 14 }, polishButtonText: { textAlign: "center", flexShrink: 1, lineHeight: 20 }});
