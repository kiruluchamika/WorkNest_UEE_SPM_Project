import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, ScrollView, Image, LayoutAnimation, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as gigPostApi from "../../api/gigPostApi";
import { GigCard } from "../../components/gig/GigCard";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { colors, shadows } from "../../theme/colors";
import type { GigPost } from "../../types";
import type { JobSeekerStackParamList } from "../../navigation/JobSeekerTabs";

function categoryIcon(name: string): keyof typeof Feather.glyphMap {
  if (/clean/i.test(name)) return "wind";
  if (/event/i.test(name)) return "calendar";
  if (/deliver/i.test(name)) return "truck";
  if (/office/i.test(name)) return "briefcase";
  return "grid";
}
export const BrowseGigsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<JobSeekerStackParamList>>();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [gigs, setGigs] = useState<GigPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [payment, setPayment] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    try { const data = await gigPostApi.listActiveGigPosts(); if (id === request.current) { setGigs(data); setError(null); } }
    catch (e) { if (id === request.current) setError(e instanceof Error ? e.message : "Could not load gigs."); }
    finally { if (id === request.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  useFocusEffect(useCallback(() => {
    setNow(new Date()); void refresh();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { clearInterval(timer); request.current++; };
  }, [refresh]));
  const categories = Array.from(new Map(gigs.filter(g => g.category).map(g => [g.categoryId, g.category!.name])));
  const needle = query.trim().toLowerCase();
  const filtered = gigs.filter(g => g.status === "ACTIVE" && (category === "all" || g.categoryId === category) && (payment === "all" || g.paymentType === payment) && (!needle || [g.title, g.location, g.business?.name, g.category?.name, ...g.requiredSkills].join(" ").toLowerCase().includes(needle)));
  const reset = () => { setQuery(""); setCategory("all"); setPayment("all"); };
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  return <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
    <FlatList data={filtered} keyExtractor={g => g.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refresh(); }} tintColor={colors.primary} />}
      renderItem={({ item }) => <GigCard gig={item} onPress={g => navigation.navigate("GigDetail", { gigId: g.id })} />}
      ListHeaderComponent={<View>
        <View style={styles.header}>
          <View style={styles.greeting}><Text style={styles.eyebrow}>{greeting}</Text><Text style={styles.name}>{user?.name.trim().split(/\s+/)[0] || "there"} <Text style={{ color: colors.primary }}>?</Text></Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Notifications, ${unreadCount} unread`} style={styles.icon} onPress={() => navigation.getParent()?.navigate("Notifications")}>
            <Feather name="bell" size={21} color={colors.text} />{unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open your profile" style={styles.avatar} onPress={() => navigation.getParent()?.navigate("Profile")}>
            {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.avatar} /> : <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "W"}</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.dateRow}><Text style={styles.muted}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}</Text><View style={styles.location}><Feather name="map-pin" size={12} color={colors.primaryDark} /><Text style={styles.locationText} numberOfLines={1}>{user?.location || "Sri Lanka"}</Text></View></View>
        <View style={styles.intro}><Text style={styles.title}>Find your next opportunity</Text><Text style={styles.muted}>Local gigs. Flexible work. Your next step.</Text></View>
        <View style={styles.search}><Feather name="search" size={20} color={colors.primary} /><TextInput accessibilityLabel="Search gigs by title, skill, or area" placeholder="Search gigs by title, skill, or area..." placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} style={styles.input} returnKeyType="search" />
          {!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clearIcon} onPress={() => setQuery("")}><Feather name="x" size={18} color={colors.textMuted} /></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Toggle payment filters" accessibilityState={{ expanded: filtersOpen }} style={[styles.filter, payment !== "all" && styles.selected]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFiltersOpen(!filtersOpen); }}><Feather name="sliders" size={19} color={payment === "all" ? colors.primaryDark : "white"} /></TouchableOpacity>
        </View>
        {filtersOpen && <View style={styles.filterPanel}><Text style={styles.sectionTitle}>Payment type</Text><View style={styles.wrap}>{["all", ...Array.from(new Set(gigs.map(g => g.paymentType)))].map(value => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: payment === value }} key={value} onPress={() => setPayment(value)} style={[styles.chip, payment === value && styles.selected]}><Text style={[styles.chipText, payment === value && styles.white]}>{value === "all" ? "Any payment" : value.replace(/_/g, " ").toLowerCase()}</Text></TouchableOpacity>)}</View><TouchableOpacity accessibilityRole="button" onPress={reset}><Text style={styles.link}>Reset all filters</Text></TouchableOpacity></View>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{[["all", "All"], ...categories].map(([id, name]) => <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{ selected: category === id }} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCategory(id); }} style={[styles.chip, category === id && styles.selected]}><Feather name={categoryIcon(name)} size={15} color={category === id ? "white" : colors.textMuted} /><Text style={[styles.chipText, category === id && styles.white]}>{name}</Text></TouchableOpacity>)}</ScrollView>
        <View style={styles.results}><Text style={styles.sectionTitle}>Browse gigs</Text><Text style={styles.muted}>{filtered.length} available</Text></View>
        {error && <View style={styles.filterPanel}><Text style={styles.muted}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={refresh}><Text style={styles.link}>Try again</Text></TouchableOpacity></View>}
      </View>}
      ListEmptyComponent={<View style={styles.empty}>{loading ? <><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Finding opportunities...</Text></> : <><Feather name="search" size={32} color={colors.primary} /><Text style={styles.sectionTitle}>No gigs found</Text><Text style={styles.muted}>Try another skill, area, or category.</Text><TouchableOpacity accessibilityRole="button" onPress={reset}><Text style={styles.link}>Clear filters</Text></TouchableOpacity></>}</View>} />
  </SafeAreaView>;
};
const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: colors.background }, list: { padding: 20, paddingBottom: 110, width: "100%", maxWidth: 760, alignSelf: "center" },
 header: { flexDirection: "row", alignItems: "center", gap: 12 }, greeting: { flex: 1 }, eyebrow: { color: colors.textMuted, fontSize: 14 }, name: { fontSize: 28, fontWeight: "800", color: colors.text }, icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primaryDark, fontSize: 20, fontWeight: "800" }, badge: { position: "absolute", top: -2, right: -3, borderRadius: 12, backgroundColor: colors.danger, paddingHorizontal: 5, minWidth: 18 }, badgeText: { color: "white", fontSize: 11, textAlign: "center" },
 dateRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 12 }, location: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, maxWidth: "100%" }, locationText: { color: colors.primaryDark, fontSize: 12, flexShrink: 1 }, muted: { color: colors.textMuted, fontSize: 13, lineHeight: 20 }, intro: { marginTop: 26, marginBottom: 18, gap: 5 }, title: { fontSize: 23, fontWeight: "800", color: colors.text }, search: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, paddingLeft: 14, paddingRight: 6, ...shadows.small }, input: { flex: 1, minWidth: 0, paddingVertical: 18, paddingHorizontal: 10, color: colors.text, fontSize: 13 }, clearIcon: { minWidth: 32, minHeight: 44, alignItems: "center", justifyContent: "center" }, filter: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, chips: { gap: 8, paddingVertical: 20 }, chip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, selected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }, chipText: { fontSize: 13, fontWeight: "600", color: colors.textMuted }, white: { color: "white" }, results: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text }, filterPanel: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, gap: 12, marginTop: 12, marginBottom: 12 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, link: { color: colors.primaryDark, fontWeight: "700", paddingVertical: 12 }, empty: { alignItems: "center", gap: 12, paddingVertical: 40 },
});
