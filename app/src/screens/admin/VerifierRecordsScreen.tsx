import { Button } from "../../components/common/Button";
import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { listApplications } from "../../api/verifierApplicationsApi";
import type { VerifierApplication, VerifierApplicationStatus } from "../../types";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

function useApplications(statuses: VerifierApplicationStatus[]) {
  const [items,setItems]=useState<VerifierApplication[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const key=statuses.join(",");
  const load=useCallback(async()=>{setLoading(true);setError("");try{const groups=await Promise.all(statuses.map(listApplications));setItems(groups.flat().sort((a,b)=>new Date(b.submittedAt).getTime()-new Date(a.submittedAt).getTime()));}catch(err){setError(err instanceof Error?err.message:"Could not load verifier records.");}finally{setLoading(false);}},[key]);
  useFocusEffect(useCallback(()=>{load();},[load])); return{items,loading,error,load};
}

function RecordsScreen({title,statuses,empty,selectable=false,showIncomingReactivation=false}:{title:string;statuses:VerifierApplicationStatus[];empty:string;selectable?:boolean;showIncomingReactivation?:boolean}){
  const navigation=useNavigation(); const{items,loading,error,load}=useApplications(statuses);
  const pendingReactivationCount=items.reduce((count,item)=>count+(item.reactivationRequests??[]).filter((request)=>request.status==="PENDING").length,0);
  const renderCard=(item:VerifierApplication)=><Card style={styles.card}><View style={styles.header}><Text style={styles.name}>{item.applicant.name}</Text><Text style={[styles.status,(item.status==="REJECTED"||item.status==="SUSPENDED")&&styles.rejected]}>{item.status}</Text></View><Text style={styles.muted}>{item.district} • Submitted {new Date(item.submittedAt).toLocaleDateString()}</Text>{item.reviewedAt?<Text style={styles.muted}>Reviewed {new Date(item.reviewedAt).toLocaleDateString()}</Text>:null}<Text style={styles.id}>Application ID: {item.id}</Text></Card>;
  return <SafeAreaView style={styles.container}><AppHeader subtitle={title}/><ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>{showIncomingReactivation?<TouchableOpacity onPress={()=> (navigation as any).navigate("IncomingReactivationRequests")}><Card style={styles.incomingCard}><Text style={styles.incomingTitle}>Incoming Reactivation Requests ({pendingReactivationCount})</Text><Text style={styles.muted}>Review pending requests requiring Admin attention.</Text></Card></TouchableOpacity>:null}{error?<Text style={styles.error}>{error}</Text>:null}{loading&&!items.length?<LoadingSpinner message="Loading verifier records..."/>:!items.length?<Card><Text style={styles.emptyTitle}>{empty}</Text><Text style={styles.muted}>Records will appear here when available.</Text></Card>:items.map((item)=>selectable?<TouchableOpacity key={item.id} onPress={()=> (navigation as any).navigate("VerifierDetails",{applicationId:item.id})}>{renderCard(item)}</TouchableOpacity>:<View key={item.id}>{renderCard(item)}</View>)}</ScrollView></SafeAreaView>;
}

export const ApprovedVerifiersScreen=()=> <RecordsScreen title="Approved verifiers" statuses={["APPROVED"]} empty="No approved verifiers" selectable/>;
export const SuspendedVerifiersScreen=()=> <RecordsScreen title="Suspended verifiers" statuses={["SUSPENDED"]} empty="No suspended verifiers" selectable showIncomingReactivation/>;
export const VerifierApprovalHistoryScreen = () => {
  const navigation = useNavigation();
  const [tab, setTab] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const { items, loading, error, load } = useApplications(["APPROVED", "REJECTED", "SUSPENDED"]);
  // A suspended verifier was previously approved; keep that application in approval history.
  const visible = items.filter(item => tab === "APPROVED" ? item.status === "APPROVED" || item.status === "SUSPENDED" : item.status === "REJECTED");
  return <SafeAreaView style={styles.container}><AppHeader subtitle="Verifier Approval History"/>
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>
      <Text style={styles.name}>Verifier Approval History</Text>
      <View style={{ flexDirection: "row", marginVertical: spacing.md }}>{(["APPROVED", "REJECTED"] as const).map(value => <View key={value} style={{ flex: 1, marginHorizontal: spacing.xs }}><Button title={value === "APPROVED" ? "Approved" : "Rejected"} variant={tab === value ? "primary" : "outline"} onPress={() => setTab(value)}/></View>)}</View>
      {error ? <Card><Text style={styles.error}>{error}</Text><Button title="Retry" onPress={load}/></Card>
        : loading && !items.length ? <LoadingSpinner message="Loading approval history..."/>
        : !visible.length ? <Card><Text style={styles.emptyTitle}>No {tab.toLowerCase()} applications</Text></Card>
        : visible.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" onPress={() => (navigation as any).navigate("VerifierApplicationDetail", { applicationId: item.id })}>
          <Card style={styles.card}>
            <Text style={styles.name}>{item.applicant.name}</Text>
            <Text style={styles.muted}>{item.applicant.email}</Text>
            <Text style={styles.muted}>District: {item.district}</Text>
            <Text style={styles.id}>Application ID: {item.id}</Text>
            <Text style={styles.muted}>Submitted: {new Date(item.submittedAt).toLocaleString()}</Text>
            {item.reviewedAt ? <Text style={styles.muted}>Reviewed: {new Date(item.reviewedAt).toLocaleString()}</Text> : null}
            <Text style={[styles.status, tab === "REJECTED" && styles.rejected]}>Approval outcome: {tab}</Text>
            <Text style={styles.muted}>Current status: {item.status}</Text>
            {item.reviewer ? <Text style={styles.muted}>Reviewed by: {item.reviewer.name}</Text> : null}
            {item.rejectionReason ? <Text style={styles.muted}>Rejection reason: {item.rejectionReason}</Text> : null}
          </Card>
        </TouchableOpacity>)}
    </ScrollView>
  </SafeAreaView>;
};

export function useVerifierOverview(){const{items,loading,error,load}=useApplications(["PENDING","APPROVED","REJECTED","SUSPENDED"]);const count=(status:VerifierApplicationStatus)=>items.filter((item)=>item.status===status).length;return{items,loading,error,load,count};}

const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.background},scroll:{padding:spacing.md},error:{color:colors.danger,marginBottom:spacing.md},emptyTitle:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text},muted:{fontSize:typography.sizes.sm,color:colors.textMuted,marginTop:spacing.xs},card:{marginBottom:spacing.md},incomingCard:{marginBottom:spacing.lg,backgroundColor:colors.primarySoft},incomingTitle:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.primaryDark},header:{flexDirection:"row",justifyContent:"space-between"},name:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text},status:{fontSize:typography.sizes.xs,fontWeight:"800",color:colors.success},rejected:{color:colors.danger},id:{fontSize:typography.sizes.xs,color:colors.primaryDark,marginTop:spacing.sm}});
