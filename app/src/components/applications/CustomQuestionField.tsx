import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../common/Card";
import { Input } from "../common/Input";
import { YesNoToggle } from "./YesNoToggle";
import { ChoiceGroup } from "./ChoiceGroup";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
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
      <Text style={styles.label}>
        {index + 1}. {question.question}
        {question.required ? " *" : ""}
      </Text>

      {question.type === "YES_NO" ? (
        <YesNoToggle value={typeof value === "boolean" ? value : null} onChange={onChange} error={error} />
      ) : question.type === "MULTIPLE_CHOICE" ? (
        <ChoiceGroup
          options={question.options ?? []}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
          error={error}
        />
      ) : (
        <View>
          <Input
            value={typeof value === "string" ? value : ""}
            onChangeText={onChange}
            placeholder="Type your answer..."
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
  label: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
