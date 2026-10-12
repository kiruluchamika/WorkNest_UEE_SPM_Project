import React, { useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Button } from "../common/Button";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { LeafletMap } from "./LeafletMap";
import { isInsideSriLanka, type LatLng } from "./leafletHtml";

interface LocationPickerFieldProps {
  value: LatLng | null;
  onChange: (value: LatLng | null) => void;
  /** The address typed in the Location field; offered as a one-tap search. */
  addressQuery?: string;
  error?: string;
}

// OpenStreetMap's free address search. Best-effort: tapping the map always works.
async function searchAddress(query: string): Promise<LatLng | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=lk&q=" +
    encodeURIComponent(query);
  const response = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!response.ok) return null;
  const results = (await response.json()) as { lat: string; lon: string }[];
  if (!results.length) return null;
  const point = { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) ? point : null;
}

/**
 * Optional "pin on map" form field. Shows a preview of the saved pin and
 * opens a full-screen map where the business taps (or drags) to place it.
 */
export const LocationPickerField: React.FC<LocationPickerFieldProps> = ({
  value,
  onChange,
  addressQuery,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LatLng | null>(value);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const query = addressQuery?.trim() ?? "";
  const draftValid = draft ? isInsideSriLanka(draft) : false;

  const openPicker = () => {
    setDraft(value);
    setNotice(null);
    setOpen(true);
  };

  const handlePick = (point: LatLng) => {
    setDraft(point);
    setNotice(isInsideSriLanka(point) ? null : "Please pick a spot inside Sri Lanka.");
  };

  const handleSearch = async () => {
    if (!query || searching) return;
    setSearching(true);
    setNotice(null);
    try {
      const found = await searchAddress(query);
      if (found && isInsideSriLanka(found)) setDraft(found);
      else setNotice("Couldn't find that address. Tap the map to place the pin.");
    } catch {
      setNotice("Address search is unavailable. Tap the map to place the pin.");
    } finally {
      setSearching(false);
    }
  };

  const confirm = () => {
    if (!draft || !draftValid) return;
    onChange(draft);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Map Pin (optional)</Text>

      {value ? (
        <View>
          <TouchableOpacity
            onPress={openPicker}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Change the pinned map location"
            style={styles.preview}
          >
            <LeafletMap picked={value} interactive={false} style={styles.previewMap} />
          </TouchableOpacity>
          <View style={styles.previewActions}>
            <TouchableOpacity onPress={openPicker} style={styles.linkButton} accessibilityRole="button">
              <Feather name="edit-2" size={13} color={colors.primaryDark} />
              <Text style={styles.linkText}>Change pin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onChange(null)}
              style={styles.linkButton}
              accessibilityRole="button"
              accessibilityLabel="Remove the pinned map location"
            >
              <Feather name="trash-2" size={13} color={colors.dangerText} />
              <Text style={[styles.linkText, { color: colors.dangerText }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={openPicker}
          style={[styles.empty, error ? styles.emptyError : null]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Pin the gig location on a map"
        >
          <View style={styles.emptyIcon}>
            <Feather name="map-pin" size={18} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>Pin location on map</Text>
            <Text style={styles.emptyText}>Helps workers see exactly where the gig is.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close map"
            >
              <Feather name="x" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Pin gig location</Text>
              <Text style={styles.modalHint}>Tap the map to drop a pin, then drag it to adjust.</Text>
            </View>
          </View>

          {query ? (
            <TouchableOpacity
              onPress={handleSearch}
              style={styles.searchChip}
              disabled={searching}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Find ${query} on the map`}
            >
              {searching ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Feather name="search" size={14} color={colors.primaryDark} />
              )}
              <Text style={styles.searchChipText} numberOfLines={1}>
                Find “{query}”
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.modalMap}>
            {/* Mounted only while open so the map always measures a visible container. */}
            {open ? <LeafletMap mode="pick" picked={draft} onPick={handlePick} style={{ flex: 1 }} /> : null}
          </View>

          <View style={styles.modalFooter}>
            <Text style={[styles.status, notice ? { color: colors.warningText } : null]}>
              {notice ??
                (draft
                  ? `Pinned at ${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}`
                  : "No pin placed yet.")}
            </Text>
            <Button title="Use this location" icon="check" onPress={confirm} disabled={!draftValid} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs + 2,
  },
  preview: {
    height: 150,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewMap: {
    flex: 1,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  linkText: {
    marginLeft: spacing.xs + 2,
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md - 2,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSubtle,
  },
  emptyError: {
    borderColor: colors.danger,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  emptyText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.dangerText,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + spacing.xs,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  modalHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  searchChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "92%",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  searchChipText: {
    flexShrink: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  modalMap: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalFooter: {
    padding: spacing.md,
  },
  status: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm + spacing.xs,
    textAlign: "center",
  },
});
