import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

// Chart colours are assigned by position in a fixed order and never reused
// for a different entity, so a status keeps its colour whatever the filters.
// This order is checked for colour-blind separation between neighbours; three
// of the hues are light against white, which is why every segment also gets
// a labelled legend row with its count.
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];

const SINGLE_SERIES_COLOR = colors.primary;
const CHART_HEIGHT = 120;

export interface ChartItem {
  key: string;
  label: string;
  count: number;
}

function formatShare(count: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((count / total) * 100)}%`;
}

export const ChartEmpty: React.FC<{ message?: string }> = ({ message = "No data for these filters yet." }) => (
  <Text style={styles.empty}>{message}</Text>
);

/** Parts of a whole: one stacked bar with a legend that carries every label and count. */
export const StackedBar: React.FC<{ items: ChartItem[]; colorOrder: readonly string[] }> = ({ items, colorOrder }) => {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  // Looked up by key, not by position, so filtering the list never repaints what is left.
  const colorOf = (key: string) => SERIES_COLORS[Math.max(0, colorOrder.indexOf(key)) % SERIES_COLORS.length];

  if (total === 0) return <ChartEmpty />;

  return (
    <View>
      <View style={styles.stack} accessibilityRole="image" accessibilityLabel={items.map((i) => `${i.label} ${i.count}`).join(", ")}>
        {items.map((item) =>
          item.count > 0 ? (
            <View key={item.key} style={[styles.stackSegment, { flex: item.count, backgroundColor: colorOf(item.key) }]} />
          ) : null
        )}
      </View>
      <View style={styles.legend}>
        {items.map((item) => (
          <View key={item.key} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: colorOf(item.key) }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.legendValue}>{item.count}</Text>
            <Text style={styles.legendShare}>{formatShare(item.count, total)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/** A ranked list: one thin bar per row, longest first, value at the end of the row. */
export const BarList: React.FC<{ items: ChartItem[]; emptyMessage?: string }> = ({ items, emptyMessage }) => {
  const max = Math.max(0, ...items.map((item) => item.count));

  if (max === 0) return <ChartEmpty message={emptyMessage} />;

  return (
    <View>
      {items.map((item) => (
        <View key={item.key} style={styles.barRow}>
          <View style={styles.barRowHeader}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.barValue}>{item.count}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(item.count / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

/** Change over time: one column per period. Tap a column to read its exact value. */
export const ColumnChart: React.FC<{ points: { label: string; count: number }[]; unit: string }> = ({ points, unit }) => {
  const [selected, setSelected] = useState(points.length - 1);
  const max = Math.max(0, ...points.map((point) => point.count));

  // A new range changes the number of columns, so fall back to the latest one.
  useEffect(() => {
    setSelected(points.length - 1);
  }, [points.length]);

  if (max === 0) return <ChartEmpty />;

  const active = points[Math.min(selected, points.length - 1)];
  // Axis labels collide once there are many columns, so only the ends and the middle are named.
  const axisPoints =
    points.length <= 7 ? points : [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]];

  return (
    <View>
      <Text style={styles.readout}>
        <Text style={styles.readoutValue}>{active.count}</Text> {unit} · {active.label}
      </Text>
      <View style={styles.plot}>
        <View style={styles.gridline} />
        <Text style={styles.maxLabel}>{max}</Text>
        <View style={styles.columns}>
          {points.map((point, index) => {
            const isSelected = index === selected;
            return (
              <TouchableOpacity
                key={`${point.label}-${index}`}
                style={styles.columnSlot}
                activeOpacity={0.7}
                onPress={() => setSelected(index)}
                accessibilityRole="button"
                accessibilityLabel={`${point.label}: ${point.count} ${unit}`}
              >
                <View
                  style={[
                    styles.column,
                    { height: Math.max(point.count > 0 ? 3 : 0, (point.count / max) * CHART_HEIGHT) },
                    !isSelected && styles.columnDimmed,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={[styles.axisLabels, points.length > 7 && styles.axisLabelsSpread]}>
        {axisPoints.map((point, index) => (
          <Text
            key={`${point.label}-${index}`}
            style={[styles.axisLabel, points.length <= 7 && styles.axisLabelSlot]}
            numberOfLines={1}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  stack: {
    flexDirection: "row",
    height: 14,
    gap: 2,
  },
  stackSegment: {
    borderRadius: radius.xs,
    minWidth: 3,
  },
  legend: {
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  legendLabel: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  legendValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  legendShare: {
    width: 44,
    textAlign: "right",
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  barRow: {
    marginBottom: spacing.sm + 2,
  },
  barRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  barLabel: {
    flex: 1,
    marginRight: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  barValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  barTrack: {
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.neutralLight,
  },
  barFill: {
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: SINGLE_SERIES_COLOR,
  },
  readout: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  readoutValue: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.text,
  },
  plot: {
    height: CHART_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  gridline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  maxLabel: {
    position: "absolute",
    top: 2,
    right: 0,
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
  },
  columns: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  // The whole slot is the touch target, so a thin column is still easy to tap.
  columnSlot: {
    flex: 1,
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 2,
  },
  column: {
    width: "100%",
    maxWidth: 22,
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
    backgroundColor: SINGLE_SERIES_COLOR,
  },
  columnDimmed: {
    opacity: 0.45,
  },
  axisLabels: {
    flexDirection: "row",
    marginTop: 4,
  },
  axisLabelsSpread: {
    justifyContent: "space-between",
  },
  axisLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
  },
  axisLabelSlot: {
    flex: 1,
    textAlign: "center",
  },
});
