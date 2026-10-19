import { DocumentEvidence } from "../../components/common/DocumentField";
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import * as endorsementApi from "../../api/endorsementApi";
import * as applicationApi from "../../api/applicationApi";
import { getMyVerificationRequests, getMyVerificationState } from "../../api/verificationRequestsApi";
import * as reputationApi from "../../api/reputationApi";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EndorsementTag } from "../../components/trust/EndorsementTag";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { initials, trustLevel } from "../../utils/formatters";
import { pickImageFromLibrary, captureImageFromCamera } from "../../utils/imagePicker";
import { toast } from "../../utils/toast";
import { profileFormSchema } from "../../utils/validators";
import type { Endorsement, Application, ReputationSummary, VerificationRequest } from "../../types";

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout, updateUser } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [verificationState,setVerificationState]=useState<import("../../types").VerificationState>();
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest>();
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVerificationStatus = useCallback(async () => {
    setVerificationLoading(true);
    setVerificationError("");
    try {
      const [requests,state] = await Promise.all([getMyVerificationRequests(),getMyVerificationState()]);
      setVerificationState(state);
      setVerificationRequest(requests[0]);
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Could not load verification status.");
    } finally {
      setVerificationLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadVerificationStatus();
  }, [loadVerificationStatus]));

  useEffect(() => {
    if (!user) return;
    Promise.all([
      endorsementApi.listEndorsementsForJobSeeker(user.id),
      applicationApi.listApplicationsByJobSeeker(user.id),
      reputationApi.getUserReputation(user.id),
    ]).then(([e, a, rep]) => {
      setEndorsements(e);
      setApplications(a);
      setReputation(rep);
      setLoading(false);
    });
  }, [user]);

  if (!user) return null;
  const level = trustLevel(user.trustScore);

  // No edit mode on this screen, so the new photo is saved as soon as it is picked.
  const uploadAvatar = async (pick: () => Promise<string | null>) => {
    setAvatarBusy(true);
    try {
      const uri = await pick();
      if (!uri) return;
      await updateUser({ avatarUrl: uri });
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error("Could not update photo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const startEdit = () => {
    setName(user.name);
    setPhone(user.phone ?? "");
    setLocation(user.location ?? "");
    setBio(user.bio ?? "");
    setErrors({});
    setEditing(true);
  };

  const handleSave = async () => {
    setErrors({});
    const result = profileFormSchema.safeParse({ name, phone, bio, location, avatarUrl: user.avatarUrl || "" });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await updateUser({
        name: result.data.name,
        phone: result.data.phone || undefined,
        bio: result.data.bio || undefined,
        location: result.data.location || undefined,
      });
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save your profile." });
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = () => {
    Alert.alert("Profile Photo", "Update your profile photo", [
      { text: "Choose from Library", onPress: () => uploadAvatar(pickImageFromLibrary) },
      { text: "Take Photo", onPress: () => uploadAvatar(captureImageFromCamera) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={changeAvatar}
            disabled={avatarBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={user.avatarUrl ? "Change profile photo" : "Add profile photo"}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user.name)}</Text>
              </View>
            )}
            {avatarBusy ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.textInverse} />
              </View>
            ) : null}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={13} color={colors.textInverse} />
            </View>
          </TouchableOpacity>
          {!user.avatarUrl ? (
            <TouchableOpacity onPress={changeAvatar} disabled={avatarBusy}>
              <Text style={styles.addPhotoText}>Add profile photo</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>{user.role.toUpperCase()}</Text>
          <View style={styles.trustRow}>
            <View style={[styles.trustBadge, { backgroundColor: level.color }]}>
              <Text style={styles.trustScore}>{user.trustScore}</Text>
            </View>
            <Text style={[styles.trustLabel, { color: level.color }]}>{level.label}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{editing ? "Edit details" : "Contact"}</Text>
            {!editing ? (
              <TouchableOpacity
                onPress={startEdit}
                style={styles.editButton}
                accessibilityRole="button"
                accessibilityLabel="Edit profile details"
              >
                <Feather name="edit-2" size={13} color={colors.primaryDark} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {editing ? (
            <>
              <Input label="Full Name" value={name} onChangeText={setName} error={errors.name} />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="07XXXXXXXX"
                error={errors.phone}
              />
              <Input
                label="Location"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Malabe"
                error={errors.location}
              />
              <Input
                label="About you"
                value={bio}
                onChangeText={setBio}
                multiline
                rows={3}
                placeholder="Your skills, experience and the kind of work you're looking for..."
                error={errors.bio}
              />
              {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
              {saving ? (
                <LoadingSpinner message="Saving changes..." />
              ) : (
                <View style={styles.editActions}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Button title="Cancel" variant="outline" onPress={() => setEditing(false)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Save" onPress={handleSave} />
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Feather name="mail" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="phone" size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, !user.phone && styles.notSet]}>{user.phone || "Not set"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, !user.location && styles.notSet]}>{user.location || "Not set"}</Text>
              </View>
              <Text style={styles.bio}>{user.bio || "No bio yet. Tap Edit to tell employers about yourself."}</Text>
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Endorsements</Text>
          {loading ? (
            <LoadingSpinner message="Loading endorsements..." />
          ) : endorsements.length > 0 ? (
            <View style={styles.tags}>
              {endorsements.map((e) => (
                <EndorsementTag
                  key={e.id}
                  skill={e.skill}
                  verifierName={e.verifierName}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No endorsements yet.</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>My applications</Text>
          {loading ? (
            <LoadingSpinner message="Loading applications..." />
          ) : applications.length > 0 ? (
            applications.map((a) => (
              <View key={a.id} style={styles.appRow}>
                <Text style={styles.appTitle}>{a.gigTitle}</Text>
                <Text style={[styles.appStatus, { color: a.status === "accepted" ? colors.success : colors.textMuted }]}>
                  {a.status.toUpperCase()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>You have not applied to any gigs yet.</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Reputation</Text>
          {loading ? (
            <LoadingSpinner message="Loading reputation..." />
          ) : (
            <>
              <View style={styles.reputationRow}>
                <Text style={styles.reputationAverage}>
                  {reputation?.averageRating !== null && reputation?.averageRating !== undefined
                    ? reputation.averageRating.toFixed(1)
                    : "—"}
                </Text>
                <Text style={styles.reputationCount}>
                  {reputation?.totalReviews ?? 0} review{reputation?.totalReviews === 1 ? "" : "s"}
                </Text>
              </View>
              <Button
                title="View Reputation & Reviews"
                variant="outline"
                onPress={() =>
                  (navigation as any).navigate("Reputation", { userId: user.id, userName: user.name })
                }
                style={{ marginBottom: spacing.sm }}
              />
              <Button
                title="Work History"
                variant="outline"
                onPress={() => (navigation as any).navigate("WorkHistory", { userId: user.id })}
              />
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          {verificationLoading ? (
            <LoadingSpinner message="Loading verification status..." />
          ) : verificationError ? (
            <>
              <Text style={styles.verificationMessage}>{verificationError}</Text>
              <Button style={{ marginTop: spacing.sm, paddingVertical: spacing.sm }} textStyle={{ textAlign: "center", flexShrink: 1, lineHeight: 20 }} title="Retry" variant="outline" onPress={loadVerificationStatus} />
            </>
          ) : verificationState?.revocation && !verificationState.verified ? (
            <>
              <Text style={[styles.verificationStatus,{color:colors.danger}]}>VERIFICATION REVOKED</Text>
              <Text style={styles.verificationMessage}>Revocation reason: {verificationState.revocation.reason}</Text>
              {verificationRequest?.status === "ADMIN_REVIEW" ? <Text style={styles.verificationMessage}>PENDING / ADMIN REVIEW</Text>
                : verificationRequest?.status === "ADMIN_DENIED" ? <><Text style={styles.verificationStatus}>REJECTED BY ADMIN</Text><Text style={styles.rejectionReason}>Reason: {verificationRequest.gateReason}</Text><Button style={{ marginTop: spacing.sm, paddingVertical: spacing.sm }} textStyle={{ textAlign: "center", flexShrink: 1, lineHeight: 20 }} title="Request Verification Again" onPress={()=>(navigation as any).navigate("VerificationRequest")}/></>
                : verificationRequest?.status === "REJECTED" ? <><Text style={styles.verificationStatus}>REJECTED BY VERIFIER</Text><Text style={styles.rejectionReason}>Reason: {verificationRequest.rejectionReason}</Text><Button style={{ marginTop: spacing.sm, paddingVertical: spacing.sm }} textStyle={{ textAlign: "center", flexShrink: 1, lineHeight: 20 }} title="Request Verification Again" onPress={()=>(navigation as any).navigate("VerificationRequest")}/></>
                : verificationRequest && ["PENDING","ASSIGNED","UNDER_REVIEW","RETURNED_FOR_REVIEW","FLAGGED"].includes(verificationRequest.status) ? <Text style={styles.verificationMessage}>Your verification request is pending review.</Text>
                : <Button style={{ marginTop: spacing.sm, paddingVertical: spacing.sm }} textStyle={{ textAlign: "center", flexShrink: 1, lineHeight: 20 }} title="Request Verification Again" onPress={()=>(navigation as any).navigate("VerificationRequest")}/>}
            </>
          ) : !verificationRequest ? (
            <Button style={{ marginTop: spacing.sm, paddingVertical: spacing.sm }} textStyle={{ textAlign: "center", flexShrink: 1, lineHeight: 20 }} title="Request Verification" onPress={() => (navigation as any).navigate("VerificationRequest")} />
          ) : verificationRequest.status === "REJECTED" ? (
            <>
              <Text style={[styles.verificationStatus, { color: colors.danger }]}>REJECTED</Text>
              <Text style={styles.verificationMessage}>Your verification request was not approved.</Text>
              {verificationRequest.rejectionReason ? (
                <Text style={styles.rejectionReason}>Reason: {verificationRequest.rejectionReason}</Text>
              ) : null}
              <Button style={{ marginTop: spacing.sm, paddingVertical: spacing.sm }} textStyle={{ textAlign: "center", flexShrink: 1, lineHeight: 20 }} title="Apply Again" onPress={() => (navigation as any).navigate("VerificationRequest")} />
            </>
          ) : verificationRequest.status === "APPROVED" || verificationRequest.status === "ADMIN_CONFIRMED" ? (
            <>
              <Text style={[styles.verificationStatus, { color: colors.success }]}>VERIFIED</Text>
              <Text style={styles.verificationMessage}>Your verification request has been approved.</Text>
            </>
          ) : (
            <>
              <Text style={[styles.verificationStatus, { color: colors.warning }]}>PENDING</Text>
              <Text style={styles.verificationMessage}>Your verification request has been submitted and is waiting for review.</Text>
            </>
          )}
        </Card>
        {verificationRequest ? <Card><DocumentEvidence label="Identity document" value={verificationRequest.identityDocument}/><DocumentEvidence label="Supporting evidence" value={verificationRequest.supportingEvidence}/></Card> : null}
        <Button title="Sign out" variant="outline" onPress={logout} />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    padding: spacing.lg,
  },
  profileCard: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.textInverse,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
  },
  role: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trustBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  trustScore: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: typography.sizes.base,
  },
  trustLabel: {
    fontWeight: "700",
    fontSize: typography.sizes.base,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  verificationStatus: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    marginBottom: spacing.sm,
    lineHeight: 26,
  },
  verificationMessage: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  rejectionReason: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  editButtonText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  editActions: {
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  formError: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  notSet: {
    color: colors.textMuted,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  bio: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  empty: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  appRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
  },
  appStatus: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  reputationRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.md,
  },
  reputationAverage: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.primaryDark,
    marginRight: spacing.sm,
  },
  reputationCount: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});
