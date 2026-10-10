import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../common/Card";
import { Input } from "../common/Input";
import { YesNoToggle } from "./YesNoToggle";
import { ChoiceGroup } from "./ChoiceGroup";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { ApplicationQuestion } from "../../types";

interface CustomQuestionFieldProps {
  question: ApplicationQuestion;
  index: number;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  error?: string;
}

export const CustomQuestionField: React.FC<CustomQuestionFieldProps> = ({
  question,
  index,
  value,
  onChange,
  error,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>Q{index + 1}</Text>
        </View>
        <Text style={styles.label}>
          {question.question}
          {question.required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
        </Text>
      </View>

      {question.type === "YES_NO" ? (
        <YesNoToggle
          value={typeof value === "boolean" ? value : null}
          onChange={onChange}
          error={error}
        />
      ) : question.type === "MULTIPLE_CHOICE" ? (
        <ChoiceGroup
          options={question.options ?? []}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
          error={error}
        />
      ) : (
        <View style={styles.textInputWrap}>
          <Input
            value={typeof value === "string" ? value : ""}
            onChangeText={onChange}
            placeholder="Type your answer here..."
            multiline
            rows={2}
            error={error}
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    gap: spacing.xs + 2,
  },
  numberBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.md,
    marginTop: 1,
  },
  numberText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  label: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  requiredAsterisk: {
    color: colors.danger,
    fontWeight: "700",
  },
  textInputWrap: {
    marginTop: spacing.xs,
  },
});
