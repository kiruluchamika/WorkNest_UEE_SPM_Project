import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobSeekerStackParamList } from "../../navigation/JobSeekerTabs";
import type { GigPost } from "../../types";
import { getPublicGigPost } from "../../api/gigPostApi";
import { EmployerSection } from "../../components/gig/EmployerSection";
import { colors } from "../../theme/colors";
export function EmployerProfileScreen({ route, navigation }: NativeStackScreenProps<JobSeekerStackParamList, "EmployerProfile">) {
 const [gig, setGig] = useState<GigPost | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [retry, setRetry] = useState(0);
 useFocusEffect(useCallback(() => { let active = true; setError(null); getPublicGigPost(route.params.gigId).then(g => { if (active) setGig(g); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [route.params.gigId, retry]));
 return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}><TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()}><Text style={styles.link}>? Back to gig</Text></TouchableOpacity>{error ? <><Text>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setRetry(r => r + 1)}><Text style={styles.link}>Try again</Text></TouchableOpacity></> : gig ? <EmployerSection gig={gig} full /> : <ActivityIndicator color={colors.primary} />}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 110, maxWidth: 760, width: "100%", alignSelf: "center" }, link: { color: colors.primaryDark, paddingVertical: 15, fontWeight: "700" } });
