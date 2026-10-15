import React, { useCallback, useRef, useState } from "react";
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { SearchableSelect } from "../../components/common/SearchableSelect";
import { DocumentEvidence } from "../../components/common/DocumentField";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { getDistricts } from "../../api/districtsApi";
import * as api from "../../api/verificationRevocationApi";
import type { JobSeekerVerificationDetails, VerificationRequest, VerificationRevocation } from "../../types";
import { colors } from "../../theme/colors";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export function VerifiedJobSeekerManagementScreen() {
  const route = useRoute<any>(); const nav = useNavigation<any>();
  const home = route.name === "VerifiedJobSeekerManagement";
  const verifiedList = route.name === "VerifiedJobSeekers";
  const history = route.name === "BadgeRevocationHistory";
  const gates = route.name === "VerificationAdminGate";
  const details = route.name === "JobSeekerVerificationDetails";
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [pendingCount, setPendingCount] = useState<number>();
  const [revocations, setRevocations] = useState<VerificationRevocation[]>([]);
  const [record, setRecord] = useState<JobSeekerVerificationDetails>();
  const [districts, setDistricts] = useState<string[]>([]); const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [reason, setReason] = useState("");
  const [dialog, setDialog] = useState<{ action: "revoke" | "deny"; id: string }>();
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError("");
    setPendingCount(undefined);
    try {
      if (details) { const value = await api.getJobSeekerVerificationDetails(route.params.userId); if (current === generation.current) setRecord(value); }
      else if (history) { const value = await api.listRevocations(); if (current === generation.current) setRevocations(value); }
      else if (gates) { const value = await api.listGateRequests(); if (current === generation.current) setRequests(value); }
      else if (verifiedList) { const [value, options] = await Promise.all([api.listVerifiedJobSeekers(district), getDistricts()]); if (current === generation.current) { setRequests(value); setDistricts(options); } }
      else if (home) { const pending = await api.listGateRequests(); if (current === generation.current) setPendingCount(pending.length); }
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : "Could not load records."); }
    finally { if (current === generation.current) setLoading(false); }
  }, [details, history, gates, home, verifiedList, district, route.params?.userId]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const act = async (operation: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await operation(); setDialog(undefined); setReason(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  };
  const title = details ? "Job Seeker Verification Details" : history ? "Revocation History" : gates ? "Incoming Re-verification Requests" : verifiedList ? "Verified Job Seekers" : "Verified Job Seeker Management";
  const latestRequest = record?.requests[0];
  const currentReverification = !record?.verified && latestRequest?.revocation ? latestRequest : undefined;
  const awaitingVerifier = currentReverification?.gateStatus === "ALLOWED"
    && ["PENDING", "ASSIGNED", "UNDER_REVIEW", "RETURNED_FOR_REVIEW"].includes(currentReverification.status);
  const deniedByAdmin = currentReverification?.gateStatus === "DENIED" && currentReverification.status === "ADMIN_DENIED";
  const field = (label: string, value?: string) => value ? <Text style={s.text}>{label}: {value}</Text> : null;
  const requestInfo = (item: VerificationRequest) => <>
    <Text style={s.name}>{item.applicant?.name || record?.user.name}</Text>
    {field("Request ID", item.id)}{field("District", item.district)}{field("Status", item.status.replace(/_/g, " "))}
    {field("Submitted", new Date(item.submittedAt).toLocaleString())}{field("Assigned Verifier", item.assignedVerifier?.name)}
    {field("Decision", item.decidedAt ? new Date(item.decidedAt).toLocaleString() : undefined)}
  </>;
  return <SafeAreaView style={s.container}><AppHeader subtitle={title}/>
    <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>
      <Text style={s.title}>{title}</Text>
      {verifiedList ? <>
        <SearchableSelect label="District" value={district} onChange={setDistrict} options={[{ value: "", label: "All districts" }, ...districts.map(value => ({ value, label: value }))]} placeholder="All districts"/>
        <Text style={s.sectionTitle}>Verified Job Seekers</Text>
      </> : null}
      {!home && (loading ? <LoadingSpinner/> : error ? <Card style={s.polishPanel}><Text style={s.error}>{error}</Text><Button style={s.polishButton} textStyle={s.polishButtonText} title="Retry" onPress={load}/></Card> : details && record ? <>
        <Card style={s.card}><Text style={s.name}>{record.user.name}</Text>{field("Email", record.user.email)}<Text style={s.text}>{record.verified ? "VERIFIED" : "NOT VERIFIED"}</Text>
          {awaitingVerifier ? <Text style={s.text}>Re-verification allowed — awaiting verifier review.</Text> : deniedByAdmin ? <>
            <Text style={s.text}>Re-verification rejected by Admin.</Text>
            {field("Reason", currentReverification?.gateReason)}
          </> : null}
          {record.verified && record.requests[0] ? <Button style={s.polishButton} textStyle={s.polishButtonText} title="Revoke Verification Badge" variant="danger" disabled={busy} onPress={() => { setReason(""); setDialog({ action: "revoke", id: record.requests[0].id }); }}/>:null}
        </Card>
        {record.requests.filter(item => item.status === "ADMIN_REVIEW").map(item => <Card key={item.id} style={s.card}>
          <Text style={s.name}>Pending Admin approval</Text>{requestInfo(item)}
          {field("ORIGINAL BADGE REVOCATION REASON", item.revocation?.reason)}{field("New request explanation", item.gateExplanation)}
          <Button style={s.polishButton} textStyle={s.polishButtonText} title="Deny Re-verification" variant="danger" disabled={busy} onPress={() => { setReason(""); setDialog({ action: "deny", id: item.id }); }}/>
          <Button style={s.polishButton} textStyle={s.polishButtonText} title="Allow Re-verification" loading={busy} onPress={() => act(() => api.decideVerificationGate(item.id, true))}/>
        </Card>)}
        <Text style={s.title}>Revocation history</Text>
        {!record.revocations.length ? <Text style={s.text}>No revocations.</Text> : record.revocations.map(item => <Card key={item.id} style={s.card}>
          {field("Previous verification request", item.verificationRequestId)}{field("Revocation reason", item.reason)}{field("Revoked by", item.revokedBy?.name)}{field("Revoked at", new Date(item.revokedAt).toLocaleString())}
        </Card>)}
        <Text style={s.title}>Verification requests and history</Text>
        {record.requests.map(item => <Card key={item.id} style={s.card}>{requestInfo(item)}
          {field("Personal information", item.personalInformation)}{field("Community references", item.communityReferences)}
          {field("Verifier note", item.verifierNote)}{field("Rejection reason", item.rejectionReason)}{field("Original flag", item.flagReason)}{field("Admin response", item.adminResponse)}
          {field("Original revocation reason", item.revocation?.reason)}{field("Request explanation", item.gateExplanation)}{field("Admin gate decision", item.gateStatus)}{field("Admin gate reason", item.gateReason)}
          <DocumentEvidence label="Identity document" value={item.identityDocument}/><DocumentEvidence label="Supporting information" value={item.supportingEvidence}/>
        </Card>)}
      </> : history ? (!revocations.length ? <Card style={s.polishPanel}><Text>No revoked badges found.</Text></Card> : revocations.map(item => <TouchableOpacity key={item.id} onPress={() => nav.navigate("JobSeekerVerificationDetails", { userId: item.verificationRequest?.applicantId })}><Card style={s.card}><Text style={s.name}>{item.verificationRequest?.applicant.name}</Text>{field("District", item.verificationRequest?.district)}{field("Revocation reason", item.reason)}{field("Revoked", new Date(item.revokedAt).toLocaleString())}</Card></TouchableOpacity>))
        : !requests.length ? <Card style={s.polishPanel}><Text>{gates ? "No requests awaiting Admin approval." : "No verified Job Seekers found."}</Text></Card>
        : requests.map(item => <TouchableOpacity key={item.id} onPress={() => nav.navigate("JobSeekerVerificationDetails", { userId: item.applicantId })}><Card style={s.card}>{requestInfo(item)}{!gates ? <Text style={s.text}>VERIFIED</Text> : field("Original revocation reason", item.revocation?.reason)}</Card></TouchableOpacity>))}
      {home && error ? <Text style={s.error}>{error}</Text> : null}
      {home ? <View style={s.navigation}>
        <TouchableOpacity accessibilityRole="button" style={s.navigationRow} onPress={() => nav.navigate("VerifiedJobSeekers")}>
          <Feather name="users" size={18} color={colors.primaryDark}/>
          <Text style={s.navigationText}>View Verified Job Seekers</Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted}/>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={s.navigationRow} onPress={() => nav.navigate("VerificationAdminGate")}>
          <Feather name="inbox" size={18} color={colors.primaryDark}/>
          <Text style={s.navigationText}>Incoming Re-verification Requests</Text>
          <Text style={s.navigationCount} accessibilityLabel={pendingCount === undefined ? "Pending request count unavailable" : `${pendingCount} pending requests`}>{pendingCount ?? "—"}</Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted}/>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={s.navigationRow} onPress={() => nav.navigate("BadgeRevocationHistory")}>
          <Feather name="clock" size={18} color={colors.primaryDark}/>
          <Text style={s.navigationText}>Revocation History</Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted}/>
        </TouchableOpacity>
      </View> : null}
    </ScrollView>
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => { if (!busy) setDialog(undefined); }}>
      <View style={s.backdrop}><View style={s.dialog}><Text style={s.title}>{dialog?.action === "revoke" ? "Revoke Verification Badge?" : "Deny Re-verification?"}</Text>
        <Text style={s.text}>Job Seeker: {record?.user.name}</Text>
        <Input label="Reason" value={reason} onChangeText={setReason} multiline rows={4}/>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button style={s.polishButton} textStyle={s.polishButtonText} title="Cancel" variant="outline" disabled={busy} onPress={() => setDialog(undefined)}/>
        <Button style={s.polishButton} textStyle={s.polishButtonText} title={dialog?.action === "revoke" ? "Revoke Badge" : "Deny Re-verification"} variant="danger" loading={busy} disabled={!reason.trim()} onPress={() => { if (!dialog || !reason.trim()) return; void act(() => dialog.action === "revoke" ? api.revokeVerificationBadge(dialog.id, reason.trim()) : api.decideVerificationGate(dialog.id, false, reason.trim())); }}/>
      </View></View>
    </Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.text, marginBottom: spacing.md, lineHeight: 24 },
  navigation: { marginTop: spacing.md },
  navigationRow: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 76, padding: spacing.md + spacing.xs, marginBottom: spacing.sm + spacing.xs, borderRadius: 16 },
  navigationText: { flex: 1, fontSize: typography.sizes.sm, fontWeight: "700", color: colors.text, marginHorizontal: spacing.md, lineHeight: 22 },
  navigationCount: { flexShrink: 0, minWidth: 24, textAlign: "center", marginRight: spacing.sm, fontSize: typography.sizes.sm, fontWeight: "800", color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8 },
  container: { flex: 1, backgroundColor: colors.background }, scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, width: "100%", maxWidth: 760, alignSelf: "center" }, title: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text, marginVertical: spacing.md, lineHeight: 32, letterSpacing: -0.3, marginBottom: spacing.md, flexShrink: 1 }, name: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.text, lineHeight: 26, flexShrink: 1 }, text: { fontSize: typography.sizes.sm, color: colors.textMuted, marginVertical: spacing.xs, lineHeight: 22 }, card: { marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 }, error: { color: colors.danger }, backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "center", padding: spacing.md }, dialog: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: 24, width: "100%", maxWidth: 600, alignSelf: "center" }, polishButton: { marginTop: spacing.sm, marginBottom: spacing.xs, minHeight: 50, paddingVertical: spacing.sm, borderRadius: 14 }, polishButtonText: { textAlign: "center", flexShrink: 1, lineHeight: 20 }, polishPanel: { marginBottom: spacing.md, padding: spacing.md + spacing.xs, borderRadius: 16 }});
