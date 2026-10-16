import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "../common/Card";
import { SectionHeader } from "../common/SectionHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { LeafletMap } from "./LeafletMap";

interface GigLocationMapCardProps {
  latitude?: number | null;
  longitude?: number | null;
  /** The gig's written address, shown under the map. */
  locationText?: string;
  style?: ViewStyle;
}

/**
 * Small static map of where a gig takes place, with a shortcut to the
 * device's maps app for directions. Renders nothing for gigs posted without
 * a map pin, so it is safe to drop into any gig screen.
 */
export const GigLocationMapCard: React.FC<GigLocationMapCardProps> = ({
  latitude,
  longitude,
  locationText,
  style,
}) => {
  if (latitude == null || longitude == null) return null;

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <Card style={style}>
      <SectionHeader title="Location on Map" />
      <View style={styles.mapFrame}>
        <LeafletMap picked={{ latitude, longitude }} interactive={false} style={styles.map} />
      </View>
      <View style={styles.footer}>
        <View style={styles.address}>
          <Feather name="map-pin" size={14} color={colors.primaryDark} />
          <Text style={styles.addressText} numberOfLines={2}>
            {locationText || "Pinned location"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openInMaps}
          style={styles.directions}
          accessibilityRole="button"
          accessibilityLabel="Open this location in your maps app"
          activeOpacity={0.8}
        >
          <Feather name="navigation" size={13} color={colors.textInverse} />
          <Text style={styles.directionsText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  mapFrame: {
    height: 170,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm + spacing.xs,
  },
  address: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  addressText: {
    flex: 1,
    marginLeft: spacing.xs + 2,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  directions: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
  },
  directionsText: {
    marginLeft: spacing.xs + 2,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textInverse,
  },
});
