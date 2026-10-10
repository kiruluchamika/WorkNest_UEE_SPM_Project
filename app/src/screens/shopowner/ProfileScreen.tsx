import { toast } from "../../utils/toast";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import * as reputationApi from "../../api/reputationApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { profileFormSchema } from "../../utils/validators";
import { pickImageFromLibrary, captureImageFromCamera } from "../../utils/imagePicker";
import { initials } from "../../utils/formatters";
import type { ReputationSummary } from "../../types";

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    reputationApi.getUserReputation(user.id).then(setReputation);
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading profile..." />
      </SafeAreaView>
    );
  }

  const cancelEdit = () => {
    setName(user.name);
    setPhone(user.phone ?? "");
    setBio(user.bio ?? "");
    setLocation(user.location ?? "");
    setAvatarUrl(user.avatarUrl);
    setErrors({});
    setEditing(false);
  };

  const changeAvatar = () => {
    Alert.alert("Profile Photo", "Update your profile photo", [
      {
        text: "Choose from Library",
        onPress: async () => {
          setAvatarBusy(true);
          try {
            const uri = await pickImageFromLibrary();
            if (uri) setAvatarUrl(uri);
          } catch {
            toast.error("Something went wrong", "Could not process that image.");
          } finally {
            setAvatarBusy(false);
          }
        },
      },
      {
        text: "Take Photo",
        onPress: async () => {
          setAvatarBusy(true);
          try {
            const uri = await captureImageFromCamera();
            if (uri) setAvatarUrl(uri);
          } catch {
            toast.error("Something went wrong", "Could not process that image.");
          } finally {
            setAvatarBusy(false);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    setErrors({});
    const result = profileFormSchema.safeParse({ name, phone, bio, location, avatarUrl: avatarUrl || "" });

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
        avatarUrl: result.data.avatarUrl || undefined,
      });
      setEditing(false);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save your profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            {navigation.canGoBack() ? (
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Feather name="arrow-left" size={16} color={colors.text} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.headerTitle}>My Profile</Text>
            {!editing ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}>
                <Feather name="edit-2" size={13} color={colors.primaryDark} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>

          <View style={styles.avatarSection}>
            <TouchableOpacity
              activeOpacity={editing ? 0.8 : 1}
              onPress={editing ? changeAvatar : undefined}
              style={styles.avatarWrap}
              disabled={avatarBusy}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials(user.name || "U")}</Text>
                </View>
              )}
              {editing ? (
                <View style={styles.avatarEditBadge}>
                  <Feather name="camera" size={13} color={colors.textInverse} />
                </View>
              ) : null}
            </TouchableOpacity>
            <Text style={styles.roleTag}>Local Business Owner</Text>
          </View>

          {editing ? (
            <Card style={styles.card}>
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
                label="Shop / Business Location"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Colombo 05"
                error={errors.location}
              />
              <Input
                label="About your business"
                value={bio}
                onChangeText={setBio}
                multiline
                rows={3}
                placeholder="Tell workers a little about your shop..."
                error={errors.bio}
              />

              {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

              {saving ? (
                <LoadingSpinner message="Saving changes..." />
              ) : (
                <View style={styles.editActions}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Button title="Cancel" variant="outline" onPress={cancelEdit} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Save" onPress={handleSave} />
                  </View>
                </View>
              )}
            </Card>
          ) : (
            <>
              <Card style={styles.card}>
                <Text style={styles.name}>{user.name}</Text>
                {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
              </Card>

              <Card style={styles.card}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Feather name="mail" size={13} color={colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{user.email}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Feather name="phone" size={13} color={colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{user.phone || "Not provided"}</Text>
                  </View>
                </View>
                <View style={[styles.detailRow, { marginBottom: 0 }]}>
                  <View style={styles.detailIcon}>
                    <Feather name="map-pin" size={13} color={colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{user.location || "Not provided"}</Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.card}>
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
              </Card>
            </>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  editButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    color: colors.primaryDark,
    marginLeft: 4,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.full,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.textInverse,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  roleTag: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  card: {
    marginBottom: spacing.md,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bio: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  detailIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginBottom: spacing.md,
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
