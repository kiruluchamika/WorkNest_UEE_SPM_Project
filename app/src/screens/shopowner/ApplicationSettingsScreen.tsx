import { toast } from "../../utils/toast";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
import * as applicationSettingsApi from "../../api/applicationSettingsApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorState } from "../../components/common/ErrorState";
import { SectionHeader } from "../../components/common/SectionHeader";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate } from "../../utils/formatters";
import {
  APPLICATION_MODE_OPTIONS,
  MAX_CUSTOM_QUESTIONS,
  QUESTION_TYPE_OPTIONS,
  REQUIREMENT_FIELDS,
  getDefaultRequirements,
} from "../../utils/applicationSettings";
import type {
  ApplicationMode,
  ApplicationQuestion,
  ApplicationRequirements,
  QuestionType,
} from "../../types";

function genId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const ApplicationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { gigPosts, refresh } = useGigPosts();
  const gig = gigPosts.find((g) => g.id === gigId);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsExisted, setSettingsExisted] = useState(false);

  const [applicationMode, setApplicationMode] = useState<ApplicationMode>("STANDARD");
  const [requirements, setRequirements] = useState<ApplicationRequirements>(
    getDefaultRequirements("STANDARD")
  );
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);

  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftType, setDraftType] = useState<QuestionType>("YES_NO");
  const [draftRequired, setDraftRequired] = useState(true);
  const [draftOptions, setDraftOptions] = useState<string[]>(["", ""]);
  const [draftErrors, setDraftErrors] = useState<{ question?: string; options?: string }>({});

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!gigId) {
      setLoadError("This gig could not be identified.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    applicationSettingsApi
      .getApplicationSettings(gigId)
      .then((settings) => {
        if (!active) return;
        if (settings) {
          setSettingsExisted(true);
          setApplicationMode(settings.applicationMode);
          setRequirements(settings.requirements);
          setQuestions(settings.customQuestions.map((q) => ({ ...q, id: q.id ?? genId() })));
        } else {
          setSettingsExisted(false);
          setApplicationMode("STANDARD");
          setRequirements(getDefaultRequirements("STANDARD"));
          setQuestions([]);
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Could not load application settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gigId]);

  const handleModeSelect = (mode: ApplicationMode) => {
    setApplicationMode(mode);
    setRequirements(getDefaultRequirements(mode));
  };

  const handleRequirementToggle = (field: keyof ApplicationRequirements, val: boolean) => {
    setRequirements((prev) => ({ ...prev, [field]: val }));
  };

  const openAddQuestion = () => {
    if (questions.length >= MAX_CUSTOM_QUESTIONS) {
      toast.error(
        "Question Limit Reached",
        `You can add a maximum of ${MAX_CUSTOM_QUESTIONS} custom screening questions per gig.`
      );
      return;
    }
    setEditingQuestionId(null);
    setDraftQuestion("");
    setDraftType("YES_NO");
    setDraftRequired(true);
    setDraftOptions(["", ""]);
    setDraftErrors({});
    setQuestionModalVisible(true);
  };

  const openEditQuestion = (q: ApplicationQuestion) => {
    setEditingQuestionId(q.id ?? null);
    setDraftQuestion(q.question);
    setDraftType(q.type);
    setDraftRequired(q.required);
    setDraftOptions(q.options && q.options.length > 0 ? [...q.options] : ["", ""]);
    setDraftErrors({});
    setQuestionModalVisible(true);
  };

  const deleteQuestion = (id?: string) => {
    if (!id) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addDraftOption = () => {
    setDraftOptions((prev) => [...prev, ""]);
  };

  const removeDraftOption = (index: number) => {
    if (draftOptions.length <= 2) {
      Alert.alert("Minimum Options", "Multiple choice questions require at least 2 options.");
      return;
    }
    setDraftOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDraftOption = (index: number, value: string) => {
    setDraftOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const saveDraftQuestion = () => {
    const errs: { question?: string; options?: string } = {};
    if (!draftQuestion.trim()) {
      errs.question = "Question text is required.";
    }

    let cleanedOptions: string[] | undefined = undefined;
    if (draftType === "MULTIPLE_CHOICE") {
      cleanedOptions = draftOptions.map((o) => o.trim()).filter(Boolean);
      if (cleanedOptions.length < 2) {
        errs.options = "Please provide at least 2 options.";
      }
    }

    if (Object.keys(errs).length > 0) {
      setDraftErrors(errs);
      return;
    }

    if (editingQuestionId) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestionId
            ? {
                ...q,
                question: draftQuestion.trim(),
                type: draftType,
                required: draftRequired,
                options: cleanedOptions,
              }
            : q
        )
      );
    } else {
      setQuestions((prev) => [
        ...prev,
        {
          id: genId(),
          question: draftQuestion.trim(),
          type: draftType,
          required: draftRequired,
          options: cleanedOptions,
        },
      ]);
    }

    setQuestionModalVisible(false);
  };

  const handleSave = async () => {
    if (!gigId) return;

    setSaving(true);
    try {
      const payload = {
        applicationMode,
        requirements,
        customQuestions: questions,
      };

      if (settingsExisted) {
        await applicationSettingsApi.updateApplicationSettings(gigId, payload);
      } else {
        await applicationSettingsApi.createApplicationSettings(gigId, payload);
      }

      toast.success(
        "Settings Saved",
        "Your gig application configuration has been updated successfully."
      );
      navigation.goBack();
    } catch (err) {
      toast.error(
        "Could not save settings",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading application settings..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <ErrorState
          title="Could not load settings"
          message={loadError}
          onRetry={() => {
            setLoading(true);
            applicationSettingsApi
              .getApplicationSettings(gigId)
              .then((settings) => {
                if (settings) {
                  setSettingsExisted(true);
                  setApplicationMode(settings.applicationMode);
                  setRequirements(settings.requirements);
                  setQuestions(settings.customQuestions.map((q) => ({ ...q, id: q.id ?? genId() })));
                }
                setLoadError(null);
              })
              .catch((err) => setLoadError(err.message))
              .finally(() => setLoading(false));
          }}
          onGoBack={() => navigation.goBack()}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Application Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        {gig ? (
          <Card style={styles.gigSummaryCard}>
            <Text style={styles.gigTitle}>{gig.title}</Text>
            <Text style={styles.gigMeta}>Configure requirements for candidates applying to this gig</Text>
          </Card>
        ) : null}

        {/* Section 1: Application Mode Preset */}
        <Card style={styles.card}>
          <SectionHeader
            title="Application Mode"
            subtitle="Choose a preset to balance applicant volume and screening depth"
          />

          {APPLICATION_MODE_OPTIONS.map((opt) => {
            const isSelected = applicationMode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleModeSelect(opt.value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[styles.modeCard, isSelected && styles.modeCardSelected]}
              >
                <View style={styles.modeRow}>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modeLabel, isSelected && styles.modeLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.modeDescription}>{opt.description}</Text>
                    <Text style={styles.modeSuited}>Best for: {opt.suitedFor}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Section 2: Requirement Fields Switches */}
        <Card style={styles.card}>
          <SectionHeader
            title="Form Requirements"
            subtitle="Toggle required fields for applicant submissions"
          />

          {REQUIREMENT_FIELDS.map((field) => (
            <View key={field.key} style={styles.requirementRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={styles.requirementLabel}>{field.label}</Text>
              </View>
              <Switch
                value={requirements[field.key]}
                onValueChange={(val) => handleRequirementToggle(field.key, val)}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={requirements[field.key] ? colors.primaryDark : colors.surface}
              />
            </View>
          ))}
        </Card>

        {/* Section 3: Custom Screening Questions */}
        <Card style={styles.card}>
          <SectionHeader
            title="Custom Screening Questions"
            subtitle={`Add up to ${MAX_CUSTOM_QUESTIONS} tailored questions`}
            count={questions.length}
          />

          {questions.length === 0 ? (
            <View style={styles.emptyQuestionsWrap}>
              <Feather name="help-circle" size={24} color={colors.textMuted} />
              <Text style={styles.emptyQuestionsText}>
                No screening questions added yet.
              </Text>
            </View>
          ) : (
            questions.map((q, index) => (
              <View key={q.id ?? index} style={styles.questionItem}>
                <View style={styles.questionTop}>
                  <View style={styles.questionBadge}>
                    <Text style={styles.questionBadgeText}>Q{index + 1}</Text>
                  </View>
                  <Text style={styles.questionText}>
                    {q.question} {q.required ? <Text style={{ color: colors.danger }}>*</Text> : ""}
                  </Text>
                </View>

                <Text style={styles.questionMeta}>
                  Type: {q.type.replace(/_/g, " ")} • {q.required ? "Required" : "Optional"}
                </Text>

                {q.type === "MULTIPLE_CHOICE" && q.options ? (
                  <Text style={styles.optionsPreview}>
                    Options: {q.options.join(", ")}
                  </Text>
                ) : null}

                <View style={styles.questionActions}>
                  <TouchableOpacity
                    onPress={() => openEditQuestion(q)}
                    style={styles.actionLink}
                  >
                    <Feather name="edit-2" size={13} color={colors.primaryDark} />
                    <Text style={styles.actionLinkText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteQuestion(q.id)}
                    style={styles.actionLink}
                  >
                    <Feather name="trash-2" size={13} color={colors.danger} />
                    <Text style={[styles.actionLinkText, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {questions.length < MAX_CUSTOM_QUESTIONS ? (
            <Button
              title="+ Add Screening Question"
              icon="plus"
              variant="secondary"
              onPress={openAddQuestion}
              style={{ marginTop: spacing.sm }}
            />
          ) : (
            <Text style={styles.limitHint}>Maximum question limit reached.</Text>
          )}
        </Card>

        {/* Save CTA */}
        <View style={styles.saveWrap}>
          <Button
            title="Save Application Settings"
            icon="check"
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            size="lg"
          />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Modal for Creating / Editing a Question */}
      <Modal
        visible={questionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuestionModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setQuestionModalVisible(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {editingQuestionId ? "Edit Question" : "Add Screening Question"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Question Text"
                required
                value={draftQuestion}
                onChangeText={(v) => {
                  setDraftQuestion(v);
                  if (draftErrors.question) setDraftErrors((e) => ({ ...e, question: undefined }));
                }}
                placeholder="e.g. Do you have previous experience in this role?"
                multiline
                rows={2}
                error={draftErrors.question}
              />

              <Text style={styles.fieldLabel}>Question Type</Text>
              <View style={styles.typeChipsRow}>
                {QUESTION_TYPE_OPTIONS.map((opt) => {
                  const isSelected = draftType === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setDraftType(opt.value)}
                      style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          isSelected && styles.typeChipTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {draftType === "MULTIPLE_CHOICE" ? (
                <View style={styles.optionsWrap}>
                  <Text style={styles.fieldLabel}>Multiple Choice Options</Text>
                  {draftOptions.map((opt, i) => (
                    <View key={i} style={styles.optionInputRow}>
                      <TextInput
                        style={styles.optionInput}
                        value={opt}
                        onChangeText={(v) => updateDraftOption(i, v)}
                        placeholder={`Option ${i + 1}`}
                        placeholderTextColor={colors.textPlaceholder}
                      />
                      {draftOptions.length > 2 ? (
                        <TouchableOpacity
                          onPress={() => removeDraftOption(i)}
                          style={styles.removeOptionBtn}
                        >
                          <Feather name="x" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}

                  {draftErrors.options ? (
                    <Text style={styles.optionsErrorText}>{draftErrors.options}</Text>
                  ) : null}

                  <TouchableOpacity onPress={addDraftOption} style={styles.addOptionBtn}>
                    <Feather name="plus" size={14} color={colors.primaryDark} />
                    <Text style={styles.addOptionText}>Add Another Option</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.requiredToggleRow}>
                <Text style={styles.fieldLabel}>Applicant must answer (Required)</Text>
                <Switch
                  value={draftRequired}
                  onValueChange={setDraftRequired}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={draftRequired ? colors.primaryDark : colors.surface}
                />
              </View>

              <View style={styles.modalActions}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setQuestionModalVisible(false)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Save Question" onPress={saveDraftQuestion} />
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  navTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  gigSummaryCard: {
    marginBottom: spacing.md,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  gigMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.md,
  },
  modeCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeCardSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight,
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  radioOuterSelected: {
    borderColor: colors.primaryDark,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
  },
  modeLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  modeLabelSelected: {
    color: colors.primaryDark,
  },
  modeDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },
  modeSuited: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  requirementLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "600",
  },
  emptyQuestionsWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptyQuestionsText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  questionItem: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  questionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs + 2,
    marginBottom: 4,
  },
  questionBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.md,
  },
  questionBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  questionText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  questionMeta: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  optionsPreview: {
    fontSize: typography.sizes.xxs,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  questionActions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs + 2,
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionLinkText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  limitHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  saveWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(21, 36, 41, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    maxHeight: "85%",
    ...shadows.floating,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  typeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  typeChipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  typeChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  typeChipTextSelected: {
    color: colors.textInverse,
    fontWeight: "700",
  },
  optionsWrap: {
    marginBottom: spacing.md,
  },
  optionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  optionInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  removeOptionBtn: {
    padding: 6,
  },
  optionsErrorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
    paddingVertical: 4,
  },
  addOptionText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  requiredToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  modalActions: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
});
