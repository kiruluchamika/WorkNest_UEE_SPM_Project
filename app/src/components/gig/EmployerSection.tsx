import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getUserReviewsPage } from "../../api/reputationApi";
import { colors } from "../../theme/colors";
import { formatDate } from "../../utils/formatters";
import type { Review, GigPost } from "../../types";

export function EmployerSection({ gig, full = false, onViewProfile }: { gig: GigPost; full?: boolean; onViewProfile?: () => void }) {
 const [reviews, setReviews] = useState<Review[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [retry, setRetry] = useState(0);
 useFocusEffect(useCallback(() => {
  let active = true; setLoading(true); setError(null);
  getUserReviewsPage(gig.businessId, page, full ? 20 : 3).then(data => {
   if (active) { setReviews(previous => page === 1 ? data.reviews : [...previous, ...data.reviews.filter(r => !previous.some(p => p.id === r.id))]); setTotal(data.total); }
  }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load reviews."); }).finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, [gig.businessId, page, full, retry]));
 const summary = gig.employerSummary;
 return <View style={styles.card}>
  <Text style={styles.heading}>{full ? gig.business?.name || "Employer profile" : "About the Employer"}</Text>
  {!full && <Text style={styles.name}>{gig.business?.name || "WorkNest business"}</Text>}
  {summary?.isVerified && <Text style={styles.link}>? Verified employer</Text>}
  {!!gig.business?.bio && <Text style={styles.body}>{gig.business.bio}</Text>}
  {!!gig.business?.location && <Text style={styles.body}>{gig.business.location}</Text>}
  <View style={styles.stats}><Text style={styles.stat}>? {summary?.averageRating?.toFixed(1) ?? "New"}<Text style={styles.body}> · {summary?.totalReviews ?? 0} reviews</Text></Text><Text style={styles.stat}>{summary?.completedGigs ?? "—"}<Text style={styles.body}> completed gigs</Text></Text></View>
  <Text style={styles.name}>{full ? "Worker reviews" : "Recent worker reviews"}</Text>
  {reviews.map(review => <View key={review.id} style={styles.review}><Text style={styles.name}>{review.reviewer?.name || "Worker"} <Text style={styles.link}>? {review.rating}/5</Text></Text><Text style={styles.small}>{formatDate(review.createdAt)}{review.gig ? ` · ${review.gig.title}` : ""}</Text>{!!review.comment && <Text style={styles.body}>{review.comment}</Text>}</View>)}
  {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Loading reviews" />}
  {error ? <><Text style={styles.body}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setRetry(v => v + 1)}><Text style={styles.link}>Retry reviews</Text></TouchableOpacity></> : !loading && !reviews.length && <Text style={styles.body}>No worker reviews yet.</Text>}
  {full && !loading && !error && reviews.length < total && <TouchableOpacity accessibilityRole="button" onPress={() => setPage(p => p + 1)}><Text style={styles.link}>Load more reviews</Text></TouchableOpacity>}
  {!full && <TouchableOpacity accessibilityRole="button" onPress={onViewProfile}><Text style={styles.link}>View employer profile & all reviews ?</Text></TouchableOpacity>}
 </View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, marginBottom: 16, gap: 12, borderWidth: 1, borderColor: colors.border }, heading: { color: colors.text, fontSize: 20, fontWeight: "800" }, name: { color: colors.text, fontSize: 14, fontWeight: "700" }, body: { color: colors.textMuted, fontSize: 13, lineHeight: 22, fontWeight: "400" }, stats: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 14, gap: 8 }, stat: { color: colors.primaryDark, fontWeight: "800", fontSize: 18 }, review: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 14, gap: 5 }, small: { color: colors.textMuted, fontSize: 11 }, link: { color: colors.primaryDark, fontWeight: "700", paddingVertical: 10 } });
