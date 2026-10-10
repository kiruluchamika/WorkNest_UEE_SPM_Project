import { toast } from "../../utils/toast";
import React, { useCallback, useState } from "react";
import { Alert, Modal, ScrollView, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { VerificationManagementStackParamList } from "../../navigation/AdminStack";
import type { AdminVerifierStatistics, VerifierApplication } from "../../types";
import { approveReactivationRequest, getApplication, rejectReactivationRequest, suspendApplication } from "../../api/verifierApplicationsApi";
import { getAdminVerifierStatistics } from "../../api/verificationRequestsApi";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatVerifierDateTime } from "../../utils/verifierDates";

export const VerifierDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<VerificationManagementStackParamList, "VerifierDetails">>();
  const navigation = useNavigation<NativeStackNavigationProp<VerificationManagementStackParamList>>();
  const [application,setApplication]=useState<VerifierApplication>(); const [suspendModal,setSuspendModal]=useState(false); const [rejectModal,setRejectModal]=useState(false);
  const [statistics,setStatistics]=useState<AdminVerifierStatistics>();
  const [reason,setReason]=useState(""); const [reviewReason,setReviewReason]=useState(""); const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{try{const [nextApplication,nextStatistics]=await Promise.all([getApplication(route.params.applicationId),getAdminVerifierStatistics(route.params.applicationId)]);setApplication(nextApplication);setStatistics(nextStatistics);}catch(error){toast.error("Error",error instanceof Error?error.message:"Could not load verifier details.");}},[route.params.applicationId]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  if(!application)return <LoadingSpinner fullScreen message="Loading verifier details..."/>;
  const pendingRequest=(application.reactivationRequests??[]).find((request)=>request.status==="PENDING");
  const field=(label:string,value:string)=><View style={styles.field}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
  const suspend=async()=>{if(reason.trim().length<5)return Alert.alert("Reason required","Please provide a meaningful suspension reason.");setBusy(true);try{await suspendApplication(application.id,reason.trim());setSuspendModal(false);toast.success("Verifier suspended","The verifier was moved to Suspended Verifiers.");navigation.goBack();}catch(error){Alert.alert("Error",error instanceof Error?error.message:"Could not suspend verifier.");}finally{setBusy(false);}};
  const approve=async()=>{if(!pendingRequest)return;setBusy(true);try{await approveReactivationRequest(pendingRequest.id);toast.success("Verifier reactivated","Verifier access has been restored.");navigation.goBack();}catch(error){toast.error("Error",error instanceof Error?error.message:"Could not reactivate verifier.");}finally{setBusy(false);}};
  const reject=async()=>{if(!pendingRequest)return;if(reviewReason.trim().length<5)return Alert.alert("Reason required","Please provide a meaningful rejection reason.");setBusy(true);try{await rejectReactivationRequest(pendingRequest.id,reviewReason.trim());setRejectModal(false);setReviewReason("");await load();toast.success("Request rejected","The verifier remains suspended.");}catch(error){Alert.alert("Error",error instanceof Error?error.message:"Could not reject the request.");}finally{setBusy(false);}};
  return <SafeAreaView style={styles.container}><AppHeader subtitle="Verifier details"/><ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.title}>VERIFIER DETAILS</Text><Card>{field("Name",application.applicant.name)}{field("Email",application.applicant.email)}{field("District",application.district)}{field("Account Status",application.status==="APPROVED"?"ACTIVE":"SUSPENDED")}{field("Availability","NOT CONFIGURED")}</Card>
    <Text style={styles.section}>Statistics</Text><Card><View style={styles.grid}>{([['Assigned','assigned'],['Approved','approved'],['Rejected','rejected'],['Flagged','flagged']] as const).map(([label,key])=><View key={label} style={styles.stat}><Text style={styles.statValue}>{statistics?.[key] ?? "—"}</Text><Text style={styles.label}>{label}</Text></View>)}</View></Card>
    {application.suspendedAt?<Card>{field("Suspension reason",application.suspensionReason||"Reason unavailable")}{field("Suspended",formatVerifierDateTime(application.suspendedAt))}{field("Original approval reviewed",formatVerifierDateTime(application.reviewedAt))}</Card>:null}
    {application.status==="SUSPENDED"&&pendingRequest?<Card>{field("Pending reactivation request",pendingRequest.explanation)}<View style={styles.actions}><View style={styles.half}><Button title="Reject Request" variant="danger" onPress={()=>setRejectModal(true)} disabled={busy}/></View><View style={styles.half}><Button title="Approve Reactivation" onPress={approve} loading={busy}/></View></View></Card>:null}
    {application.status==="APPROVED"?<Button title="Suspend Verifier" variant="danger" onPress={()=>setSuspendModal(true)}/>:null}
    <Button title="Suspension History" variant="outline" onPress={()=>navigation.navigate("SuspensionHistory",{applicationId:application.id})}/>
  </ScrollView>
  <Modal visible={suspendModal} transparent animationType="fade" onRequestClose={()=>setSuspendModal(false)}><View style={styles.backdrop}><View style={styles.sheet}><Text style={styles.modalTitle}>Suspend Verifier</Text><Text style={styles.help}>Are you sure you want to suspend this verifier?</Text><Input label="Reason" value={reason} onChangeText={setReason} multiline rows={3}/><View style={styles.actions}><View style={styles.half}><Button title="Cancel" variant="outline" onPress={()=>setSuspendModal(false)}/></View><View style={styles.half}><Button title="Confirm Suspension" variant="danger" onPress={suspend} loading={busy}/></View></View></View></View></Modal>
  <Modal visible={rejectModal} transparent animationType="fade" onRequestClose={()=>setRejectModal(false)}><View style={styles.backdrop}><View style={styles.sheet}><Text style={styles.modalTitle}>Reject Reactivation Request</Text><Input label="Reason" value={reviewReason} onChangeText={setReviewReason} multiline rows={3}/><View style={styles.actions}><View style={styles.half}><Button title="Cancel" variant="outline" onPress={()=>setRejectModal(false)}/></View><View style={styles.half}><Button title="Reject Request" variant="danger" onPress={reject} loading={busy}/></View></View></View></View></Modal>
  </SafeAreaView>;
};

const styles=StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},scroll:{padding:spacing.md},title:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.primaryDark,marginBottom:spacing.md},section:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text,marginVertical:spacing.md},field:{marginBottom:spacing.md},label:{fontSize:typography.sizes.xs,color:colors.textMuted},value:{fontSize:typography.sizes.sm,fontWeight:"700",color:colors.text,marginTop:2},grid:{flexDirection:"row",flexWrap:"wrap"},stat:{width:"50%",marginBottom:spacing.md},statValue:{fontSize:typography.sizes.sm,fontWeight:"700",color:colors.textMuted},help:{fontSize:typography.sizes.sm,color:colors.textMuted,marginBottom:spacing.md},backdrop:{flex:1,backgroundColor:"rgba(0,0,0,.35)",justifyContent:"flex-end"},sheet:{backgroundColor:colors.surface,padding:spacing.lg,borderTopLeftRadius:radius.lg,borderTopRightRadius:radius.lg},modalTitle:{fontSize:typography.sizes.lg,fontWeight:"800",color:colors.text},actions:{flexDirection:"row"},half:{flex:1,marginHorizontal:spacing.xs}});
