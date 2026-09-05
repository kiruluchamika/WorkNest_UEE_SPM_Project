import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, shadows } from "../../theme/colors";
import { formatCurrency, formatDate } from "../../utils/formatters";
import type { GigPost } from "../../types";

function postedAt(value: string) {
 const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
 if (minutes < 1) return "Posted just now";
 if (minutes < 60) return `Posted ${minutes} min ago`;
 if (minutes < 1440) return `Posted ${Math.floor(minutes / 60)} hrs ago`;
 return `Posted ${formatDate(value)}`;
}
export const GigCard: React.FC<{ gig: GigPost; onPress: (gig: GigPost) => void }> = ({ gig, onPress }) => {
 const summary = gig.employerSummary;
 const unit = gig.paymentType === "HOURLY" ? "hr" : gig.paymentType === "DAILY" ? "day" : "fixed";
 return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${gig.title}, ${formatCurrency(gig.paymentAmount)} per ${unit}. View details`} onPress={() => onPress(gig)} activeOpacity={0.85} style={styles.card}>
  <View style={styles.top}><View style={styles.category}><Text style={styles.categoryText}>{gig.category?.name || "General"}</Text></View><Text style={styles.small}>{postedAt(gig.createdAt)}</Text>{summary?.isVerified && <Feather accessibilityLabel="Verified employer" name="check-circle" color={colors.success} size={17} />}</View>
  <Text style={styles.title}>{gig.title}</Text><Text style={styles.business}>{gig.business?.name || "WorkNest business"}</Text>
  <View style={styles.row}><Feather name="map-pin" color={colors.textMuted} size={14} /><Text style={styles.location}>{gig.location}</Text><Text style={styles.rating}>? {summary?.averageRating != null ? `${summary.averageRating.toFixed(1)} (${summary.totalReviews})` : "New"}</Text></View>
  <Text style={styles.description} numberOfLines={2}>{gig.description}</Text>
  <View style={styles.tags}><View style={styles.tag}><Feather name="calendar" size={12} color={colors.primaryDark} /><Text style={styles.small}>{formatDate(gig.startDate)}{gig.endDate ? ` – ${formatDate(gig.endDate)}` : ""}</Text></View>{gig.startTime && <View style={styles.tag}><Feather name="clock" size={12} color={colors.primaryDark} /><Text style={styles.small}>{gig.startTime}{gig.endTime ? ` – ${gig.endTime}` : ""}</Text></View>}</View>
  <View style={styles.footer}><View style={styles.pay}><Text style={styles.amount}>{formatCurrency(gig.paymentAmount)}</Text><Text style={styles.small}> / {unit}</Text></View><View style={styles.cta}><Text style={styles.ctaText}>View Details</Text><Feather name="arrow-up-right" size={15} color="white" /></View></View>
 </TouchableOpacity>;
};
const styles = StyleSheet.create({
 card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 16, ...shadows.small }, top: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }, category: { backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }, categoryText: { color: colors.primaryDark, fontSize: 11, fontWeight: "700" }, small: { color: colors.textMuted, fontSize: 11, flexShrink: 1 }, title: { color: colors.text, fontSize: 19, fontWeight: "800", marginBottom: 5 }, business: { color: colors.textMuted, fontSize: 13, marginBottom: 10 }, row: { flexDirection: "row", alignItems: "center", gap: 5 }, location: { color: colors.textMuted, fontSize: 12, flex: 1 }, rating: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" }, description: { color: colors.textMuted, fontSize: 13, lineHeight: 21, marginVertical: 13 }, tags: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, tag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.background, padding: 7, borderRadius: 7, maxWidth: "100%" }, footer: { borderTopWidth: 1, borderColor: colors.border, marginTop: 16, paddingTop: 16, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }, pay: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }, amount: { color: colors.primaryDark, fontSize: 21, fontWeight: "800" }, cta: { backgroundColor: colors.primaryDark, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center" }, ctaText: { color: "white", fontSize: 12, fontWeight: "700" },
});
