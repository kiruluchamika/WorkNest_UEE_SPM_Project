import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listApplications } from "../../api/verifierApplicationsApi";
import type { VerifierApplication, VerifierReactivationRequest } from "../../types";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type IncomingItem = { application: VerifierApplication; request: VerifierReactivationRequest };

export const IncomingReactivationRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [items, setItems] = useState<IncomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const applications = await listApplications("SUSPENDED");
      const pending = applications.flatMap((application) => {
        const request = (application.reactivationRequests ?? []).find((candidate) => candidate.status === "PENDING");
        return request ? [{ application, request }] : [];
      }).sort((a, b) => new Date(b.request.createdAt).getTime() - new Date(a.request.createdAt).getTime());
      setItems(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load incoming reactivation requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return <SafeAreaView style={styles.container}><AppHeader subtitle="Incoming Reactivation Requests"/><ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>{error?<Text style={styles.error}>{error}</Text>:null}{loading&&!items.length?<LoadingSpinner message="Loading incoming requests..."/>:!items.length?<Card><Text style={styles.emptyTitle}>No incoming reactivation requests</Text><Text style={styles.muted}>Pending requests will appear here.</Text></Card>:items.map(({application,request})=><TouchableOpacity key={request.id} onPress={()=> (navigation as any).navigate("VerifierDetails",{applicationId:application.id})}><Card style={styles.card}><View style={styles.header}><Text style={styles.name}>{application.applicant.name}</Text><Text style={styles.pending}>PENDING</Text></View><Text style={styles.muted}>{application.district} • Requested {new Date(request.createdAt).toLocaleDateString()}</Text><Text style={styles.preview} numberOfLines={2}>{request.explanation}</Text><Text style={styles.muted}>{request.attachmentReference?"Supporting evidence attached":"No supporting evidence attached"}</Text><Text style={styles.id}>Application ID: {application.id}</Text></Card></TouchableOpacity>)}</ScrollView></SafeAreaView>;
};

const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.background},scroll:{padding:spacing.md},error:{color:colors.danger,marginBottom:spacing.md},emptyTitle:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text},muted:{fontSize:typography.sizes.sm,color:colors.textMuted,marginTop:spacing.xs},card:{marginBottom:spacing.md},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},name:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text},pending:{fontSize:typography.sizes.xs,fontWeight:"800",color:colors.warning},preview:{fontSize:typography.sizes.sm,color:colors.text,marginTop:spacing.sm},id:{fontSize:typography.sizes.xs,color:colors.primaryDark,marginTop:spacing.sm}});
