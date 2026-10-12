import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const VerifierApprovalSuccessScreen: React.FC = () => {
  const { acknowledgeVerifierApproval } = useAuth();
  const [seconds, setSeconds] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const autoAttempted = useRef(false);
  const complete = useCallback(async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { await acknowledgeVerifierApproval(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not continue."); setBusy(false); }
  }, [acknowledgeVerifierApproval, busy]);

  useEffect(() => {
    if (seconds <= 0) { if (!autoAttempted.current) { autoAttempted.current = true; void complete(); } return; }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [complete, seconds]);

  return <SafeAreaView style={styles.container}><View style={styles.content}>
    <View style={styles.icon}><Feather name="check-circle" size={42} color={colors.success} /></View>
    <Text style={styles.title}>Application Approved</Text>
    <Text style={styles.message}>Your Community Verifier application has been approved. You now have access to the Verifier Dashboard.</Text>
    <Text style={styles.countdown}>Continuing in {seconds} seconds</Text>
    <View style={styles.track}><View style={[styles.progress, { width: `${Math.max(0, seconds) * 10}%` }]} /></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Button title="Continue" onPress={complete} loading={busy} />
  </View></SafeAreaView>;
};

const styles=StyleSheet.create({container:{flex:1,backgroundColor: "transparent"},content:{flex:1,padding:spacing.xl,alignItems:"center",justifyContent:"center"},icon:{width:88,height:88,borderRadius:radius.full,backgroundColor:colors.primarySoft,alignItems:"center",justifyContent:"center",marginBottom:spacing.lg},title:{fontSize:typography.sizes.xl,fontWeight:"800",color:colors.text},message:{fontSize:typography.sizes.sm,color:colors.textMuted,textAlign:"center",lineHeight:22,marginTop:spacing.md},countdown:{fontSize:typography.sizes.sm,fontWeight:"700",color:colors.primaryDark,marginTop:spacing.xl},track:{width:"100%",height:8,backgroundColor:colors.border,borderRadius:radius.full,overflow:"hidden",marginVertical:spacing.lg},progress:{height:"100%",backgroundColor:colors.success},error:{color:colors.danger,marginBottom:spacing.md,textAlign:"center"}});
