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
    if (mode === applicationMode) return;
    setApplicationMode(mode);
    setRequirements(getDefaultRequirements(mode));
  };

  const toggleRequirement = (key: keyof ApplicationRequirements) => {
    setRequirements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openAddQuestion = () => {
    if (questions.length >= MAX_CUSTOM_QUESTIONS) return;
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
    setDraftOptions(q.options && q.options.length ? q.options : ["", ""]);
    setDraftErrors({});
    setQuestionModalVisible(true);
  };

  const removeQuestion = (id?: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateDraftOption = (index: number, value: string) => {
    setDraftOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addDraftOption = () => setDraftOptions((prev) => [...prev, ""]);

  const removeDraftOption = (index: number) => {
    setDraftOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const saveDraftQuestion = () => {
    const trimmedQuestion = draftQuestion.trim();
    const errors: { question?: string; options?: string } = {};
    if (!trimmedQuestion) errors.question = "Question text cannot be empty.";

    let cleanOptions: string[] = [];
    if (draftType === "MULTIPLE_CHOICE") {
      cleanOptions = draftOptions.map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) errors.options = "Add at least 2 options.";
    }

    if (Object.keys(errors).length > 0) {
      setDraftErrors(errors);
      return;
    }

    const newQuestion: ApplicationQuestion = {
      id: editingQuestionId ?? genId(),
      question: trimmedQuestion,
      type: draftType,
      required: draftRequired,
      ...(draftType === "MULTIPLE_CHOICE" ? { options: cleanOptions } : {}),
    };

    setQuestions((prev) => {
      if (editingQuestionId) {
        return prev.map((q) => (q.id === editingQuestionId ? newQuestion : q));
      }
      if (prev.length >= MAX_CUSTOM_QUESTIONS) return prev;
      return [...prev, newQuestion];
    });

    setQuestionModalVisible(false);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!gigId) {
      Alert.alert("Missing gig", "This gig could not be identified.");
      return;
    }
    if (questions.length > MAX_CUSTOM_QUESTIONS) {
      Alert.alert("Too many questions", `You can add up to ${MAX_CUSTOM_QUESTIONS} screening questions.`);
      return;
    }
    const invalidQuestion = questions.find(
      (q) =>
        !q.question.trim() ||
        (q.type === "MULTIPLE_CHOICE" && (!q.options || q.options.filter((o) => o.trim()).length < 2))
    );
    if (invalidQuestion) {
      Alert.alert(
        "Fix screening questions",
        "Each question needs text, and multiple-choice questions need at least 2 options."
      );
      return;
    }

    setSaving(true);
    const payload: applicationSettingsApi.ApplicationSettingsPayload = {
      applicationMode,
      requirements,
      customQuestions: questions,
    };
    try {
      if (settingsExisted) {
        await applicationSettingsApi.updateApplicationSettings(gigId, payload);
      } else {
        await applicationSettingsApi.createApplicationSettings(gigId, payload);
        setSettingsExisted(true);
      }
      Alert.alert("Saved", "Application settings have been saved.");
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.errorState}>
          <View style={styles.errorIcon}>
            <Feather name="lock" size={22} color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>Can&apos;t open this screen</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (!gig || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading application settings..." fullScreen />
      </SafeAreaView>
    );
  }

  const schedule = [formatDate(gig.startDate), gig.endDate ? `- ${formatDate(gig.endDate)}` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Settings</Text>
          <View style={{ width: 32 }} />
        </View>

        <Card style={styles.gigCard}>
          <Text style={styles.gigTitle}>{gig.title}</Text>
          <Text style={styles.gigMeta}>{gig.category?.name ?? "Uncategorized"}</Text>
          <Text style={styles.gigMeta}>{gig.location}</Text>
          <Text style={styles.gigMeta}>{schedule}</Text>
        </Card>

        <Text style={styles.sectionTitle}>Application Method</Text>
        {APPLICATION_MODE_OPTIONS.map((option) => {
          const selected = option.value === applicationMode;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.85}
              onPress={() => handleModeSelect(option.value)}
            >
              <Card style={StyleSheet.flatten([styles.modeCard, selected && styles.modeCardSelected])}>
                <View style={styles.modeRow}>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeLabel}>{option.label}</Text>
                    <Text style={styles.modeDescription}>{option.description}</Text>
                    <Text style={styles.modeSuited}>{option.suitedFor}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionTitle}>Required Information</Text>
        <Card style={styles.requirementsCard}>
          {REQUIREMENT_FIELDS.map((field, index) => (
            <View
              key={field.key}
              style={[styles.requirementRow, index === REQUIREMENT_FIELDS.length - 1 && { marginBottom: 0 }]}
            >
              <Text style={styles.requirementLabel}>{field.label}</Text>
              <Switch
                value={requirements[field.key]}
                onValueChange={() => toggleRequirement(field.key)}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={requirements[field.key] ? colors.primary : colors.surface}
              />
            </View>
          ))}
        </Card>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Screening Questions</Text>
          <Text style={styles.sectionCount}>
            {questions.length}/{MAX_CUSTOM_QUESTIONS}
          </Text>
        </View>

        {questions.length === 0 ? (
          <Card style={styles.emptyQuestionsCard}>
            <Text style={styles.emptyQuestionsText}>No screening questions yet.</Text>
          </Card>
        ) : (
          questions.map((q, index) => (
            <Card key={q.id ?? index} style={styles.questionCard}>
              <Text style={styles.questionIndex}>Question {index + 1}</Text>
              <Text style={styles.questionText}>{q.question}</Text>
              <Text style={styles.questionMeta}>
                Type: {QUESTION_TYPE_OPTIONS.find((t) => t.value === q.type)?.label ?? q.type}
              </Text>
              <Text style={styles.questionMeta}>Required: {q.required ? "Yes" : "No"}</Text>
              {q.type === "MULTIPLE_CHOICE" && q.options ? (
                <Text style={styles.questionMeta}>Options: {q.options.join(", ")}</Text>
              ) : null}
              <View style={styles.questionActions}>
                <TouchableOpacity onPress={() => openEditQuestion(q)} style={styles.questionActionButton}>
                  <Feather name="edit-2" size={13} color={colors.primaryDark} />
                  <Text style={styles.questionActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeQuestion(q.id)} style={styles.questionActionButton}>
                  <Feather name="trash-2" size={13} color={colors.danger} />
                  <Text style={[styles.questionActionText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        <Button
          title="+ Add Question"
          variant="outline"
          onPress={openAddQuestion}
          disabled={questions.length >= MAX_CUSTOM_QUESTIONS}
          style={{ marginBottom: spacing.xs }}
        />
        {questions.length >= MAX_CUSTOM_QUESTIONS ? (
          <Text style={styles.limitHint}>You&apos;ve reached the maximum of {MAX_CUSTOM_QUESTIONS} questions.</Text>
        ) : null}

        <View style={{ height: spacing.lg }} />

        <Button
          title="Save Application Settings"
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <Modal
        visible={questionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuestionModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setQuestionModalVisible(false)} />
          <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: spacing.lg }}>
            <Text style={styles.sheetTitle}>{editingQuestionId ? "Edit Question" : "Add Question"}</Text>

            <Input
              label="Question"
              value={draftQuestion}
              onChangeText={(v) => {
                setDraftQuestion(v);
                if (draftErrors.question) setDraftErrors((prev) => ({ ...prev, question: undefined }));
              }}
              placeholder="e.g. Are you available on weekends?"
              error={draftErrors.question}
              multiline
              rows={2}
            />

            <Text style={styles.label}>Question Type</Text>
            <View style={styles.typeChipsRow}>
              {QUESTION_TYPE_OPTIONS.map((option) => {
                const selected = option.value === draftType;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setDraftType(option.value)}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {draftType === "MULTIPLE_CHOICE" ? (
              <View style={styles.optionsSection}>
                <Text style={styles.label}>Options</Text>
                {draftOptions.map((opt, index) => (
                  <View key={index} style={styles.optionRow}>
                    <TextInput
                      style={styles.optionInput}
                      value={opt}
                      onChangeText={(v) => updateDraftOption(index, v)}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity
                      onPress={() => removeDraftOption(index)}
                      style={styles.optionRemove}
                      disabled={draftOptions.length <= 1}
                    >
                      <Feather
                        name="x"
                        size={16}
                        color={draftOptions.length <= 1 ? colors.border : colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                {draftErrors.options ? <Text style={styles.error}>{draftErrors.options}</Text> : null}
                <TouchableOpacity onPress={addDraftOption} style={styles.addOptionButton}>
                  <Feather name="plus" size={14} color={colors.primaryDark} />
                  <Text style={styles.addOptionText}>Add option</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.requiredRow}>
              <Text style={styles.label}>Required</Text>
              <Switch
                value={draftRequired}
                onValueChange={setDraftRequired}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={draftRequired ? colors.primary : colors.surface}
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
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.text,
  },
  gigCard: {
    marginBottom: spacing.lg,
  },
  gigTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  gigMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionCount: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontWeight: "600",
  },
  modeCard: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
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
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  modeLabel: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: 2,
  },
  modeSuited: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  requirementsCard: {
    marginBottom: spacing.lg,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  requirementLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: "600",
  },
  emptyQuestionsCard: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyQuestionsText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  questionCard: {
    marginBottom: spacing.md,
  },
  questionIndex: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  questionText: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  questionMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: 2,
  },
  questionActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  questionActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  questionActionText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  limitHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 42, 46, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "85%",
    ...shadows.medium,
    shadowColor: colors.shadow,
  },
  sheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  typeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
  },
  typeChipTextSelected: {
    color: colors.textInverse,
    fontWeight: "800",
  },
  optionsSection: {
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  optionInput: {
    flex: 1,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.sizes.base,
    color: colors.text,
    marginRight: spacing.sm,
  },
  optionRemove: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  addOptionText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  requiredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
  },
});
