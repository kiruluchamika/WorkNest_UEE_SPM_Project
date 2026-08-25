import React from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const metrics = ["Requests Today", "Approved Today", "Rejected Today", "Flagged Today", "Awaiting Review", "Under Review"];
const areas = [
  { label: "Verification Requests", route: "VerificationRequests", icon: "clipboard" },
  { label: "Flagged / Returned Cases", route: "FlaggedReturnedCases", icon: "flag" },
  { label: "Verifier Management", route: "VerifierManagement", icon: "shield" },
  { label: "Verification History", route: "VerificationHistory", icon: "clock" },
] as const;

export const VerificationManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  return <SafeAreaView style={styles.container}><AppHeader subtitle="Verification management" /><ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.eyebrow}>VERIFICATION OVERVIEW</Text>
    <View style={styles.grid}>{metrics.map((label) => <Card key={label} style={styles.metric}><Text style={styles.number}>0</Text><Text style={styles.metricLabel}>{label}</Text></Card>)}</View>
    <Text style={styles.heading}>Management areas</Text>
    {areas.map((item) => <TouchableOpacity key={item.route} onPress={() => (navigation as any).navigate(item.route)} style={styles.row}><Feather name={item.icon} size={18} color={colors.primaryDark} /><Text style={styles.rowText}>{item.label}</Text><Feather name="chevron-right" size={18} color={colors.textMuted} /></TouchableOpacity>)}
  </ScrollView></SafeAreaView>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.background},scroll:{padding:spacing.md},eyebrow:{fontSize:typography.sizes.sm,fontWeight:"800",color:colors.primaryDark,marginBottom:spacing.md},grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between"},metric:{width:"48%",marginBottom:spacing.sm},number:{fontSize:typography.sizes.lg,fontWeight:"800",color:colors.primaryDark},metricLabel:{fontSize:typography.sizes.xs,color:colors.textMuted},heading:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text,marginTop:spacing.lg,marginBottom:spacing.sm},row:{flexDirection:"row",alignItems:"center",backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.sm},rowText:{flex:1,fontSize:typography.sizes.sm,fontWeight:"700",color:colors.text,marginLeft:spacing.sm}});
