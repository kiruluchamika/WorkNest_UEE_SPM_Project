import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { DateTimeField } from "../../components/common/DateTimeField";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import { gigPostFormSchema } from "../../utils/validators";
import { parseDateOnly } from "../../utils/datetime";
import * as categoryApi from "../../api/categoryApi";
import type { Category, GigPaymentType } from "../../types";

interface SectionProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  children: React.ReactNode;
}

const FormSection: React.FC<SectionProps> = ({ icon, title, children }) => (
  <Card style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Feather name={icon} size={14} color={colors.primaryDark} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </Card>
);

export const GigPostFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId?: string }) || {};
  const { gigPosts, addGig, editGig } = useGigPosts();
  const editingGig = gigId ? gigPosts.find((g) => g.id === gigId) : undefined;
  const isEditing = Boolean(editingGig);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [title, setTitle] = useState(editingGig?.title ?? "");
  const [categoryId, setCategoryId] = useState(editingGig?.categoryId ?? "");
  const [description, setDescription] = useState(editingGig?.description ?? "");
  const [location, setLocation] = useState(editingGig?.location ?? "");
  const [paymentAmount, setPaymentAmount] = useState(
    editingGig ? String(editingGig.paymentAmount) : ""
  );
  const [paymentType, setPaymentType] = useState<GigPaymentType>(
    editingGig?.paymentType ?? "DAILY"
  );
  const [startDate, setStartDate] = useState(editingGig?.startDate?.slice(0, 10) ?? "");
  const [startTime, setStartTime] = useState(editingGig?.startTime ?? "");
  const [endDate, setEndDate] = useState(editingGig?.endDate?.slice(0, 10) ?? "");
  const [endTime, setEndTime] = useState(editingGig?.endTime ?? "");
  const [workersNeeded, setWorkersNeeded] = useState(
    editingGig ? String(editingGig.workersNeeded) : "1"
  );
  const [requiredSkills, setRequiredSkills] = useState(
    editingGig?.requiredSkills.join(", ") ?? ""
  );
  const [contactInfo, setContactInfo] = useState(editingGig?.contactInfo ?? "");
  const [imageUrl, setImageUrl] = useState(editingGig?.imageUrl ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setCategoryId("");
    setDescription("");
    setLocation("");
    setPaymentAmount("");
    setPaymentType("DAILY");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setWorkersNeeded("1");
    setRequiredSkills("");
    setContactInfo("");
    setImageUrl("");
    setErrors({});
    setSuccess(false);
  }, []);

  // The "Post Gig" tab stays mounted when switching tabs (React Navigation
  // keeps bottom-tab screens alive), so without this the form would get
  // stuck on the success screen — or keep stale field values — the next
  // time the business comes back here to create another gig.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (success && !isEditing) {
          resetForm();
        }
      };
    }, [success, isEditing, resetForm])
  );

  const goToMyGigs = () => {
    // The success screen only ever shows for the "PostGig" tab itself
    // (editing calls goBack() directly and never sets success), so
    // `navigation` here is already the bottom-tab navigator — jumpTo is
    // the tab navigator's own API for switching tabs by name, which is
    // more explicit/reliable here than the generic navigate() action.
    (navigation as any).jumpTo("MyGigsTab");
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await categoryApi.listActiveCategories();
        setCategories(data);
      } catch {
        setErrors((prev) => ({ ...prev, form: "Could not load categories. Pull to retry." }));
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    setErrors({});
    const result = gigPostFormSchema.safeParse({
      title,
      categoryId,
      description,
      location,
      paymentAmount,
      paymentType,
      startDate,
      startTime,
      endDate,
      endTime,
      workersNeeded,
      requiredSkills,
      contactInfo,
      imageUrl,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      title: result.data.title,
      categoryId: result.data.categoryId,
      description: result.data.description,
      location: result.data.location,
      paymentAmount: result.data.paymentAmount,
      paymentType: result.data.paymentType,
      startDate: result.data.startDate,
      startTime: result.data.startTime || undefined,
      endDate: result.data.endDate || undefined,
      endTime: result.data.endTime || undefined,
      workersNeeded: result.data.workersNeeded,
      requiredSkills: result.data.requiredSkills
        ? result.data.requiredSkills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      contactInfo: result.data.contactInfo || undefined,
      imageUrl: result.data.imageUrl || undefined,
    };

    setSubmitting(true);
    try {
      if (isEditing && gigId) {
        await editGig(gigId, payload);
        navigation.goBack();
      } else {
        await addGig(payload);
        setSuccess(true);
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save gig. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Feather name="check-circle" size={32} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Gig submitted successfully.</Text>
          <Text style={styles.successText}>Your gig is now waiting for admin approval.</Text>
          <Button title="View My Gigs" onPress={goToMyGigs} style={{ marginTop: spacing.lg }} />
          <Button
            title="Create Another Gig"
            variant="outline"
            onPress={resetForm}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{isEditing ? "Edit gig" : "Create a new gig"}</Text>
              <Text style={styles.subtitle}>
                {isEditing
                  ? "Changes to key details will send this gig back for review."
                  : "Fill in the details below to post an opportunity for local workers."}
              </Text>
            </View>
          </View>

          <FormSection icon="file-text" title="Basic Information">
            <Input
              label="Gig Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend Café Assistant"
              error={errors.title}
            />
            {loadingCategories ? (
              <LoadingSpinner message="Loading categories..." />
            ) : (
              <Select
                label="Category"
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Select a category"
                emptyMessage="No active categories available right now."
                error={errors.categoryId}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  helperText: c.description,
                }))}
              />
            )}
          </FormSection>

          <FormSection icon="clipboard" title="Work Details">
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              rows={4}
              placeholder="Describe the role, tasks, and expectations..."
              error={errors.description}
            />
            <Input
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Colombo 05"
              error={errors.location}
            />
            <Input
              label="Workers Needed"
              value={workersNeeded}
              onChangeText={setWorkersNeeded}
              keyboardType="numeric"
              placeholder="1"
              error={errors.workersNeeded}
            />
            <Input
              label="Required Skills (comma separated)"
              value={requiredSkills}
              onChangeText={setRequiredSkills}
              placeholder="Customer service, Cash handling"
              error={errors.requiredSkills}
            />
          </FormSection>

          <FormSection icon="dollar-sign" title="Payment">
            <Input
              label="Payment Amount (Rs.)"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              placeholder="2500"
              error={errors.paymentAmount}
            />
            <Text style={styles.label}>Payment Type</Text>
            <View style={styles.chipRow}>
              {GIG_PAYMENT_TYPES.map((pt) => (
                <TouchableOpacity
                  key={pt.value}
                  onPress={() => setPaymentType(pt.value)}
                  style={[styles.chip, paymentType === pt.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, paymentType === pt.value && styles.chipTextActive]}>
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormSection>

          <FormSection icon="calendar" title="Schedule">
            <Text style={styles.helperText}>All times are Sri Lanka time (Asia/Colombo).</Text>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <DateTimeField
                  label="Start Date"
                  mode="date"
                  value={startDate}
                  onChange={(v) => setStartDate(v ?? "")}
                  minimumDate={new Date()}
                  error={errors.startDate}
                />
              </View>
              <View style={styles.rowItem}>
                <DateTimeField
                  label="Start Time"
                  mode="time"
                  value={startTime}
                  onChange={(v) => setStartTime(v ?? "")}
                  clearable
                  error={errors.startTime}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <DateTimeField
                  label="End Date (optional)"
                  mode="date"
                  value={endDate}
                  onChange={(v) => setEndDate(v ?? "")}
                  minimumDate={startDate ? parseDateOnly(startDate) : new Date()}
                  clearable
                  error={errors.endDate}
                />
              </View>
              <View style={styles.rowItem}>
                <DateTimeField
                  label="End Time (optional)"
                  mode="time"
                  value={endTime}
                  onChange={(v) => setEndTime(v ?? "")}
                  clearable
                  error={errors.endTime}
                />
              </View>
            </View>
          </FormSection>

          <FormSection icon="info" title="Additional Information">
            <Input
              label="Contact Information (optional)"
              value={contactInfo}
              onChangeText={setContactInfo}
              placeholder="Phone number or email"
              error={errors.contactInfo}
            />
            <Input
              label="Image URL (optional)"
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              error={errors.imageUrl}
            />
          </FormSection>

          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          {submitting ? (
            <LoadingSpinner message={isEditing ? "Saving changes..." : "Submitting gig..."} />
          ) : (
            <Button
              title={isEditing ? "Save changes" : "Submit for approval"}
              onPress={handleSubmit}
              size="lg"
            />
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
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    marginHorizontal: -spacing.xs,
  },
  rowItem: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
  },
  success: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.success,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  successText: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    textAlign: "center",
  },
});
