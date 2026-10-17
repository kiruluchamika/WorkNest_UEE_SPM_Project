import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Button } from "./Button";
import {
  toDateOnlyString,
  toTimeString,
  parseDateOnly,
  parseTimeOnly,
  formatDateOnly,
  formatTimeOnly,
} from "../../utils/datetime";

interface DateTimeFieldProps {
  label: string;
  mode: "date" | "time";
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  error?: string;
  minimumDate?: Date;
  clearable?: boolean;
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  mode,
  value,
  onChange,
  placeholder,
  error,
  minimumDate,
  clearable = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const currentDate = value ? (mode === "date" ? parseDateOnly(value) : parseTimeOnly(value)) : new Date();
  const displayText = value ? (mode === "date" ? formatDateOnly(value) : formatTimeOnly(value)) : undefined;
  const icon = mode === "date" ? "calendar" : "clock";

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.trigger, error ? { borderColor: colors.danger } : null]}>
          <Feather name={icon} size={14} color={colors.primaryDark} />
          {React.createElement("input", {
            type: mode,
            "aria-label": label,
            value: value ?? "",
            min: mode === "date" && minimumDate ? toDateOnlyString(minimumDate) : undefined,
            onChange: (event: { target: { value: string } }) => onChange(event.target.value || undefined),
            style: {
              flex: 1,
              marginLeft: spacing.sm,
              border: 0,
              outline: "none",
              background: "transparent",
              fontSize: typography.sizes.sm,
              color: colors.text,
            },
          })}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") {
      setShowPicker(false);
    }
    if (event.type === "dismissed") return;
    if (selected) {
      onChange(mode === "date" ? toDateOnlyString(selected) : toTimeString(selected));
    }
  };

  const picker = (
    <DateTimePicker
      value={currentDate}
      mode={mode}
      display={mode === "date" ? "inline" : "spinner"}
      onChange={handleChange}
      minimumDate={minimumDate}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.trigger, error ? { borderColor: colors.danger } : null]}
          activeOpacity={0.8}
          onPress={() => setShowPicker(true)}
        >
          <Feather name={icon} size={14} color={colors.primaryDark} />
          <Text style={[styles.triggerText, !displayText && styles.placeholder]} numberOfLines={1}>
            {displayText || placeholder || (mode === "date" ? "Select date" : "Select time")}
          </Text>
        </TouchableOpacity>
        {clearable && value ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChange(undefined)}
            accessibilityLabel={`Clear ${label}`}
          >
            <Feather name="x" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showPicker && Platform.OS === "ios" ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text style={styles.sheetTitle}>{label}</Text>
              {picker}
              <Button title="Done" onPress={() => setShowPicker(false)} style={{ marginTop: spacing.sm }} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : showPicker ? (
        picker
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  trigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  triggerText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 42, 46, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.medium,
    shadowColor: colors.shadow,
  },
  sheetTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
});
