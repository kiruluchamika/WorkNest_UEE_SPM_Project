import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import type { VerificationManagementStackParamList } from "../../navigation/AdminStack";
import type { VerifierApplication } from "../../types";
import { getApplication } from "../../api/verifierApplicationsApi";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Button } from "../../components/common/Button";
import { formatVerifierDateTime } from "../../utils/verifierDates";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const SuspensionHistoryScreen: React.FC = () => {
  const route = useRoute<RouteProp<VerificationManagementStackParamList, "SuspensionHistory">>();
  const navigation = useNavigation<NativeStackNavigationProp<VerificationManagementStackParamList>>();
  const [application, setApplication] = useState<VerifierApplication>();
  useEffect(() => {
    getApplication(route.params.applicationId).then(setApplication).catch((error) => Alert.alert("Error", error instanceof Error ? error.message : "Could not load suspension history."));
  }, [route.params.applicationId]);
  if (!application) return <LoadingSpinner fullScreen message="Loading suspension history..."/>;
  const events = application.suspensionEvents ?? [];
  const field = (label: string, value: string) => <View style={styles.field}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
  return <SafeAreaView style={styles.container}>
    <AppHeader subtitle="Suspension History"/>
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Suspension History</Text>
      <Text style={styles.subtitle}>{application.applicant.name}</Text>
      {!events.length ? <Card><Text style={styles.empty}>No suspension history is available for this verifier.</Text></Card> : events.map((event, index) =>
        <Card key={event.id} style={styles.card}>
          <Text style={styles.eventTitle}>Suspension #{index + 1}</Text>
          {field("Reason", event.reason || "Not available")}
          {field("Suspended", formatVerifierDateTime(event.suspendedAt))}
          {field("Suspended by", event.suspendedBy?.name || "Not available")}
          {event.reactivatedAt ? <View style={styles.reactivated}>
            <Text style={styles.reactivatedTitle}>Reactivated</Text>
            {field("Date", formatVerifierDateTime(event.reactivatedAt))}
          </View> : <Text style={styles.active}>Currently Suspended</Text>}
          <Button title="Reactivation Request History" variant="outline" onPress={() => navigation.navigate("ReactivationRequestHistory", { applicationId: application.id, suspensionEventId: event.id, suspensionNumber: index + 1 })}/>
        </Card>)}
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({container:{flex:1,backgroundColor:colors.background},scroll:{padding:spacing.md},title:{fontSize:typography.sizes.lg,fontWeight:"800",color:colors.text},subtitle:{fontSize:typography.sizes.sm,color:colors.textMuted,marginTop:spacing.xs,marginBottom:spacing.lg},card:{marginBottom:spacing.md},eventTitle:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.primaryDark,marginBottom:spacing.md},field:{marginBottom:spacing.md},label:{fontSize:typography.sizes.xs,color:colors.textMuted},value:{fontSize:typography.sizes.sm,fontWeight:"700",color:colors.text,marginTop:2},reactivated:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md},reactivatedTitle:{fontSize:typography.sizes.sm,fontWeight:"800",color:colors.primaryDark,marginBottom:spacing.md},active:{fontSize:typography.sizes.sm,fontWeight:"800",color:colors.danger,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md},empty:{fontSize:typography.sizes.sm,color:colors.textMuted,textAlign:"center"}});
