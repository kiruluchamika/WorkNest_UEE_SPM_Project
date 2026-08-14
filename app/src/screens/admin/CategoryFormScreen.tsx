import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useCategories } from "../../context/CategoryContext";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { categorySchema } from "../../utils/validators";

export const CategoryFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryId } = (route.params as { categoryId?: string }) || {};
  const { categories, addCategory, editCategory } = useCategories();
  const editingCategory = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const isEditing = Boolean(editingCategory);

  const [name, setName] = useState(editingCategory?.name ?? "");
  const [description, setDescription] = useState(editingCategory?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setDescription(editingCategory.description ?? "");
    }
  }, [editingCategory]);

  const handleSubmit = async () => {
    setErrors({});
    const result = categorySchema.safeParse({ name, description: description || undefined });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && categoryId) {
        await editCategory(categoryId, result.data);
      } else {
        await addCategory(result.data);
      }
      navigation.goBack();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save category. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Feather name={isEditing ? "edit-2" : "folder-plus"} size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{isEditing ? "Edit category" : "Add category"}</Text>
              <Text style={styles.subtitle}>
                {isEditing
                  ? "Update this category's details."
                  : "Businesses will see this category when posting new gigs."}
              </Text>
            </View>
          </View>

          <Input
            label="Category name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Retail"
            error={errors.name}
          />
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            rows={3}
            placeholder="Briefly describe this category..."
            error={errors.description}
          />

          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          {submitting ? (
            <LoadingSpinner message={isEditing ? "Saving changes..." : "Creating category..."} />
          ) : (
            <Button title={isEditing ? "Save changes" : "Create category"} onPress={handleSubmit} size="lg" />
          )}
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
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
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
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
  },
});
